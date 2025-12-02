/**
 * ResolutionModes - Resolution mode management and trivialization tracking
 *
 * This module handles how arcs can be resolved once the protagonist has
 * gained sufficient knowledge. As meta-levels increase, cheaper resolution
 * modes become available (trivialization).
 */

import { ArcRegistry } from './ArcRegistry';
import {
  SideArcDefinition,
  ArcLoopMeta,
  ResolutionMode,
  ResolutionRequirements,
  ArcResolutionCost,
  TrivializationProgress,
  ArcMetaLevel,
  meetsMetaLevel,
  compareMetaLevels,
} from './types';

/**
 * Cost weights for different factors
 */
export interface CostWeights {
  /** Weight for time slots used */
  timeSlotWeight: number;
  /** Weight for risk level */
  riskWeight: number;
  /** Weight for location changes */
  locationWeight: number;
  /** Weight for knowledge complexity */
  knowledgeWeight: number;
}

const DEFAULT_COST_WEIGHTS: CostWeights = {
  timeSlotWeight: 10,
  riskWeight: 1,
  locationWeight: 5,
  knowledgeWeight: 2,
};

/**
 * Mode characteristics for cost calculation
 */
const MODE_BASE_COSTS: Record<ResolutionMode, number> = {
  NOT_RESOLVED: 0,
  ONSITE_HEAVY: 100,
  ONSITE_LIGHT: 50,
  REMOTE_SIMPLE: 10,
  REMOTE_COMPLEX: 30,
  UNSTABLE: 40,
};

/**
 * ResolutionModeManager - Manages resolution modes and trivialization
 */
export class ResolutionModeManager {
  private registry: ArcRegistry;
  private costWeights: CostWeights;

  /**
   * Create a new ResolutionModeManager
   * @param registry Arc registry
   * @param costWeights Optional custom cost weights
   */
  constructor(registry: ArcRegistry, costWeights?: Partial<CostWeights>) {
    this.registry = registry;
    this.costWeights = { ...DEFAULT_COST_WEIGHTS, ...costWeights };
  }

  /**
   * Get all modes that are unlocked given current state
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Array of unlocked resolution modes
   */
  getAvailableModes(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): ResolutionMode[] {
    const arc = this.registry.get(arcId);
    if (!arc) return [];

    const available: ResolutionMode[] = [];

    for (const req of arc.resolutionProfile.modeRequirements) {
      const unlockResult = this.isModeUnlocked(arcId, req.mode, meta, knowledgeFlags);
      if (unlockResult.unlocked) {
        available.push(req.mode);
      }
    }

    // Sort by cost (cheapest first)
    return available.sort(
      (a, b) => MODE_BASE_COSTS[a] - MODE_BASE_COSTS[b]
    );
  }

  /**
   * Get requirements for a specific mode
   * @param arcId Arc ID
   * @param mode Resolution mode
   * @returns Resolution requirements or undefined
   */
  getModeRequirements(
    arcId: string,
    mode: ResolutionMode
  ): ResolutionRequirements | undefined {
    const arc = this.registry.get(arcId);
    if (!arc) return undefined;

    return arc.resolutionProfile.modeRequirements.find((r) => r.mode === mode);
  }

  /**
   * Check if a mode is unlocked
   * @param arcId Arc ID
   * @param mode Resolution mode
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Unlock result with reason
   */
  isModeUnlocked(
    arcId: string,
    mode: ResolutionMode,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): { unlocked: boolean; reason: string } {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return { unlocked: false, reason: 'Arc not found' };
    }

    const requirements = this.getModeRequirements(arcId, mode);
    if (!requirements) {
      return { unlocked: false, reason: 'Mode not available for this arc' };
    }

    // Check meta level requirement
    if (!meetsMetaLevel(meta.level, requirements.minArcMetaLevel)) {
      return {
        unlocked: false,
        reason: `Requires meta level ${requirements.minArcMetaLevel}, currently at ${meta.level}`,
      };
    }

    // Check knowledge flags
    const missingFlags = requirements.requiredKnowledgeFlags.filter(
      (flag) => !knowledgeFlags.has(flag)
    );
    if (missingFlags.length > 0) {
      return {
        unlocked: false,
        reason: `Missing knowledge flags: ${missingFlags.join(', ')}`,
      };
    }

    return { unlocked: true, reason: 'All requirements met' };
  }

  /**
   * Compute resolution cost for a mode
   * @param arcId Arc ID
   * @param mode Resolution mode
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Resolution cost or undefined if mode not available
   */
  computeModeCost(
    arcId: string,
    mode: ResolutionMode,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): ArcResolutionCost | undefined {
    const arc = this.registry.get(arcId);
    if (!arc) return undefined;

    const requirements = this.getModeRequirements(arcId, mode);
    if (!requirements) return undefined;

    const unlockResult = this.isModeUnlocked(arcId, mode, meta, knowledgeFlags);
    if (!unlockResult.unlocked) return undefined;

    // Calculate cost score
    const baseCost = MODE_BASE_COSTS[mode];
    const timeCost = requirements.requiredTimeSlots.length * this.costWeights.timeSlotWeight;
    const riskCost = requirements.riskLevel * this.costWeights.riskWeight;
    const locationCost = requirements.requiredLocations.length * this.costWeights.locationWeight;
    const knowledgeCost =
      requirements.requiredKnowledgeFlags.length * this.costWeights.knowledgeWeight;

    const totalCost = baseCost + timeCost + riskCost + locationCost + knowledgeCost;

    return {
      arcId,
      mode,
      timeSlotsRequired: requirements.requiredTimeSlots,
      locationsRequired: requirements.requiredLocations,
      costScore: totalCost,
      riskScore: requirements.riskLevel,
      isOptimal: false, // Will be set when comparing with other modes
    };
  }

  /**
   * Compute costs for all available modes
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Array of resolution costs, sorted by cost
   */
  computeResolutionCosts(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): ArcResolutionCost[] {
    const availableModes = this.getAvailableModes(arcId, meta, knowledgeFlags);
    const costs: ArcResolutionCost[] = [];

    for (const mode of availableModes) {
      const cost = this.computeModeCost(arcId, mode, meta, knowledgeFlags);
      if (cost) {
        costs.push(cost);
      }
    }

    // Sort by cost and mark optimal
    costs.sort((a, b) => a.costScore - b.costScore);
    if (costs.length > 0) {
      costs[0].isOptimal = true;
    }

    return costs;
  }

  /**
   * Get the best (cheapest) available mode
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Best mode or undefined if none available
   */
  getBestMode(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): ResolutionMode | undefined {
    const costs = this.computeResolutionCosts(arcId, meta, knowledgeFlags);
    return costs[0]?.mode;
  }

  /**
   * Get trivialization progress for an arc
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Trivialization progress
   */
  getTrivializationProgress(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): TrivializationProgress {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return {
        arcId,
        currentBestMode: 'NOT_RESOLVED',
        currentCost: Infinity,
        optimalMode: 'NOT_RESOLVED',
        optimalCost: 0,
        progressPercent: 0,
      };
    }

    // Get current best mode
    const currentCosts = this.computeResolutionCosts(arcId, meta, knowledgeFlags);
    const currentBest = currentCosts[0];

    // Get theoretical optimal (cheapest mode that could ever be unlocked)
    const allModes = arc.resolutionProfile.modeRequirements;
    const cheapestMode = allModes.reduce((cheapest, current) => {
      const cheapestBaseCost = MODE_BASE_COSTS[cheapest.mode];
      const currentBaseCost = MODE_BASE_COSTS[current.mode];
      return currentBaseCost < cheapestBaseCost ? current : cheapest;
    });

    const optimalCost = this.calculateTheoreticalCost(cheapestMode);
    const currentCost = currentBest?.costScore ?? Infinity;

    // Calculate progress percentage
    // 0% = no modes unlocked (infinite cost)
    // 100% = at optimal mode
    let progressPercent = 0;
    if (currentCost !== Infinity) {
      if (currentCost <= optimalCost) {
        progressPercent = 100;
      } else {
        // Initial cost (most expensive mode)
        const initialCost = Math.max(...allModes.map((m) => MODE_BASE_COSTS[m.mode])) * 2;
        progressPercent = Math.round(
          ((initialCost - currentCost) / (initialCost - optimalCost)) * 100
        );
        progressPercent = Math.max(0, Math.min(100, progressPercent));
      }
    }

    // Find next unlock
    const nextUnlock = this.findNextUnlock(arc, meta, knowledgeFlags, currentCosts);

    return {
      arcId,
      currentBestMode: currentBest?.mode ?? 'NOT_RESOLVED',
      currentCost,
      optimalMode: cheapestMode.mode,
      optimalCost,
      progressPercent,
      nextUnlock,
    };
  }

  /**
   * Calculate theoretical cost for a mode at optimal conditions
   * @param requirements Mode requirements
   * @returns Theoretical cost
   */
  private calculateTheoreticalCost(requirements: ResolutionRequirements): number {
    const baseCost = MODE_BASE_COSTS[requirements.mode];
    const timeCost = requirements.requiredTimeSlots.length * this.costWeights.timeSlotWeight;
    const riskCost = requirements.riskLevel * this.costWeights.riskWeight;
    const locationCost = requirements.requiredLocations.length * this.costWeights.locationWeight;
    // Knowledge flags don't add cost once acquired
    return baseCost + timeCost + riskCost + locationCost;
  }

  /**
   * Find the next mode that could be unlocked
   * @param arc Arc definition
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @param currentCosts Currently available costs
   * @returns Next unlock info or undefined
   */
  private findNextUnlock(
    arc: SideArcDefinition,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>,
    currentCosts: ArcResolutionCost[]
  ): { mode: ResolutionMode; requirements: string[] } | undefined {
    const unlockedModes = new Set(currentCosts.map((c) => c.mode));

    // Find locked modes that are cheaper than current best
    const lockedModes = arc.resolutionProfile.modeRequirements.filter(
      (r) => !unlockedModes.has(r.mode)
    );

    if (lockedModes.length === 0) return undefined;

    // Sort by base cost (prefer cheaper modes)
    lockedModes.sort((a, b) => MODE_BASE_COSTS[a.mode] - MODE_BASE_COSTS[b.mode]);

    // Get requirements for the cheapest locked mode
    const nextMode = lockedModes[0];
    const requirements: string[] = [];

    // Check meta level
    if (!meetsMetaLevel(meta.level, nextMode.minArcMetaLevel)) {
      requirements.push(`Meta level: ${nextMode.minArcMetaLevel}`);
    }

    // Check knowledge flags
    const missingFlags = nextMode.requiredKnowledgeFlags.filter(
      (f) => !knowledgeFlags.has(f)
    );
    for (const flag of missingFlags) {
      requirements.push(`Knowledge: ${flag}`);
    }

    return {
      mode: nextMode.mode,
      requirements,
    };
  }

  /**
   * Get all arcs with their resolution costs
   * @param metas Map of arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Map of arc ID to resolution costs
   */
  getAllResolutionCosts(
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): Map<string, ArcResolutionCost[]> {
    const result = new Map<string, ArcResolutionCost[]>();

    for (const [arcId, meta] of metas) {
      const costs = this.computeResolutionCosts(arcId, meta, knowledgeFlags);
      result.set(arcId, costs);
    }

    return result;
  }

  /**
   * Get all arcs sorted by current best cost (cheapest first)
   * @param metas Map of arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Sorted array of arc costs
   */
  getArcsByCost(
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): Array<{ arcId: string; bestCost: ArcResolutionCost | undefined }> {
    const costs = this.getAllResolutionCosts(metas, knowledgeFlags);
    const result: Array<{ arcId: string; bestCost: ArcResolutionCost | undefined }> = [];

    for (const [arcId, arcCosts] of costs) {
      result.push({
        arcId,
        bestCost: arcCosts[0],
      });
    }

    // Sort by cost (undefined/unresolvable last)
    result.sort((a, b) => {
      if (!a.bestCost && !b.bestCost) return 0;
      if (!a.bestCost) return 1;
      if (!b.bestCost) return -1;
      return a.bestCost.costScore - b.bestCost.costScore;
    });

    return result;
  }

  /**
   * Check if an arc can be trivially resolved (very low cost)
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @param threshold Cost threshold for "trivial" (default: 20)
   * @returns true if arc can be trivially resolved
   */
  isTrivial(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>,
    threshold: number = 20
  ): boolean {
    const costs = this.computeResolutionCosts(arcId, meta, knowledgeFlags);
    return costs.length > 0 && costs[0].costScore <= threshold;
  }

  /**
   * Get summary statistics for trivialization across all arcs
   * @param metas Map of arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Summary statistics
   */
  getTrivializationSummary(
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): {
    totalArcs: number;
    trivialArcs: number;
    averageProgress: number;
    fullyOptimizedArcs: number;
    unresolvedArcs: number;
  } {
    let trivialArcs = 0;
    let totalProgress = 0;
    let fullyOptimizedArcs = 0;
    let unresolvedArcs = 0;

    for (const [arcId, meta] of metas) {
      const progress = this.getTrivializationProgress(arcId, meta, knowledgeFlags);

      if (progress.progressPercent === 100) {
        fullyOptimizedArcs++;
      }

      if (progress.currentBestMode === 'NOT_RESOLVED') {
        unresolvedArcs++;
      } else if (this.isTrivial(arcId, meta, knowledgeFlags)) {
        trivialArcs++;
      }

      totalProgress += progress.progressPercent;
    }

    const totalArcs = metas.size;
    const averageProgress = totalArcs > 0 ? totalProgress / totalArcs : 0;

    return {
      totalArcs,
      trivialArcs,
      averageProgress: Math.round(averageProgress),
      fullyOptimizedArcs,
      unresolvedArcs,
    };
  }

  /**
   * Calculate total time required to resolve multiple arcs
   * @param arcModes Map of arc ID to chosen resolution mode
   * @param metas Map of arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Total time slots required and total cost
   */
  calculateTotalResolutionTime(
    arcModes: Map<string, ResolutionMode>,
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): { totalSlots: number; totalCost: number; perArc: Map<string, number> } {
    let totalSlots = 0;
    let totalCost = 0;
    const perArc = new Map<string, number>();

    for (const [arcId, mode] of arcModes) {
      const meta = metas.get(arcId);
      if (!meta) continue;

      const cost = this.computeModeCost(arcId, mode, meta, knowledgeFlags);
      if (cost) {
        totalSlots += cost.timeSlotsRequired.length;
        totalCost += cost.costScore;
        perArc.set(arcId, cost.timeSlotsRequired.length);
      }
    }

    return { totalSlots, totalCost, perArc };
  }
}
