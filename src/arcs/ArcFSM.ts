/**
 * ArcFSM - Finite State Machine engine for side arcs
 *
 * Handles in-loop state transitions for B/C/D story arcs.
 * Each arc maintains its own FSM that can be stepped based on
 * player actions, time, location, and accumulated knowledge.
 */

import { ArcRegistry } from './ArcRegistry';
import {
  ArcTransition,
  TransitionTrigger,
  ArcStepContext,
  ArcStepResult,
  ArcRuntimeState,
  ArcState,
  ArcMetaLevel,
  meetsMetaLevel,
  createInitialArcRuntimeState,
} from './types';

/**
 * Options for transition evaluation
 */
export interface TransitionEvalOptions {
  /** Whether to use stochastic triggers (default: true) */
  useStochastic: boolean;
  /** Random seed for deterministic behavior (optional) */
  randomSeed?: string;
  /** Whether to require all trigger conditions (default: true for AND, false for OR) */
  requireAll: boolean;
}

const DEFAULT_EVAL_OPTIONS: TransitionEvalOptions = {
  useStochastic: true,
  requireAll: true,
};

/**
 * Result of evaluating a transition trigger
 */
export interface TriggerEvalResult {
  /** Whether the trigger is satisfied */
  satisfied: boolean;
  /** Which conditions were met */
  metConditions: string[];
  /** Which conditions were not met */
  unmetConditions: string[];
  /** Stochastic roll result if applicable */
  stochasticResult?: {
    required: number;
    rolled: number;
    passed: boolean;
  };
}

/**
 * ArcFSM - Finite State Machine engine for side arcs
 */
export class ArcFSM {
  private registry: ArcRegistry;
  private randomGenerator: () => number;

  /**
   * Create a new ArcFSM
   * @param registry The arc registry to use
   * @param randomGenerator Optional custom random generator (default: Math.random)
   */
  constructor(registry: ArcRegistry, randomGenerator?: () => number) {
    this.registry = registry;
    this.randomGenerator = randomGenerator ?? Math.random;
  }

  /**
   * Initialize arc runtime states for a new loop
   * @param arcIds Arc IDs to initialize (default: all registered arcs)
   * @returns Map of arc ID to runtime state
   */
  initializeArcStates(arcIds?: string[]): Map<string, ArcRuntimeState> {
    const ids = arcIds ?? this.registry.getAllIds();
    const states = new Map<string, ArcRuntimeState>();

    for (const arcId of ids) {
      const arc = this.registry.get(arcId);
      if (arc) {
        states.set(arcId, createInitialArcRuntimeState(arcId, arc.initialStateId));
      }
    }

    return states;
  }

  /**
   * Get the current state object for an arc
   * @param arcId The arc ID
   * @param stateId The current state ID
   * @returns The state object or undefined
   */
  getStateObject(arcId: string, stateId: string): ArcState | undefined {
    return this.registry.getState(arcId, stateId);
  }

  /**
   * Check if a state is terminal
   * @param arcId The arc ID
   * @param stateId The state ID
   * @returns true if the state is terminal
   */
  isTerminalState(arcId: string, stateId: string): boolean {
    const state = this.getStateObject(arcId, stateId);
    return state?.isTerminal ?? false;
  }

  /**
   * Get available transitions from current state
   * @param arcId The arc ID
   * @param currentState The current state ID
   * @param context The step context
   * @param options Evaluation options
   * @returns Array of available transitions (triggers satisfied)
   */
  getAvailableTransitions(
    arcId: string,
    currentState: string,
    context: ArcStepContext,
    options: Partial<TransitionEvalOptions> = {}
  ): ArcTransition[] {
    const transitions = this.registry.getTransitionsFrom(arcId, currentState);
    const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };

    return transitions.filter((t) => {
      const evalResult = this.evaluateTrigger(t.trigger, context, opts);
      return evalResult.satisfied;
    });
  }

  /**
   * Evaluate a transition trigger against context
   * @param trigger The trigger to evaluate
   * @param context The step context
   * @param options Evaluation options
   * @returns Evaluation result
   */
  evaluateTrigger(
    trigger: TransitionTrigger,
    context: ArcStepContext,
    options: Partial<TransitionEvalOptions> = {}
  ): TriggerEvalResult {
    const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };
    const metConditions: string[] = [];
    const unmetConditions: string[] = [];
    let stochasticResult: TriggerEvalResult['stochasticResult'];

    // Check required actions
    if (trigger.requiredActions && trigger.requiredActions.length > 0) {
      const hasRequiredAction = trigger.requiredActions.includes(context.action);
      if (hasRequiredAction) {
        metConditions.push(`action:${context.action}`);
      } else {
        unmetConditions.push(`action:${trigger.requiredActions.join('|')}`);
      }
    }

    // Check required knowledge flags
    if (trigger.requiredKnowledgeFlags && trigger.requiredKnowledgeFlags.length > 0) {
      const hasAllFlags = trigger.requiredKnowledgeFlags.every((flag) =>
        context.knowledgeFlags.has(flag)
      );
      if (hasAllFlags) {
        metConditions.push('knowledgeFlags:all');
      } else {
        const missing = trigger.requiredKnowledgeFlags.filter(
          (f) => !context.knowledgeFlags.has(f)
        );
        unmetConditions.push(`knowledgeFlags:${missing.join(',')}`);
      }
    }

    // Check required arc meta level
    if (trigger.requiredArcMetaLevel) {
      // Get the meta level for this arc from context
      // We need to know which arc this trigger belongs to
      // For now, we'll check if any arc meets the level
      let metaLevelMet = false;
      for (const [, level] of context.arcMetaLevels) {
        if (meetsMetaLevel(level, trigger.requiredArcMetaLevel)) {
          metaLevelMet = true;
          break;
        }
      }
      if (metaLevelMet) {
        metConditions.push(`metaLevel:${trigger.requiredArcMetaLevel}`);
      } else {
        unmetConditions.push(`metaLevel:${trigger.requiredArcMetaLevel}`);
      }
    }

    // Check required time slots
    if (trigger.requiredTimeSlots && trigger.requiredTimeSlots.length > 0) {
      const inTimeSlot = trigger.requiredTimeSlots.includes(context.timeSlot);
      if (inTimeSlot) {
        metConditions.push(`timeSlot:${context.timeSlot}`);
      } else {
        unmetConditions.push(`timeSlot:${trigger.requiredTimeSlots.join('|')}`);
      }
    }

    // Check required locations
    if (trigger.requiredLocations && trigger.requiredLocations.length > 0) {
      const atLocation = trigger.requiredLocations.includes(context.location);
      if (atLocation) {
        metConditions.push(`location:${context.location}`);
      } else {
        unmetConditions.push(`location:${trigger.requiredLocations.join('|')}`);
      }
    }

    // Check forbidden arc states
    if (trigger.forbiddenArcStates) {
      let hasForbidden = false;
      for (const [arcId, forbiddenStates] of Object.entries(trigger.forbiddenArcStates)) {
        const currentArcState = context.otherArcStates.get(arcId);
        if (currentArcState && forbiddenStates.includes(currentArcState)) {
          hasForbidden = true;
          unmetConditions.push(`forbiddenState:${arcId}:${currentArcState}`);
          break;
        }
      }
      if (!hasForbidden) {
        metConditions.push('forbiddenStates:none');
      }
    }

    // Check required arc states
    if (trigger.requiredArcStates) {
      let hasRequired = true;
      for (const [arcId, requiredStates] of Object.entries(trigger.requiredArcStates)) {
        const currentArcState = context.otherArcStates.get(arcId);
        if (!currentArcState || !requiredStates.includes(currentArcState)) {
          hasRequired = false;
          unmetConditions.push(`requiredState:${arcId}:${requiredStates.join('|')}`);
          break;
        }
      }
      if (hasRequired) {
        metConditions.push('requiredStates:met');
      }
    }

    // Check minimum confidence
    if (trigger.minConfidence !== undefined) {
      const confidence = context.confidence ?? 1.0;
      if (confidence >= trigger.minConfidence) {
        metConditions.push(`confidence:${confidence}`);
      } else {
        unmetConditions.push(`confidence:${trigger.minConfidence}`);
      }
    }

    // Handle stochastic trigger
    if (trigger.stochastic && opts.useStochastic) {
      const roll = this.randomGenerator();
      const passed = roll < trigger.stochastic.probability;
      stochasticResult = {
        required: trigger.stochastic.probability,
        rolled: roll,
        passed,
      };
      if (passed) {
        metConditions.push(`stochastic:${roll.toFixed(3)}`);
      } else {
        unmetConditions.push(`stochastic:${roll.toFixed(3)}`);
      }
    }

    // Determine overall satisfaction
    let satisfied: boolean;
    if (opts.requireAll) {
      // All conditions must be met (AND logic)
      satisfied = unmetConditions.length === 0;
    } else {
      // At least one condition must be met (OR logic)
      satisfied = metConditions.length > 0;
    }

    // Special case: if no conditions specified, transition is always available
    const hasAnyConditions =
      (trigger.requiredActions && trigger.requiredActions.length > 0) ||
      (trigger.requiredKnowledgeFlags && trigger.requiredKnowledgeFlags.length > 0) ||
      trigger.requiredArcMetaLevel !== undefined ||
      (trigger.requiredTimeSlots && trigger.requiredTimeSlots.length > 0) ||
      (trigger.requiredLocations && trigger.requiredLocations.length > 0) ||
      trigger.forbiddenArcStates !== undefined ||
      trigger.requiredArcStates !== undefined ||
      trigger.minConfidence !== undefined ||
      trigger.stochastic !== undefined;

    if (!hasAnyConditions) {
      satisfied = true;
      metConditions.push('unconditional');
    }

    return {
      satisfied,
      metConditions,
      unmetConditions,
      stochasticResult,
    };
  }

  /**
   * Check if a specific transition can be taken
   * @param arcId The arc ID
   * @param from Source state ID
   * @param to Target state ID
   * @param context The step context
   * @returns true if the transition can be taken
   */
  canTransition(
    arcId: string,
    from: string,
    to: string,
    context: ArcStepContext
  ): boolean {
    const transitions = this.registry.getTransitionsFrom(arcId, from);
    const transition = transitions.find((t) => t.to === to);
    if (!transition) return false;

    const evalResult = this.evaluateTrigger(transition.trigger, context);
    return evalResult.satisfied;
  }

  /**
   * Step a single arc
   * @param arcId The arc ID
   * @param currentState Current state ID
   * @param context The step context
   * @param options Evaluation options
   * @returns Step result
   */
  stepArc(
    arcId: string,
    currentState: string,
    context: ArcStepContext,
    options: Partial<TransitionEvalOptions> = {}
  ): ArcStepResult {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return {
        arcId,
        previousState: currentState,
        newState: currentState,
        changed: false,
        warnings: [`Arc "${arcId}" not found in registry`],
      };
    }

    // Check if current state is terminal
    if (this.isTerminalState(arcId, currentState)) {
      return {
        arcId,
        previousState: currentState,
        newState: currentState,
        changed: false,
        warnings: ['Arc is in terminal state'],
      };
    }

    // Get available transitions
    const availableTransitions = this.getAvailableTransitions(
      arcId,
      currentState,
      context,
      options
    );

    if (availableTransitions.length === 0) {
      return {
        arcId,
        previousState: currentState,
        newState: currentState,
        changed: false,
      };
    }

    // Sort by priority (higher first), take the highest priority transition
    const sortedTransitions = [...availableTransitions].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    const selectedTransition = sortedTransitions[0];

    // Get the new state
    const newStateObj = this.getStateObject(arcId, selectedTransition.to);

    // Collect knowledge flags produced by this transition
    const newKnowledgeFlags: string[] = [];
    if (newStateObj && arc.knowledgeFlagsProduced) {
      // Check if transitioning to this state produces any flags
      // This is a simplified model - in practice, specific flags would be
      // associated with specific transitions or states
      for (const flag of arc.knowledgeFlagsProduced) {
        if (flag.includes(selectedTransition.to) || flag.includes(newStateObj.label)) {
          newKnowledgeFlags.push(flag);
        }
      }
    }

    return {
      arcId,
      previousState: currentState,
      newState: selectedTransition.to,
      transitionTaken: selectedTransition,
      changed: true,
      newKnowledgeFlags: newKnowledgeFlags.length > 0 ? newKnowledgeFlags : undefined,
    };
  }

  /**
   * Step all arcs for an action
   * @param arcStates Current states for all arcs
   * @param context The step context
   * @param options Evaluation options
   * @returns Map of arc ID to step result
   */
  stepAllArcs(
    arcStates: Map<string, ArcRuntimeState>,
    context: ArcStepContext,
    options: Partial<TransitionEvalOptions> = {}
  ): Map<string, ArcStepResult> {
    const results = new Map<string, ArcStepResult>();

    // Build a context with all other arc states
    const otherArcStates = new Map<string, string>();
    for (const [arcId, state] of arcStates) {
      otherArcStates.set(arcId, state.currentStateId);
    }

    for (const [arcId, runtimeState] of arcStates) {
      // Create context with other arc states (excluding self)
      const contextWithOthers: ArcStepContext = {
        ...context,
        otherArcStates: new Map(
          [...otherArcStates].filter(([id]) => id !== arcId)
        ),
      };

      const result = this.stepArc(
        arcId,
        runtimeState.currentStateId,
        contextWithOthers,
        options
      );
      results.set(arcId, result);
    }

    return results;
  }

  /**
   * Apply step results to runtime states
   * @param arcStates Current runtime states
   * @param results Step results to apply
   * @returns Updated runtime states
   */
  applyStepResults(
    arcStates: Map<string, ArcRuntimeState>,
    results: Map<string, ArcStepResult>
  ): Map<string, ArcRuntimeState> {
    const updated = new Map<string, ArcRuntimeState>();

    for (const [arcId, state] of arcStates) {
      const result = results.get(arcId);
      if (result && result.changed) {
        const newState = this.getStateObject(arcId, result.newState);
        updated.set(arcId, {
          ...state,
          previousStateId: state.currentStateId,
          currentStateId: result.newState,
          actionsThisLoop: [...state.actionsThisLoop, result.transitionTaken?.id ?? ''],
          isTerminal: newState?.isTerminal ?? false,
          outcomeType: newState?.outcomeType,
        });
      } else {
        updated.set(arcId, state);
      }
    }

    return updated;
  }

  /**
   * Execute a full step: evaluate all arcs and apply results
   * @param arcStates Current runtime states
   * @param context The step context
   * @param options Evaluation options
   * @returns Object with updated states and results
   */
  executeStep(
    arcStates: Map<string, ArcRuntimeState>,
    context: ArcStepContext,
    options: Partial<TransitionEvalOptions> = {}
  ): { states: Map<string, ArcRuntimeState>; results: Map<string, ArcStepResult> } {
    const results = this.stepAllArcs(arcStates, context, options);
    const states = this.applyStepResults(arcStates, results);
    return { states, results };
  }

  /**
   * Get a summary of arc states
   * @param arcStates Runtime states
   * @returns Summary object
   */
  getStateSummary(arcStates: Map<string, ArcRuntimeState>): {
    total: number;
    terminal: number;
    inProgress: number;
    byOutcome: Record<string, number>;
  } {
    let terminal = 0;
    let inProgress = 0;
    const byOutcome: Record<string, number> = {};

    for (const [, state] of arcStates) {
      if (state.isTerminal) {
        terminal++;
        const outcome = state.outcomeType ?? 'UNKNOWN';
        byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
      } else {
        inProgress++;
      }
    }

    return {
      total: arcStates.size,
      terminal,
      inProgress,
      byOutcome,
    };
  }

  /**
   * Simulate a sequence of actions and return final states
   * @param arcIds Arcs to simulate
   * @param actions Array of step contexts (actions in order)
   * @param options Evaluation options
   * @returns Final arc states after all actions
   */
  simulate(
    arcIds: string[],
    actions: ArcStepContext[],
    options: Partial<TransitionEvalOptions> = {}
  ): Map<string, ArcRuntimeState> {
    let states = this.initializeArcStates(arcIds);

    for (const context of actions) {
      const { states: newStates } = this.executeStep(states, context, options);
      states = newStates;
    }

    return states;
  }

  /**
   * Find shortest path from current state to target state
   * @param arcId The arc ID
   * @param fromState Starting state ID
   * @param toState Target state ID
   * @returns Array of transition IDs forming the path, or null if no path
   */
  findPath(arcId: string, fromState: string, toState: string): string[] | null {
    const arc = this.registry.get(arcId);
    if (!arc) return null;

    // BFS to find shortest path
    const queue: Array<{ state: string; path: string[] }> = [
      { state: fromState, path: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { state, path } = queue.shift()!;
      if (state === toState) return path;
      if (visited.has(state)) continue;
      visited.add(state);

      const transitions = this.registry.getTransitionsFrom(arcId, state);
      for (const t of transitions) {
        if (!visited.has(t.to)) {
          queue.push({ state: t.to, path: [...path, t.id] });
        }
      }
    }

    return null;
  }

  /**
   * Get all reachable states from a given state
   * @param arcId The arc ID
   * @param fromState Starting state ID
   * @returns Set of reachable state IDs
   */
  getReachableStates(arcId: string, fromState: string): Set<string> {
    const reachable = new Set<string>();
    const queue = [fromState];

    while (queue.length > 0) {
      const state = queue.shift()!;
      if (reachable.has(state)) continue;
      reachable.add(state);

      const transitions = this.registry.getTransitionsFrom(arcId, state);
      for (const t of transitions) {
        if (!reachable.has(t.to)) {
          queue.push(t.to);
        }
      }
    }

    return reachable;
  }

  /**
   * Check if a target state is reachable from current state
   * @param arcId The arc ID
   * @param fromState Starting state ID
   * @param toState Target state ID
   * @returns true if target is reachable
   */
  isReachable(arcId: string, fromState: string, toState: string): boolean {
    return this.getReachableStates(arcId, fromState).has(toState);
  }
}
