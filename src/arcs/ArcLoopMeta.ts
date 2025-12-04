/**
 * ArcLoopMeta - Cross-loop meta-state manager
 *
 * Manages the protagonist's accumulated understanding of side arcs
 * across multiple loops. This includes observation counts, discovered
 * knowledge flags, and meta-level progression.
 */

import { ArcRegistry } from './ArcRegistry';
import {
  ArcLoopMeta,
  ArcMetaLevel,
  ArcOutcomeType,
  ArcRuntimeState,
  CrossLoopArcState,
  MetaLevelThresholds,
  SideArcDefinition,
  DEFAULT_META_LEVEL_THRESHOLDS,
  createInitialArcLoopMeta,
  compareMetaLevels,
  nowISO,
} from './types';

/**
 * Configuration for meta level promotion
 */
export interface MetaPromotionConfig {
  /** Thresholds for observation-based promotion */
  thresholds: MetaLevelThresholds;
  /** Flag patterns that grant MECHANIC_KNOWN level */
  mechanicKnownPatterns: string[];
  /** Flag patterns that grant OPTIMAL_PLAN_FOUND level */
  optimalPlanPatterns: string[];
}

const DEFAULT_PROMOTION_CONFIG: MetaPromotionConfig = {
  thresholds: DEFAULT_META_LEVEL_THRESHOLDS,
  mechanicKnownPatterns: ['MECHANIC_', '_MECHANIC', '_KEY_'],
  optimalPlanPatterns: ['OPTIMAL_', '_OPTIMAL', '_SOLUTION_', '_PERFECT_'],
};

/**
 * Result of checking if an arc can be resolved
 */
export interface CanResolveResult {
  /** Whether the arc can be resolved */
  canResolve: boolean;
  /** Missing knowledge flags */
  missingFlags: string[];
  /** Estimated minimum loops still needed */
  minLoopsNeeded: number;
  /** Current meta level */
  currentLevel: ArcMetaLevel;
  /** Required meta level for resolution */
  requiredLevel: ArcMetaLevel;
  /** Reason if cannot resolve */
  reason?: string;
}

/**
 * Summary of meta-state progress across all arcs
 */
export interface MetaProgressSummary {
  /** Total arcs being tracked */
  totalArcs: number;
  /** Breakdown by meta level */
  byLevel: Record<ArcMetaLevel, number>;
  /** Arcs that can be resolved this loop */
  resolvableThisLoop: string[];
  /** Arcs needing more observation */
  needMoreObservation: string[];
  /** Total observations across all arcs */
  totalObservations: number;
  /** Total interventions across all arcs */
  totalInterventions: number;
}

/**
 * ArcLoopMetaManager - Manages cross-loop arc meta-states
 */
export class ArcLoopMetaManager {
  private registry: ArcRegistry;
  private config: MetaPromotionConfig;

  /**
   * Create a new ArcLoopMetaManager
   * @param registry The arc registry
   * @param config Optional promotion configuration
   */
  constructor(registry: ArcRegistry, config?: Partial<MetaPromotionConfig>) {
    this.registry = registry;
    this.config = { ...DEFAULT_PROMOTION_CONFIG, ...config };
  }

  /**
   * Initialize meta-states for all arcs
   * @param arcIds Optional specific arc IDs (default: all registered)
   * @returns Map of arc ID to initial meta-state
   */
  initializeAllMeta(arcIds?: string[]): Map<string, ArcLoopMeta> {
    const ids = arcIds ?? this.registry.getAllIds();
    const metas = new Map<string, ArcLoopMeta>();

    for (const arcId of ids) {
      if (this.registry.has(arcId)) {
        metas.set(arcId, createInitialArcLoopMeta(arcId));
      }
    }

    return metas;
  }

  /**
   * Initialize a complete cross-loop state
   * @param arcIds Optional specific arc IDs
   * @returns Initial cross-loop state
   */
  initializeCrossLoopState(arcIds?: string[]): CrossLoopArcState {
    return {
      metas: this.initializeAllMeta(arcIds),
      knowledgeFlags: new Set(),
      totalLoops: 0,
      updatedAt: nowISO(),
    };
  }

  /**
   * Update meta-state after a loop completes
   * @param previousMeta Previous meta-states
   * @param finalArcStates Final in-loop states
   * @param newKnowledgeFlags New knowledge flags discovered
   * @param loopId The loop ID
   * @returns Updated meta-states
   */
  updateMetaAfterLoop(
    previousMeta: Map<string, ArcLoopMeta>,
    finalArcStates: Map<string, ArcRuntimeState>,
    newKnowledgeFlags: Set<string>,
    loopId: string
  ): Map<string, ArcLoopMeta> {
    const updated = new Map<string, ArcLoopMeta>();

    for (const [arcId, meta] of previousMeta) {
      const finalState = finalArcStates.get(arcId);
      const arc = this.registry.get(arcId);

      const newMeta = this.updateSingleArcMeta(
        meta,
        finalState,
        newKnowledgeFlags,
        arc,
        loopId
      );
      updated.set(arcId, newMeta);
    }

    return updated;
  }

  /**
   * Update meta-state for a single arc
   * @param meta Previous meta-state
   * @param finalState Final in-loop state (optional)
   * @param knowledgeFlags All accumulated knowledge flags
   * @param arc Arc definition (optional)
   * @param loopId Loop ID
   * @returns Updated meta-state
   */
  updateSingleArcMeta(
    meta: ArcLoopMeta,
    finalState: ArcRuntimeState | undefined,
    knowledgeFlags: Set<string>,
    arc: SideArcDefinition | undefined,
    loopId: string
  ): ArcLoopMeta {
    const newMeta: ArcLoopMeta = { ...meta };

    // Check if arc was engaged this loop (not in initial state or UNSEEN)
    const wasEngaged =
      finalState &&
      arc &&
      finalState.currentStateId !== arc.initialStateId &&
      finalState.actionsThisLoop.length > 0;

    if (wasEngaged) {
      newMeta.observations++;
      newMeta.lastEngagedLoop = loopId;

      if (!newMeta.firstEngagedLoop) {
        newMeta.firstEngagedLoop = loopId;
      }

      // Count as intervention if actions were taken
      if (finalState.actionsThisLoop.length > 0) {
        newMeta.interventions++;
      }

      // Track outcome if terminal
      if (finalState.isTerminal && finalState.outcomeType) {
        newMeta.bestOutcomeAchieved = this.betterOutcome(
          newMeta.bestOutcomeAchieved,
          finalState.outcomeType
        );
      }
    }

    // Update discovered flags
    if (arc) {
      const relevantFlags = this.getRelevantFlags(arc, knowledgeFlags);
      for (const flag of relevantFlags) {
        if (!newMeta.discoveredFlags.includes(flag)) {
          newMeta.discoveredFlags.push(flag);
        }
      }
    }

    // Compute new meta level
    newMeta.level = this.computeMetaLevel(newMeta, arc, knowledgeFlags);

    return newMeta;
  }

  /**
   * Compare two outcomes and return the "better" one
   * @param current Current best outcome
   * @param candidate Candidate outcome
   * @returns The better outcome
   */
  private betterOutcome(
    current: ArcOutcomeType | undefined,
    candidate: ArcOutcomeType
  ): ArcOutcomeType {
    const ranking: Record<ArcOutcomeType, number> = {
      GOOD: 4,
      NEUTRAL: 3,
      IN_PROGRESS: 2,
      BAD: 1,
      LOCKED_OUT: 0,
    };

    if (!current) return candidate;
    return ranking[candidate] > ranking[current] ? candidate : current;
  }

  /**
   * Get knowledge flags relevant to an arc
   * @param arc The arc definition
   * @param allFlags All knowledge flags
   * @returns Set of relevant flags
   */
  private getRelevantFlags(
    arc: SideArcDefinition,
    allFlags: Set<string>
  ): Set<string> {
    const relevant = new Set<string>();

    for (const flag of allFlags) {
      // Check if flag is in arc's produced flags
      if (arc.knowledgeFlagsProduced.includes(flag)) {
        relevant.add(flag);
      }
      // Check if flag contains arc ID
      if (flag.includes(arc.meta.id)) {
        relevant.add(flag);
      }
      // Check if flag is required by any resolution mode
      for (const req of arc.resolutionProfile.modeRequirements) {
        if (req.requiredKnowledgeFlags.includes(flag)) {
          relevant.add(flag);
        }
      }
    }

    return relevant;
  }

  /**
   * Compute the meta level based on observations and flags
   * @param meta Current meta-state
   * @param arc Arc definition
   * @param knowledgeFlags All knowledge flags
   * @returns Computed meta level
   */
  computeMetaLevel(
    meta: ArcLoopMeta,
    arc: SideArcDefinition | undefined,
    knowledgeFlags: Set<string>
  ): ArcMetaLevel {
    const { thresholds, mechanicKnownPatterns, optimalPlanPatterns } = this.config;

    // Check for OPTIMAL_PLAN_FOUND (highest level)
    if (meta.observations >= thresholds.optimalPlanFound) {
      const hasOptimalFlag = this.hasPatternMatch(
        knowledgeFlags,
        optimalPlanPatterns,
        arc?.meta.id
      );
      if (hasOptimalFlag) {
        return 'OPTIMAL_PLAN_FOUND';
      }
    }

    // Check for MECHANIC_KNOWN
    if (meta.observations >= thresholds.mechanicKnown) {
      const hasMechanicFlag = this.hasPatternMatch(
        knowledgeFlags,
        mechanicKnownPatterns,
        arc?.meta.id
      );
      if (hasMechanicFlag) {
        return 'MECHANIC_KNOWN';
      }
    }

    // Observation-based levels
    if (meta.observations >= thresholds.patternObserved) {
      return 'PATTERN_OBSERVED';
    }

    if (meta.observations >= thresholds.seenOnce) {
      return 'SEEN_ONCE';
    }

    return 'UNTOUCHED';
  }

  /**
   * Check if any flag matches the given patterns
   * @param flags All flags to check
   * @param patterns Patterns to match
   * @param arcId Optional arc ID to include in pattern matching
   * @returns true if any flag matches
   */
  private hasPatternMatch(
    flags: Set<string>,
    patterns: string[],
    arcId?: string
  ): boolean {
    for (const flag of flags) {
      for (const pattern of patterns) {
        if (flag.includes(pattern)) {
          return true;
        }
        // Also check if flag + arcId matches
        if (arcId && flag.includes(arcId) && flag.includes(pattern.replace('_', ''))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if an arc can be resolved given current meta-state
   * @param arcId The arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Resolution check result
   */
  canResolve(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): CanResolveResult {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return {
        canResolve: false,
        missingFlags: [],
        minLoopsNeeded: 0,
        currentLevel: meta.level,
        requiredLevel: 'UNTOUCHED',
        reason: `Arc "${arcId}" not found in registry`,
      };
    }

    // Find the best available resolution mode
    const availableModes = arc.resolutionProfile.modeRequirements.filter((req) => {
      // Check meta level
      if (compareMetaLevels(meta.level, req.minArcMetaLevel) < 0) {
        return false;
      }
      return true;
    });

    if (availableModes.length === 0) {
      // No modes available, need more meta progression
      const lowestRequiredLevel = arc.resolutionProfile.modeRequirements
        .map((r) => r.minArcMetaLevel)
        .sort((a, b) => compareMetaLevels(a, b))[0];

      return {
        canResolve: false,
        missingFlags: [],
        minLoopsNeeded: this.estimateLoopsNeeded(meta, lowestRequiredLevel),
        currentLevel: meta.level,
        requiredLevel: lowestRequiredLevel,
        reason: `Meta level ${lowestRequiredLevel} required, currently at ${meta.level}`,
      };
    }

    // Check for the mode with fewest missing flags
    let bestMode = availableModes[0];
    let fewestMissing: string[] = [];

    for (const mode of availableModes) {
      const missing = mode.requiredKnowledgeFlags.filter(
        (f) => !knowledgeFlags.has(f)
      );
      if (fewestMissing.length === 0 || missing.length < fewestMissing.length) {
        fewestMissing = missing;
        bestMode = mode;
      }
    }

    if (fewestMissing.length === 0) {
      return {
        canResolve: true,
        missingFlags: [],
        minLoopsNeeded: 0,
        currentLevel: meta.level,
        requiredLevel: bestMode.minArcMetaLevel,
      };
    }

    // Estimate loops needed to get missing flags
    const minLoopsNeeded = this.estimateLoopsForFlags(arc, fewestMissing.length);

    return {
      canResolve: false,
      missingFlags: fewestMissing,
      minLoopsNeeded,
      currentLevel: meta.level,
      requiredLevel: bestMode.minArcMetaLevel,
      reason: `Missing knowledge flags: ${fewestMissing.join(', ')}`,
    };
  }

  /**
   * Estimate loops needed to reach a meta level
   * @param meta Current meta-state
   * @param targetLevel Target level
   * @returns Estimated loops
   */
  private estimateLoopsNeeded(meta: ArcLoopMeta, targetLevel: ArcMetaLevel): number {
    const { thresholds } = this.config;

    const levelThresholds: Record<ArcMetaLevel, number> = {
      UNTOUCHED: 0,
      SEEN_ONCE: thresholds.seenOnce,
      PATTERN_OBSERVED: thresholds.patternObserved,
      MECHANIC_KNOWN: thresholds.mechanicKnown,
      OPTIMAL_PLAN_FOUND: thresholds.optimalPlanFound,
    };

    const target = levelThresholds[targetLevel];
    return Math.max(0, target - meta.observations);
  }

  /**
   * Estimate loops needed to discover flags
   * @param arc Arc definition
   * @param flagCount Number of flags needed
   * @returns Estimated loops
   */
  private estimateLoopsForFlags(arc: SideArcDefinition, flagCount: number): number {
    // Rough estimate: each loop can discover ~1 flag
    // Looper-only arcs need more loops
    const multiplier = arc.meta.looperClass === 'LOOPER_ONLY' ? 2 : 1;
    return Math.ceil(flagCount * multiplier);
  }

  /**
   * Update cross-loop state after a loop
   * @param state Previous cross-loop state
   * @param finalArcStates Final in-loop states
   * @param newKnowledgeFlags New flags discovered this loop
   * @param loopId Loop ID
   * @returns Updated cross-loop state
   */
  updateCrossLoopState(
    state: CrossLoopArcState,
    finalArcStates: Map<string, ArcRuntimeState>,
    newKnowledgeFlags: string[],
    loopId: string
  ): CrossLoopArcState {
    // Merge new knowledge flags
    const allFlags = new Set(state.knowledgeFlags);
    for (const flag of newKnowledgeFlags) {
      allFlags.add(flag);
    }

    // Update metas
    const newMetas = this.updateMetaAfterLoop(
      state.metas,
      finalArcStates,
      allFlags,
      loopId
    );

    return {
      metas: newMetas,
      knowledgeFlags: allFlags,
      totalLoops: state.totalLoops + 1,
      updatedAt: nowISO(),
    };
  }

  /**
   * Get a summary of progress across all arcs
   * @param state Cross-loop state
   * @returns Progress summary
   */
  getProgressSummary(state: CrossLoopArcState): MetaProgressSummary {
    const byLevel: Record<ArcMetaLevel, number> = {
      UNTOUCHED: 0,
      SEEN_ONCE: 0,
      PATTERN_OBSERVED: 0,
      MECHANIC_KNOWN: 0,
      OPTIMAL_PLAN_FOUND: 0,
    };

    const resolvableThisLoop: string[] = [];
    const needMoreObservation: string[] = [];
    let totalObservations = 0;
    let totalInterventions = 0;

    for (const [arcId, meta] of state.metas) {
      byLevel[meta.level]++;
      totalObservations += meta.observations;
      totalInterventions += meta.interventions;

      const canResolve = this.canResolve(arcId, meta, state.knowledgeFlags);
      if (canResolve.canResolve) {
        resolvableThisLoop.push(arcId);
      } else if (canResolve.minLoopsNeeded > 0) {
        needMoreObservation.push(arcId);
      }
    }

    return {
      totalArcs: state.metas.size,
      byLevel,
      resolvableThisLoop,
      needMoreObservation,
      totalObservations,
      totalInterventions,
    };
  }

  /**
   * Get meta-state for a specific arc
   * @param state Cross-loop state
   * @param arcId Arc ID
   * @returns Meta-state or undefined
   */
  getArcMeta(state: CrossLoopArcState, arcId: string): ArcLoopMeta | undefined {
    return state.metas.get(arcId);
  }

  /**
   * Serialize cross-loop state to JSON
   * @param state Cross-loop state
   * @returns JSON string
   */
  serialize(state: CrossLoopArcState): string {
    const serializable = {
      metas: Object.fromEntries(state.metas),
      knowledgeFlags: Array.from(state.knowledgeFlags),
      totalLoops: state.totalLoops,
      updatedAt: state.updatedAt,
    };
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Deserialize cross-loop state from JSON
   * @param json JSON string
   * @returns Cross-loop state
   */
  deserialize(json: string): CrossLoopArcState {
    const data = JSON.parse(json);
    return {
      metas: new Map(Object.entries(data.metas)),
      knowledgeFlags: new Set(data.knowledgeFlags),
      totalLoops: data.totalLoops,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Reset meta-state for a specific arc (for testing/debugging)
   * @param state Cross-loop state
   * @param arcId Arc ID to reset
   * @returns Updated state
   */
  resetArcMeta(state: CrossLoopArcState, arcId: string): CrossLoopArcState {
    const newMetas = new Map(state.metas);
    newMetas.set(arcId, createInitialArcLoopMeta(arcId));
    return {
      ...state,
      metas: newMetas,
      updatedAt: nowISO(),
    };
  }

  /**
   * Force meta level for an arc (for testing/debugging)
   * @param state Cross-loop state
   * @param arcId Arc ID
   * @param level Target level
   * @returns Updated state
   */
  forceMetaLevel(
    state: CrossLoopArcState,
    arcId: string,
    level: ArcMetaLevel
  ): CrossLoopArcState {
    const meta = state.metas.get(arcId);
    if (!meta) return state;

    const newMetas = new Map(state.metas);
    newMetas.set(arcId, { ...meta, level });
    return {
      ...state,
      metas: newMetas,
      updatedAt: nowISO(),
    };
  }
}
