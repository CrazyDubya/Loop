/**
 * Side Arc System
 *
 * A complete system for managing B-story, C-story, and D-story arcs
 * that run alongside the main narrative arc in a time-loop engine.
 *
 * Features:
 * - Tiered arc classification (B/C/D)
 * - In-loop FSM state machines
 * - Cross-loop meta-state tracking
 * - Looper-only arc mechanics
 * - Resolution mode trivialization
 * - Scheduling and conflict detection
 *
 * @example
 * ```typescript
 * import { SideArcEngine, SideArcDefinition } from './arcs';
 *
 * const engine = new SideArcEngine();
 *
 * // Register arcs
 * engine.registerArc(myBStoryArc);
 * engine.registerArcs([cStory1, cStory2, dStory1]);
 *
 * // Start a loop
 * engine.initializeLoop('loop-42');
 *
 * // Process actions
 * engine.stepArcs({ action: 'TALK_NPC', timeSlot: '08:00', location: 'CAFE' });
 *
 * // End loop and update cross-loop state
 * const outcome = engine.finalizeLoop();
 *
 * // Query status
 * const report = engine.getProgressReport();
 * ```
 */

// Types - export selectively to avoid conflicts with existing modules
export {
  // Tier & Classification
  ArcTier,
  ResolubilityClass,
  LooperOnlyClass,
  ArcMetaLevel,
  ResolutionMode,
  ArcOutcomeType,
  ConflictType,
  // Arc Metadata
  SideArcMeta,
  // FSM Types
  ArcState,
  TransitionTrigger,
  ArcTransition,
  // Cross-Loop Meta
  ArcLoopMeta,
  // Time Windows
  ArcTimeWindow,
  // Resolution Profile
  ResolutionRequirements,
  ArcResolutionProfile,
  // Looper Constraints
  LooperOnlyConstraint,
  // Conflicts
  ArcConflictRule,
  // Complete Definition
  SideArcDefinition,
  // Runtime State Types
  ArcRuntimeState,
  LoopArcState,
  CrossLoopArcState,
  LoopArcOutcome,
  // Context Types
  ArcStepContext,
  ArcStepResult,
  // Query & Status Types
  LooperArcStatus,
  ArcResolutionCost,
  TrivializationProgress,
  // Scheduling Types
  FeasibilityResult,
  ArcConflictResult,
  OptimalArcSetResult,
  ArcScheduleSlot,
  ArcSchedule,
  // Validation Types
  ArcValidationResult,
  LooperOnlyValidation,
  // Configuration Types
  SideArcConfig,
  MetaLevelThresholds,
  DEFAULT_META_LEVEL_THRESHOLDS,
  DEFAULT_SIDE_ARC_CONFIG,
  // Helpers
  generateArcId,
  compareMetaLevels,
  meetsMetaLevel,
  getTierPriority,
  sortArcsByImportance,
  createInitialArcLoopMeta,
  createInitialArcRuntimeState,
} from './types';

// Core Components
export { ArcRegistry, ArcQuery } from './ArcRegistry';
export { ArcFSM, TransitionEvalOptions, TriggerEvalResult } from './ArcFSM';
export {
  ArcLoopMetaManager,
  MetaPromotionConfig,
  CanResolveResult,
  MetaProgressSummary,
} from './ArcLoopMeta';
export {
  LooperConstraintChecker,
  GraphContext as ArcGraphContext,
  ObservationAnalysis,
} from './LooperConstraints';
export { ResolutionModeManager, CostWeights } from './ResolutionModes';
export { ArcScheduler, SchedulerConfig } from './ArcScheduler';

// Main Facade
export {
  SideArcEngine,
  LoopAction,
  ArcStatusReport,
  ArcProgressReport,
} from './SideArcEngine';
