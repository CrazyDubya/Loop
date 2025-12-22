/**
 * Side Arc System Type Definitions
 *
 * This module defines types for B-story, C-story, and D-story arcs
 * that run alongside the main narrative arc. These side arcs have
 * their own FSMs, cross-loop meta-states, and resolution mechanics.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Arc Tier Classification
// ============================================

/**
 * Arc tiers represent narrative importance:
 * - B: Core personal arc (high importance, complex)
 * - C: Medium side quests (moderate importance)
 * - D: Micro arcs / vignettes (low importance, quick)
 */
export type ArcTier = 'B' | 'C' | 'D';

// ============================================
// Resolubility Classification
// ============================================

/**
 * How an arc can be resolved across loops:
 * - SINGLE_PASS: Solvable within a single loop
 * - MULTI_PASS_OBSERVATION: Requires multiple loops to understand, then 1 to solve
 * - MULTI_PASS_INTERVENTION: Requires multiple loops of active intervention
 */
export type ResolubilityClass =
  | 'SINGLE_PASS'
  | 'MULTI_PASS_OBSERVATION'
  | 'MULTI_PASS_INTERVENTION';

// ============================================
// Looper-Only Classification
// ============================================

/**
 * Whether an arc requires looper knowledge:
 * - NORMAL: Any sufficiently smart non-looper could solve
 * - HARD_FOR_NORMAL: Very unlikely for non-looper, but possible
 * - LOOPER_ONLY: By construction, requires cross-loop information
 */
export type LooperOnlyClass =
  | 'NORMAL'
  | 'HARD_FOR_NORMAL'
  | 'LOOPER_ONLY';

// ============================================
// Arc Meta-Level (Cross-Loop Knowledge)
// ============================================

/**
 * The protagonist's accumulated understanding of an arc across loops:
 * - UNTOUCHED: Never meaningfully engaged
 * - SEEN_ONCE: Has observed results once
 * - PATTERN_OBSERVED: Multiple observations, stable pattern inferred
 * - MECHANIC_KNOWN: Knows key hidden rule / trigger
 * - OPTIMAL_PLAN_FOUND: Knows near-optimal resolution strategy
 */
export type ArcMetaLevel =
  | 'UNTOUCHED'
  | 'SEEN_ONCE'
  | 'PATTERN_OBSERVED'
  | 'MECHANIC_KNOWN'
  | 'OPTIMAL_PLAN_FOUND';

// ============================================
// Resolution Modes
// ============================================

/**
 * How an arc can be resolved once knowledge is gained:
 * - NOT_RESOLVED: Arc not yet resolved
 * - ONSITE_HEAVY: Physically present, multiple slots, high risk
 * - ONSITE_LIGHT: Short onsite nudge
 * - REMOTE_SIMPLE: A call/message once you know what to do
 * - REMOTE_COMPLEX: Remote + setup with another NPC
 * - UNSTABLE: Resolution opens failure/backlash risk
 */
export type ResolutionMode =
  | 'NOT_RESOLVED'
  | 'ONSITE_HEAVY'
  | 'ONSITE_LIGHT'
  | 'REMOTE_SIMPLE'
  | 'REMOTE_COMPLEX'
  | 'UNSTABLE';

// ============================================
// Arc Outcome Types
// ============================================

/**
 * Terminal state outcome classification
 */
export type ArcOutcomeType =
  | 'GOOD'
  | 'BAD'
  | 'NEUTRAL'
  | 'LOCKED_OUT'
  | 'IN_PROGRESS';

// ============================================
// Conflict Types
// ============================================

/**
 * Types of conflicts between arcs
 */
export type ConflictType =
  | 'TIME'
  | 'LOCATION'
  | 'PSYCHE'
  | 'RESOURCE'
  | 'NARRATIVE';

// ============================================
// Side Arc Metadata
// ============================================

/**
 * Core metadata for a side arc
 */
export interface SideArcMeta {
  /** Unique identifier for this arc */
  id: string;
  /** Human-readable name */
  name: string;
  /** Arc tier: B (core), C (medium), D (micro) */
  tier: ArcTier;
  /** How the arc can be resolved across loops */
  resolubility: ResolubilityClass;
  /** Whether the arc requires looper knowledge */
  looperClass: LooperOnlyClass;
  /** Narrative weight / importance (0-100) */
  priorityWeight: number;
  /** Optional description */
  description?: string;
  /** Optional tags for categorization */
  tags?: string[];
}

// ============================================
// In-Loop FSM Types
// ============================================

/**
 * A state within an arc's in-loop FSM
 */
export interface ArcState {
  /** Unique state identifier (e.g., "UNSEEN", "NOTICED", "GOOD") */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of this state */
  description: string;
  /** Whether this state has no outgoing transitions */
  isTerminal: boolean;
  /** For terminal states, the outcome type */
  outcomeType?: ArcOutcomeType;
  /** Optional tags for state categorization */
  tags?: string[];
}

/**
 * Trigger conditions for a state transition
 */
export interface TransitionTrigger {
  /** Required player actions (e.g., ["TALK_NPC_X", "PULL_FIRE_ALARM"]) */
  requiredActions?: string[];
  /** Required knowledge flags from KnowledgeState */
  requiredKnowledgeFlags?: string[];
  /** Required arc meta level (cross-loop knowledge) */
  requiredArcMetaLevel?: ArcMetaLevel;
  /** Required time slots (HH:MM format) */
  requiredTimeSlots?: string[];
  /** Required locations */
  requiredLocations?: string[];
  /** Other arc states that block this transition */
  forbiddenArcStates?: Record<string, string[]>;
  /** Required other arc states for this transition */
  requiredArcStates?: Record<string, string[]>;
  /** Random chance component */
  stochastic?: {
    /** Probability of transition (0-1) */
    probability: number;
    /** Seed for deterministic randomness (optional) */
    seed?: string;
  };
  /** Minimum confidence level required */
  minConfidence?: number;
}

/**
 * A transition between arc states
 */
export interface ArcTransition {
  /** Unique transition identifier */
  id: string;
  /** Source state ID */
  from: string;
  /** Target state ID */
  to: string;
  /** Conditions that must be met */
  trigger: TransitionTrigger;
  /** Priority for conflict resolution (higher = checked first) */
  priority?: number;
  /** Optional label for narrative generation */
  label?: string;
  /** Optional description */
  description?: string;
}

// ============================================
// Cross-Loop Meta-State
// ============================================

/**
 * Cross-loop accumulated knowledge about an arc
 */
export interface ArcLoopMeta {
  /** Arc this meta belongs to */
  arcId: string;
  /** Current understanding level */
  level: ArcMetaLevel;
  /** Number of loops where arc was observed (not UNSEEN) */
  observations: number;
  /** Number of loops where active intervention occurred */
  interventions: number;
  /** Specific knowledge flags discovered for this arc */
  discoveredFlags: string[];
  /** Best terminal state outcome achieved so far */
  bestOutcomeAchieved?: ArcOutcomeType;
  /** Loop ID where arc was first engaged */
  firstEngagedLoop?: string;
  /** Loop ID of most recent engagement */
  lastEngagedLoop?: string;
  /** Custom data for arc-specific tracking */
  customData?: Record<string, unknown>;
}

// ============================================
// Time Windows
// ============================================

/**
 * A time window during which arc interventions are valid
 */
export interface ArcTimeWindow {
  /** Arc this window belongs to */
  arcId: string;
  /** Window identifier (e.g., "INTRO", "CLIMAX") */
  windowId: string;
  /** Active time slots (HH:MM format) */
  activeSlots: string[];
  /** Valid locations during this window */
  locations?: string[];
  /** Whether this window must be hit for resolution */
  required?: boolean;
  /** Description of this window */
  description?: string;
}

// ============================================
// Resolution Profile
// ============================================

/**
 * Requirements for a specific resolution mode
 */
export interface ResolutionRequirements {
  /** The resolution mode */
  mode: ResolutionMode;
  /** Time slots required for this mode */
  requiredTimeSlots: string[];
  /** Locations required for this mode */
  requiredLocations: string[];
  /** Knowledge flags required for this mode */
  requiredKnowledgeFlags: string[];
  /** Minimum arc meta level required */
  minArcMetaLevel: ArcMetaLevel;
  /** Risk level (0-100) */
  riskLevel: number;
  /** Description of this resolution approach */
  description?: string;
}

/**
 * Resolution profile for an arc - defines available resolution modes
 */
export interface ArcResolutionProfile {
  /** Arc this profile belongs to */
  arcId: string;
  /** List of potentially available resolution modes */
  availableModes: ResolutionMode[];
  /** Requirements for each mode */
  modeRequirements: ResolutionRequirements[];
  /** Default mode when no better option is available */
  defaultMode: ResolutionMode;
}

// ============================================
// Looper-Only Constraints
// ============================================

/**
 * Constraints that enforce looper-only resolution
 */
export interface LooperOnlyConstraint {
  /** Arc this constraint applies to */
  arcId: string;
  /** Observation requirements (must all be collected) */
  observationRequirements: string[];
  /** Maximum observations possible per loop (design constraint) */
  maxObservationsPerLoop: number;
  /** Knowledge flags needed for resolution */
  resolutionFlags: string[];
  /** Description of why this is looper-only */
  rationale?: string;
}

// ============================================
// Conflict Rules
// ============================================

/**
 * Rule defining conflicts between arcs
 */
export interface ArcConflictRule {
  /** First arc in conflict */
  arcId1: string;
  /** Second arc in conflict */
  arcId2: string;
  /** Type of conflict */
  conflictType: ConflictType;
  /** Whether arcs are completely mutually exclusive */
  mutuallyExclusive: boolean;
  /** Additional details about the conflict */
  details: {
    /** Overlapping time slots */
    overlappingSlots?: string[];
    /** Overlapping locations */
    overlappingLocations?: string[];
    /** Human-readable description */
    description?: string;
  };
}

// ============================================
// Complete Arc Definition
// ============================================

/**
 * Complete definition of a side arc, including all components
 */
export interface SideArcDefinition {
  /** Core metadata */
  meta: SideArcMeta;
  /** In-loop FSM states */
  states: ArcState[];
  /** In-loop FSM transitions */
  transitions: ArcTransition[];
  /** Time windows for interventions */
  timeWindows: ArcTimeWindow[];
  /** Resolution profile */
  resolutionProfile: ArcResolutionProfile;
  /** Looper-only constraint (if applicable) */
  looperConstraint?: LooperOnlyConstraint;
  /** Knowledge flags this arc can produce */
  knowledgeFlagsProduced: string[];
  /** Initial state ID when arc begins */
  initialStateId: string;
}

// ============================================
// Runtime State Types
// ============================================

/**
 * Per-arc state during a loop
 */
export interface ArcRuntimeState {
  /** Arc ID */
  arcId: string;
  /** Current state ID */
  currentStateId: string;
  /** Previous state ID (for transition tracking) */
  previousStateId?: string;
  /** Actions taken on this arc this loop */
  actionsThisLoop: string[];
  /** Time slots where arc was engaged */
  engagedSlots: string[];
  /** Whether arc reached a terminal state */
  isTerminal: boolean;
  /** Outcome type if terminal */
  outcomeType?: ArcOutcomeType;
}

/**
 * Complete arc state for a loop
 */
export interface LoopArcState {
  /** Loop ID */
  loopId: string;
  /** Per-arc runtime states */
  arcStates: Map<string, ArcRuntimeState>;
  /** Current time slot */
  currentTimeSlot: string;
  /** Current location */
  currentLocation: string;
  /** All actions taken this loop */
  allActionsThisLoop: string[];
}

/**
 * Cross-loop state for all arcs
 */
export interface CrossLoopArcState {
  /** Meta-states for all arcs */
  metas: Map<string, ArcLoopMeta>;
  /** Accumulated knowledge flags */
  knowledgeFlags: Set<string>;
  /** Total loops completed */
  totalLoops: number;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Outcome of arc processing for a single loop
 */
export interface LoopArcOutcome {
  /** Loop ID */
  loopId: string;
  /** Final states for each arc */
  finalArcStates: Map<string, string>;
  /** Outcomes for each arc */
  arcOutcomes: Map<string, ArcOutcomeType>;
  /** New knowledge flags discovered */
  newKnowledgeFlags: string[];
  /** Transitions that occurred */
  transitionsTaken: Array<{
    arcId: string;
    transitionId: string;
    from: string;
    to: string;
    timeSlot: string;
  }>;
}

// ============================================
// Context Types
// ============================================

/**
 * Context for stepping arc FSMs
 */
export interface ArcStepContext {
  /** Current action being taken */
  action: string;
  /** Current time slot (HH:MM) */
  timeSlot: string;
  /** Current location */
  location: string;
  /** Available knowledge flags */
  knowledgeFlags: Set<string>;
  /** Arc meta levels (cross-loop knowledge) */
  arcMetaLevels: Map<string, ArcMetaLevel>;
  /** Current states of other arcs */
  otherArcStates: Map<string, string>;
  /** Confidence level of current action (0-1) */
  confidence?: number;
}

/**
 * Result of stepping an arc
 */
export interface ArcStepResult {
  /** Arc ID */
  arcId: string;
  /** State before step */
  previousState: string;
  /** State after step */
  newState: string;
  /** Transition that was taken (if any) */
  transitionTaken?: ArcTransition;
  /** Whether state changed */
  changed: boolean;
  /** New knowledge flags discovered */
  newKnowledgeFlags?: string[];
  /** Warnings or notes */
  warnings?: string[];
}

// ============================================
// Query & Status Types
// ============================================

/**
 * Status of a looper-only arc
 */
export interface LooperArcStatus {
  /** Arc ID */
  arcId: string;
  /** Looper class */
  looperClass: LooperOnlyClass;
  /** Current meta level */
  metaLevel: ArcMetaLevel;
  /** Observations acquired so far */
  observationsAcquired: string[];
  /** Observations still needed */
  observationsNeeded: string[];
  /** Missing knowledge flags */
  missingKnowledgeFlags: string[];
  /** Estimated loops remaining to resolve */
  estimatedLoopsRemaining: number;
  /** Whether arc can be resolved this loop */
  canResolveThisLoop: boolean;
}

/**
 * Resolution cost for an arc
 */
export interface ArcResolutionCost {
  /** Arc ID */
  arcId: string;
  /** Resolution mode */
  mode: ResolutionMode;
  /** Time slots required */
  timeSlotsRequired: string[];
  /** Locations required */
  locationsRequired: string[];
  /** Weighted cost score */
  costScore: number;
  /** Risk score (0-100) */
  riskScore: number;
  /** Whether this is the optimal mode */
  isOptimal: boolean;
}

/**
 * Trivialization progress for an arc
 */
export interface TrivializationProgress {
  /** Arc ID */
  arcId: string;
  /** Current best available mode */
  currentBestMode: ResolutionMode;
  /** Current cost */
  currentCost: number;
  /** Optimal mode (once fully trivialized) */
  optimalMode: ResolutionMode;
  /** Optimal cost */
  optimalCost: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Next unlock information */
  nextUnlock?: {
    mode: ResolutionMode;
    requirements: string[];
  };
}

// ============================================
// Scheduling Types
// ============================================

/**
 * Result of feasibility check
 */
export interface FeasibilityResult {
  /** Whether the arc set is feasible */
  feasible: boolean;
  /** Conflicts found */
  conflicts: ArcConflictResult[];
  /** Time slots that are overloaded */
  overloadedSlots: string[];
  /** Suggestions for resolution */
  suggestions: string[];
}

/**
 * Result of conflict detection
 */
export interface ArcConflictResult {
  /** First arc */
  arc1: string;
  /** Second arc */
  arc2: string;
  /** Conflict type */
  conflictType: ConflictType;
  /** Severity: HARD = impossible, SOFT = risky */
  severity: 'HARD' | 'SOFT';
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Result of optimal arc set computation
 */
export interface OptimalArcSetResult {
  /** Selected arcs with their resolution modes */
  selectedArcs: Map<string, ResolutionMode>;
  /** Total cost of selected arcs */
  totalCost: number;
  /** Arcs that were excluded */
  excludedArcs: Array<{ arcId: string; reason: string }>;
  /** Narrative value (sum of priority weights) */
  narrativeValue: number;
}

/**
 * A scheduled slot for arc activities
 */
export interface ArcScheduleSlot {
  /** Time slot (HH:MM) */
  timeSlot: string;
  /** Arc activities in this slot */
  arcActivities: Array<{ arcId: string; action: string }>;
  /** Whether this slot is for main arc */
  isMainArc: boolean;
  /** Location for this slot */
  location?: string;
}

/**
 * Complete schedule for arcs
 */
export interface ArcSchedule {
  /** Slots mapped by time */
  slots: Map<string, ArcScheduleSlot>;
  /** Total duration in minutes */
  totalDuration: number;
  /** Aggregate risk profile (0-100) */
  riskProfile: number;
  /** Arcs included in schedule */
  includedArcs: string[];
}

// ============================================
// Validation Types
// ============================================

/**
 * Result of arc validation
 */
export interface ArcValidationResult {
  /** Whether arc definition is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Arc ID that was validated */
  arcId: string;
}

/**
 * Result of looper-only design validation
 */
export interface LooperOnlyValidation {
  /** Whether the looper-only design is valid */
  isValid: boolean;
  /** Actual max observations per loop */
  actualMaxPerLoop: number;
  /** Declared max observations per loop */
  declaredMaxPerLoop: number;
  /** Conflicting time slot combinations */
  conflictingTimeSlots: string[][];
  /** Conflicting location combinations */
  conflictingLocations: string[][];
  /** Validation warnings */
  warnings: string[];
}

// ============================================
// Configuration Types
// ============================================

/**
 * Configuration for the side arc engine
 */
export interface SideArcConfig {
  /** Whether to validate arcs on registration */
  validateOnRegister: boolean;
  /** Default meta level thresholds */
  metaLevelThresholds: MetaLevelThresholds;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Thresholds for meta level promotion
 */
export interface MetaLevelThresholds {
  /** Observations needed for SEEN_ONCE */
  seenOnce: number;
  /** Observations needed for PATTERN_OBSERVED */
  patternObserved: number;
  /** Base observations for MECHANIC_KNOWN (plus flag requirements) */
  mechanicKnown: number;
  /** Base observations for OPTIMAL_PLAN_FOUND (plus flag requirements) */
  optimalPlanFound: number;
}

/**
 * Default meta level thresholds
 */
export const DEFAULT_META_LEVEL_THRESHOLDS: MetaLevelThresholds = {
  seenOnce: 1,
  patternObserved: 3,
  mechanicKnown: 3,
  optimalPlanFound: 5,
};

/**
 * Default side arc configuration
 */
export const DEFAULT_SIDE_ARC_CONFIG: SideArcConfig = {
  validateOnRegister: true,
  metaLevelThresholds: DEFAULT_META_LEVEL_THRESHOLDS,
  debug: false,
};

// ============================================
// Helpers
// ============================================

/**
 * Generate a unique ID
 */
export function generateArcId(): string {
  return uuidv4();
}

/**
 * Get current ISO timestamp
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Compare meta levels (returns -1, 0, or 1)
 */
export function compareMetaLevels(a: ArcMetaLevel, b: ArcMetaLevel): number {
  const order: ArcMetaLevel[] = [
    'UNTOUCHED',
    'SEEN_ONCE',
    'PATTERN_OBSERVED',
    'MECHANIC_KNOWN',
    'OPTIMAL_PLAN_FOUND',
  ];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Check if meta level meets minimum requirement
 */
export function meetsMetaLevel(current: ArcMetaLevel, required: ArcMetaLevel): boolean {
  return compareMetaLevels(current, required) >= 0;
}

/**
 * Get tier priority (B > C > D)
 */
export function getTierPriority(tier: ArcTier): number {
  const priorities: Record<ArcTier, number> = { B: 3, C: 2, D: 1 };
  return priorities[tier];
}

/**
 * Sort arcs by tier and priority weight
 */
export function sortArcsByImportance(arcs: SideArcMeta[]): SideArcMeta[] {
  return [...arcs].sort((a, b) => {
    const tierDiff = getTierPriority(b.tier) - getTierPriority(a.tier);
    if (tierDiff !== 0) return tierDiff;
    return b.priorityWeight - a.priorityWeight;
  });
}

/**
 * Create initial arc loop meta
 */
export function createInitialArcLoopMeta(arcId: string): ArcLoopMeta {
  return {
    arcId,
    level: 'UNTOUCHED',
    observations: 0,
    interventions: 0,
    discoveredFlags: [],
  };
}

/**
 * Create initial arc runtime state
 */
export function createInitialArcRuntimeState(
  arcId: string,
  initialStateId: string
): ArcRuntimeState {
  return {
    arcId,
    currentStateId: initialStateId,
    actionsThisLoop: [],
    engagedSlots: [],
    isTerminal: false,
  };
}
