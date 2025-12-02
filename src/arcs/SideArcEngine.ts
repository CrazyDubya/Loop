/**
 * SideArcEngine - Main facade for the side arc system
 *
 * This is the primary entry point for working with B/C/D story arcs.
 * It coordinates the registry, FSM, meta-state manager, constraint checker,
 * resolution mode manager, and scheduler into a unified API.
 */

import { ArcRegistry } from './ArcRegistry';
import { ArcFSM, TransitionEvalOptions } from './ArcFSM';
import { ArcLoopMetaManager, CanResolveResult, MetaProgressSummary } from './ArcLoopMeta';
import { LooperConstraintChecker, GraphContext } from './LooperConstraints';
import { ResolutionModeManager, CostWeights } from './ResolutionModes';
import { ArcScheduler, SchedulerConfig } from './ArcScheduler';
import {
  SideArcDefinition,
  SideArcConfig,
  ArcLoopMeta,
  ArcRuntimeState,
  CrossLoopArcState,
  LoopArcState,
  LoopArcOutcome,
  ArcStepContext,
  ArcStepResult,
  ArcConflictRule,
  LooperArcStatus,
  ArcResolutionCost,
  TrivializationProgress,
  FeasibilityResult,
  OptimalArcSetResult,
  ArcSchedule,
  ArcValidationResult,
  LooperOnlyValidation,
  ResolutionMode,
  DEFAULT_SIDE_ARC_CONFIG,
  nowISO,
  createInitialArcLoopMeta,
} from './types';

/**
 * Action input for loop stepping
 */
export interface LoopAction {
  /** Action identifier */
  action: string;
  /** Current time slot (HH:MM) */
  timeSlot: string;
  /** Current location */
  location: string;
  /** Confidence level (0-1) */
  confidence?: number;
}

/**
 * Complete status report for an arc
 */
export interface ArcStatusReport {
  /** Arc ID */
  arcId: string;
  /** Current in-loop state */
  currentState: string;
  /** Cross-loop meta level */
  metaLevel: string;
  /** Observations made */
  observations: number;
  /** Can resolve this loop */
  canResolve: boolean;
  /** Best resolution mode */
  bestMode: ResolutionMode | undefined;
  /** Resolution cost */
  costScore: number | undefined;
  /** Trivialization progress */
  trivializationPercent: number;
  /** Is looper-only */
  isLooperOnly: boolean;
  /** Looper status (if applicable) */
  looperStatus?: LooperArcStatus;
}

/**
 * Progress report across all arcs
 */
export interface ArcProgressReport {
  /** Total arcs registered */
  totalArcs: number;
  /** Total loops completed */
  totalLoops: number;
  /** Meta level distribution */
  metaLevelDistribution: Record<string, number>;
  /** Arcs resolvable this loop */
  resolvableArcs: string[];
  /** Trivial arcs (very low cost) */
  trivialArcs: string[];
  /** Looper-only status */
  looperOnlyStatus: LooperArcStatus[];
  /** Average trivialization progress */
  averageTrivializationPercent: number;
}

/**
 * SideArcEngine - Unified API for side arc management
 */
export class SideArcEngine {
  private registry: ArcRegistry;
  private fsm: ArcFSM;
  private metaManager: ArcLoopMetaManager;
  private constraintChecker: LooperConstraintChecker;
  private resolutionManager: ResolutionModeManager;
  private scheduler: ArcScheduler;
  private config: SideArcConfig;

  // Current state
  private currentLoopState: LoopArcState | null = null;
  private crossLoopState: CrossLoopArcState;

  /**
   * Create a new SideArcEngine
   * @param config Optional configuration
   * @param graphContext Optional graph context for constraint checking
   * @param costWeights Optional cost weights for resolution
   * @param schedulerConfig Optional scheduler configuration
   */
  constructor(
    config?: Partial<SideArcConfig>,
    graphContext?: GraphContext,
    costWeights?: Partial<CostWeights>,
    schedulerConfig?: Partial<SchedulerConfig>
  ) {
    this.config = { ...DEFAULT_SIDE_ARC_CONFIG, ...config };

    // Initialize components
    this.registry = new ArcRegistry();
    this.fsm = new ArcFSM(this.registry);
    this.metaManager = new ArcLoopMetaManager(this.registry, {
      thresholds: this.config.metaLevelThresholds,
    });
    this.constraintChecker = new LooperConstraintChecker(this.registry, graphContext);
    this.resolutionManager = new ResolutionModeManager(this.registry, costWeights);
    this.scheduler = new ArcScheduler(
      this.registry,
      this.resolutionManager,
      [],
      schedulerConfig
    );

    // Initialize cross-loop state
    this.crossLoopState = this.metaManager.initializeCrossLoopState();
  }

  // ==========================================
  // Registration
  // ==========================================

  /**
   * Register a side arc definition
   * @param definition Arc definition
   */
  registerArc(definition: SideArcDefinition): void {
    this.registry.register(definition, this.config.validateOnRegister);
    // Add to cross-loop state
    this.crossLoopState.metas.set(
      definition.meta.id,
      createInitialArcLoopMeta(definition.meta.id)
    );
  }

  /**
   * Register multiple arc definitions
   * @param definitions Array of arc definitions
   */
  registerArcs(definitions: SideArcDefinition[]): void {
    for (const def of definitions) {
      this.registerArc(def);
    }
  }

  /**
   * Unregister an arc
   * @param arcId Arc ID to remove
   * @returns true if removed
   */
  unregisterArc(arcId: string): boolean {
    const removed = this.registry.unregister(arcId);
    if (removed) {
      this.crossLoopState.metas.delete(arcId);
    }
    return removed;
  }

  /**
   * Add a conflict rule
   * @param rule Conflict rule to add
   */
  addConflictRule(rule: ArcConflictRule): void {
    this.scheduler.addConflictRule(rule);
  }

  // ==========================================
  // Loop Lifecycle
  // ==========================================

  /**
   * Initialize a new loop
   * @param loopId Loop identifier
   * @param arcIds Optional specific arcs to initialize (default: all)
   * @returns Initial loop arc state
   */
  initializeLoop(loopId: string, arcIds?: string[]): LoopArcState {
    const ids = arcIds ?? this.registry.getAllIds();
    const arcStates = this.fsm.initializeArcStates(ids);

    this.currentLoopState = {
      loopId,
      arcStates,
      currentTimeSlot: '00:00',
      currentLocation: '',
      allActionsThisLoop: [],
    };

    return this.currentLoopState;
  }

  /**
   * Step all arcs based on an action
   * @param action The action to process
   * @param options Optional transition evaluation options
   * @returns Map of step results
   */
  stepArcs(
    action: LoopAction,
    options?: Partial<TransitionEvalOptions>
  ): Map<string, ArcStepResult> {
    if (!this.currentLoopState) {
      throw new Error('No active loop. Call initializeLoop first.');
    }

    // Build step context
    const context: ArcStepContext = {
      action: action.action,
      timeSlot: action.timeSlot,
      location: action.location,
      knowledgeFlags: this.crossLoopState.knowledgeFlags,
      arcMetaLevels: new Map(
        Array.from(this.crossLoopState.metas.entries()).map(([id, m]) => [id, m.level])
      ),
      otherArcStates: new Map(
        Array.from(this.currentLoopState.arcStates.entries()).map(([id, s]) => [
          id,
          s.currentStateId,
        ])
      ),
      confidence: action.confidence,
    };

    // Execute step
    const { states, results } = this.fsm.executeStep(
      this.currentLoopState.arcStates,
      context,
      options
    );

    // Update loop state
    this.currentLoopState.arcStates = states;
    this.currentLoopState.currentTimeSlot = action.timeSlot;
    this.currentLoopState.currentLocation = action.location;
    this.currentLoopState.allActionsThisLoop.push(action.action);

    // Update engaged slots for changed arcs
    for (const [arcId, result] of results) {
      if (result.changed) {
        const arcState = this.currentLoopState.arcStates.get(arcId);
        if (arcState && !arcState.engagedSlots.includes(action.timeSlot)) {
          arcState.engagedSlots.push(action.timeSlot);
        }
      }
    }

    return results;
  }

  /**
   * Finalize the current loop and update cross-loop state
   * @returns Loop arc outcome
   */
  finalizeLoop(): LoopArcOutcome {
    if (!this.currentLoopState) {
      throw new Error('No active loop. Call initializeLoop first.');
    }

    // Collect final states and outcomes
    const finalArcStates = new Map<string, string>();
    const arcOutcomes = new Map<string, import('./types').ArcOutcomeType>();
    const newKnowledgeFlags: string[] = [];
    const transitionsTaken: LoopArcOutcome['transitionsTaken'] = [];

    for (const [arcId, state] of this.currentLoopState.arcStates) {
      finalArcStates.set(arcId, state.currentStateId);
      arcOutcomes.set(arcId, state.outcomeType ?? 'IN_PROGRESS');

      // Collect knowledge flags from arc
      const arc = this.registry.get(arcId);
      if (arc && state.isTerminal) {
        // Check if any knowledge flags should be granted
        for (const flag of arc.knowledgeFlagsProduced) {
          if (!this.crossLoopState.knowledgeFlags.has(flag)) {
            newKnowledgeFlags.push(flag);
          }
        }
      }

      // Record transitions
      for (const transitionId of state.actionsThisLoop) {
        if (transitionId) {
          const transition = arc?.transitions.find((t) => t.id === transitionId);
          if (transition) {
            transitionsTaken.push({
              arcId,
              transitionId,
              from: transition.from,
              to: transition.to,
              timeSlot: state.engagedSlots[state.engagedSlots.length - 1] ?? '',
            });
          }
        }
      }
    }

    const outcome: LoopArcOutcome = {
      loopId: this.currentLoopState.loopId,
      finalArcStates,
      arcOutcomes,
      newKnowledgeFlags,
      transitionsTaken,
    };

    // Update cross-loop state
    this.crossLoopState = this.metaManager.updateCrossLoopState(
      this.crossLoopState,
      this.currentLoopState.arcStates,
      newKnowledgeFlags,
      this.currentLoopState.loopId
    );

    // Clear current loop state
    this.currentLoopState = null;

    return outcome;
  }

  // ==========================================
  // Queries
  // ==========================================

  /**
   * Get status report for a specific arc
   * @param arcId Arc ID
   * @returns Status report
   */
  getArcStatus(arcId: string): ArcStatusReport {
    const arc = this.registry.get(arcId);
    const meta = this.crossLoopState.metas.get(arcId) ?? createInitialArcLoopMeta(arcId);
    const currentState = this.currentLoopState?.arcStates.get(arcId);

    const canResolveResult = this.metaManager.canResolve(
      arcId,
      meta,
      this.crossLoopState.knowledgeFlags
    );

    const bestMode = this.resolutionManager.getBestMode(
      arcId,
      meta,
      this.crossLoopState.knowledgeFlags
    );

    const costs = this.resolutionManager.computeResolutionCosts(
      arcId,
      meta,
      this.crossLoopState.knowledgeFlags
    );

    const trivProgress = this.resolutionManager.getTrivializationProgress(
      arcId,
      meta,
      this.crossLoopState.knowledgeFlags
    );

    const isLooperOnly = arc?.meta.looperClass === 'LOOPER_ONLY';
    let looperStatus: LooperArcStatus | undefined;
    if (isLooperOnly) {
      looperStatus = this.constraintChecker.getLooperArcStatus(
        arcId,
        meta,
        this.crossLoopState.knowledgeFlags
      );
    }

    return {
      arcId,
      currentState: currentState?.currentStateId ?? arc?.initialStateId ?? 'UNKNOWN',
      metaLevel: meta.level,
      observations: meta.observations,
      canResolve: canResolveResult.canResolve,
      bestMode,
      costScore: costs[0]?.costScore,
      trivializationPercent: trivProgress.progressPercent,
      isLooperOnly,
      looperStatus,
    };
  }

  /**
   * Get status of all looper-only arcs
   * @returns Array of looper arc statuses
   */
  getLooperOnlyStatus(): LooperArcStatus[] {
    return this.constraintChecker.getAllLooperArcStatuses(
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags
    );
  }

  /**
   * Get resolution costs for all arcs
   * @returns Map of arc ID to costs
   */
  getResolutionCosts(): Map<string, ArcResolutionCost[]> {
    return this.resolutionManager.getAllResolutionCosts(
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags
    );
  }

  /**
   * Check feasibility of resolving a set of arcs
   * @param arcModes Map of arc ID to resolution mode
   * @param mainArcSlots Slots reserved for main arc
   * @returns Feasibility result
   */
  checkFeasibility(
    arcModes: Map<string, ResolutionMode>,
    mainArcSlots: string[]
  ): FeasibilityResult {
    return this.scheduler.checkFeasibility(
      arcModes,
      mainArcSlots,
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags
    );
  }

  /**
   * Compute optimal arc set for a loop
   * @param mainArcSlots Slots reserved for main arc
   * @param availableArcs Optional specific arcs to consider
   * @returns Optimal arc set result
   */
  computeOptimalArcSet(
    mainArcSlots: string[],
    availableArcs?: string[]
  ): OptimalArcSetResult {
    const arcs = availableArcs ?? this.registry.getAllIds();
    return this.scheduler.computeOptimalArcSet(
      arcs,
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags,
      mainArcSlots
    );
  }

  /**
   * Build a schedule for selected arcs
   * @param arcModes Selected arcs with modes
   * @param mainArcSlots Main arc slots
   * @returns Arc schedule
   */
  buildSchedule(
    arcModes: Map<string, ResolutionMode>,
    mainArcSlots: string[]
  ): ArcSchedule {
    return this.scheduler.buildSchedule(
      arcModes,
      mainArcSlots,
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags
    );
  }

  // ==========================================
  // Diagnostics
  // ==========================================

  /**
   * Validate all registered arcs
   * @returns Array of validation results
   */
  validateAllArcs(): ArcValidationResult[] {
    return this.registry.validateAll();
  }

  /**
   * Validate all looper-only arcs
   * @returns Array of looper-only validation results
   */
  validateLooperOnlyArcs(): LooperOnlyValidation[] {
    return this.constraintChecker.validateAllLooperArcs();
  }

  /**
   * Get a comprehensive progress report
   * @returns Progress report
   */
  getProgressReport(): ArcProgressReport {
    const metaSummary = this.metaManager.getProgressSummary(this.crossLoopState);
    const trivSummary = this.resolutionManager.getTrivializationSummary(
      this.crossLoopState.metas,
      this.crossLoopState.knowledgeFlags
    );
    const looperStatus = this.getLooperOnlyStatus();

    // Find trivial arcs
    const trivialArcs: string[] = [];
    for (const arcId of this.registry.getAllIds()) {
      const meta = this.crossLoopState.metas.get(arcId);
      if (meta && this.resolutionManager.isTrivial(
        arcId,
        meta,
        this.crossLoopState.knowledgeFlags
      )) {
        trivialArcs.push(arcId);
      }
    }

    return {
      totalArcs: metaSummary.totalArcs,
      totalLoops: this.crossLoopState.totalLoops,
      metaLevelDistribution: metaSummary.byLevel,
      resolvableArcs: metaSummary.resolvableThisLoop,
      trivialArcs,
      looperOnlyStatus: looperStatus,
      averageTrivializationPercent: trivSummary.averageProgress,
    };
  }

  // ==========================================
  // State Management
  // ==========================================

  /**
   * Get current loop state
   * @returns Current loop state or null
   */
  getCurrentLoopState(): LoopArcState | null {
    return this.currentLoopState;
  }

  /**
   * Get cross-loop state
   * @returns Cross-loop state
   */
  getCrossLoopState(): CrossLoopArcState {
    return this.crossLoopState;
  }

  /**
   * Set cross-loop state (for loading saved state)
   * @param state Cross-loop state to restore
   */
  setCrossLoopState(state: CrossLoopArcState): void {
    this.crossLoopState = state;
  }

  /**
   * Add knowledge flags directly
   * @param flags Flags to add
   */
  addKnowledgeFlags(flags: string[]): void {
    for (const flag of flags) {
      this.crossLoopState.knowledgeFlags.add(flag);
    }
    this.crossLoopState.updatedAt = nowISO();
  }

  /**
   * Serialize the engine state
   * @returns JSON string
   */
  serializeState(): string {
    return this.metaManager.serialize(this.crossLoopState);
  }

  /**
   * Deserialize and restore engine state
   * @param json JSON string
   */
  deserializeState(json: string): void {
    this.crossLoopState = this.metaManager.deserialize(json);
  }

  // ==========================================
  // Component Access
  // ==========================================

  /**
   * Get the arc registry
   * @returns Arc registry
   */
  getRegistry(): ArcRegistry {
    return this.registry;
  }

  /**
   * Get the FSM engine
   * @returns Arc FSM
   */
  getFSM(): ArcFSM {
    return this.fsm;
  }

  /**
   * Get the meta manager
   * @returns Arc loop meta manager
   */
  getMetaManager(): ArcLoopMetaManager {
    return this.metaManager;
  }

  /**
   * Get the constraint checker
   * @returns Looper constraint checker
   */
  getConstraintChecker(): LooperConstraintChecker {
    return this.constraintChecker;
  }

  /**
   * Get the resolution manager
   * @returns Resolution mode manager
   */
  getResolutionManager(): ResolutionModeManager {
    return this.resolutionManager;
  }

  /**
   * Get the scheduler
   * @returns Arc scheduler
   */
  getScheduler(): ArcScheduler {
    return this.scheduler;
  }
}
