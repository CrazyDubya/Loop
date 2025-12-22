/**
 * ArcRegistry - Storage and retrieval of side arc definitions
 *
 * The registry maintains all registered side arcs and provides
 * methods for querying, filtering, and validating arc definitions.
 */

import {
  SideArcDefinition,
  SideArcMeta,
  ArcTier,
  ArcState,
  ArcTransition,
  ArcValidationResult,
  LooperOnlyClass,
  ResolubilityClass,
  ArcTimeWindow,
  sortArcsByImportance,
} from './types';

/**
 * Query options for retrieving arcs
 */
export interface ArcQuery {
  /** Filter by tier */
  tier?: ArcTier;
  /** Filter by looper class */
  looperClass?: LooperOnlyClass;
  /** Filter by resolubility */
  resolubility?: ResolubilityClass;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Minimum priority weight */
  minPriorityWeight?: number;
  /** Maximum priority weight */
  maxPriorityWeight?: number;
}

/**
 * Registry for side arc definitions
 */
export class ArcRegistry {
  private arcs: Map<string, SideArcDefinition> = new Map();

  /**
   * Register a new arc definition
   * @param arc The arc definition to register
   * @param validate Whether to validate before registering (default: true)
   * @throws Error if arc ID already exists or validation fails
   */
  register(arc: SideArcDefinition, validate: boolean = true): void {
    if (this.arcs.has(arc.meta.id)) {
      throw new Error(`Arc with ID "${arc.meta.id}" already registered`);
    }

    if (validate) {
      const validation = this.validate(arc);
      if (!validation.valid) {
        throw new Error(
          `Arc "${arc.meta.id}" validation failed: ${validation.errors.join('; ')}`
        );
      }
    }

    this.arcs.set(arc.meta.id, arc);
  }

  /**
   * Register multiple arcs at once
   * @param arcs Array of arc definitions
   * @param validate Whether to validate before registering
   */
  registerAll(arcs: SideArcDefinition[], validate: boolean = true): void {
    for (const arc of arcs) {
      this.register(arc, validate);
    }
  }

  /**
   * Unregister an arc by ID
   * @param arcId The arc ID to remove
   * @returns true if arc was removed, false if not found
   */
  unregister(arcId: string): boolean {
    return this.arcs.delete(arcId);
  }

  /**
   * Clear all registered arcs
   */
  clear(): void {
    this.arcs.clear();
  }

  /**
   * Get an arc definition by ID
   * @param arcId The arc ID
   * @returns The arc definition or undefined
   */
  get(arcId: string): SideArcDefinition | undefined {
    return this.arcs.get(arcId);
  }

  /**
   * Check if an arc is registered
   * @param arcId The arc ID
   * @returns true if registered
   */
  has(arcId: string): boolean {
    return this.arcs.has(arcId);
  }

  /**
   * Get all registered arc IDs
   * @returns Array of arc IDs
   */
  getAllIds(): string[] {
    return Array.from(this.arcs.keys());
  }

  /**
   * Get all registered arc definitions
   * @returns Array of arc definitions
   */
  getAll(): SideArcDefinition[] {
    return Array.from(this.arcs.values());
  }

  /**
   * Get all arc metadata (lighter than full definitions)
   * @returns Array of arc metadata
   */
  getAllMeta(): SideArcMeta[] {
    return this.getAll().map((arc) => arc.meta);
  }

  /**
   * Get arcs by tier
   * @param tier The arc tier
   * @returns Array of arc definitions with that tier
   */
  getByTier(tier: ArcTier): SideArcDefinition[] {
    return this.getAll().filter((arc) => arc.meta.tier === tier);
  }

  /**
   * Get B-story arcs (tier B)
   * @returns Array of B-story arc definitions
   */
  getBStories(): SideArcDefinition[] {
    return this.getByTier('B');
  }

  /**
   * Get C-story arcs (tier C)
   * @returns Array of C-story arc definitions
   */
  getCStories(): SideArcDefinition[] {
    return this.getByTier('C');
  }

  /**
   * Get D-story arcs (tier D)
   * @returns Array of D-story arc definitions
   */
  getDStories(): SideArcDefinition[] {
    return this.getByTier('D');
  }

  /**
   * Get looper-only arcs
   * @returns Array of looper-only arc definitions
   */
  getLooperOnlyArcs(): SideArcDefinition[] {
    return this.getAll().filter((arc) => arc.meta.looperClass === 'LOOPER_ONLY');
  }

  /**
   * Get arcs that are hard for non-loopers
   * @returns Array of hard-for-normal arc definitions
   */
  getHardForNormalArcs(): SideArcDefinition[] {
    return this.getAll().filter(
      (arc) =>
        arc.meta.looperClass === 'HARD_FOR_NORMAL' ||
        arc.meta.looperClass === 'LOOPER_ONLY'
    );
  }

  /**
   * Get arcs by resolubility class
   * @param resolubility The resolubility class
   * @returns Array of arc definitions with that resolubility
   */
  getByResolubility(resolubility: ResolubilityClass): SideArcDefinition[] {
    return this.getAll().filter((arc) => arc.meta.resolubility === resolubility);
  }

  /**
   * Get single-pass arcs (can be resolved in one loop)
   * @returns Array of single-pass arc definitions
   */
  getSinglePassArcs(): SideArcDefinition[] {
    return this.getByResolubility('SINGLE_PASS');
  }

  /**
   * Get multi-pass arcs (require multiple loops)
   * @returns Array of multi-pass arc definitions
   */
  getMultiPassArcs(): SideArcDefinition[] {
    return this.getAll().filter(
      (arc) =>
        arc.meta.resolubility === 'MULTI_PASS_OBSERVATION' ||
        arc.meta.resolubility === 'MULTI_PASS_INTERVENTION'
    );
  }

  /**
   * Get arcs by tag
   * @param tag The tag to search for
   * @returns Array of arc definitions with that tag
   */
  getByTag(tag: string): SideArcDefinition[] {
    return this.getAll().filter((arc) => arc.meta.tags?.includes(tag));
  }

  /**
   * Query arcs with multiple filters
   * @param query Query options
   * @returns Array of matching arc definitions
   */
  query(query: ArcQuery): SideArcDefinition[] {
    let results = this.getAll();

    if (query.tier !== undefined) {
      results = results.filter((arc) => arc.meta.tier === query.tier);
    }

    if (query.looperClass !== undefined) {
      results = results.filter((arc) => arc.meta.looperClass === query.looperClass);
    }

    if (query.resolubility !== undefined) {
      results = results.filter((arc) => arc.meta.resolubility === query.resolubility);
    }

    if (query.tags !== undefined && query.tags.length > 0) {
      results = results.filter((arc) =>
        query.tags!.some((tag) => arc.meta.tags?.includes(tag))
      );
    }

    if (query.minPriorityWeight !== undefined) {
      results = results.filter(
        (arc) => arc.meta.priorityWeight >= query.minPriorityWeight!
      );
    }

    if (query.maxPriorityWeight !== undefined) {
      results = results.filter(
        (arc) => arc.meta.priorityWeight <= query.maxPriorityWeight!
      );
    }

    return results;
  }

  /**
   * Get arcs sorted by importance (tier then priority weight)
   * @returns Array of arc definitions sorted by importance
   */
  getSortedByImportance(): SideArcDefinition[] {
    const metas = sortArcsByImportance(this.getAllMeta());
    return metas.map((meta) => this.arcs.get(meta.id)!);
  }

  /**
   * Get a state by ID from an arc
   * @param arcId The arc ID
   * @param stateId The state ID
   * @returns The state or undefined
   */
  getState(arcId: string, stateId: string): ArcState | undefined {
    const arc = this.get(arcId);
    return arc?.states.find((s) => s.id === stateId);
  }

  /**
   * Get all transitions from a state in an arc
   * @param arcId The arc ID
   * @param fromStateId The source state ID
   * @returns Array of transitions from that state
   */
  getTransitionsFrom(arcId: string, fromStateId: string): ArcTransition[] {
    const arc = this.get(arcId);
    if (!arc) return [];
    return arc.transitions.filter((t) => t.from === fromStateId);
  }

  /**
   * Get all transitions to a state in an arc
   * @param arcId The arc ID
   * @param toStateId The target state ID
   * @returns Array of transitions to that state
   */
  getTransitionsTo(arcId: string, toStateId: string): ArcTransition[] {
    const arc = this.get(arcId);
    if (!arc) return [];
    return arc.transitions.filter((t) => t.to === toStateId);
  }

  /**
   * Get terminal states for an arc
   * @param arcId The arc ID
   * @returns Array of terminal states
   */
  getTerminalStates(arcId: string): ArcState[] {
    const arc = this.get(arcId);
    if (!arc) return [];
    return arc.states.filter((s) => s.isTerminal);
  }

  /**
   * Get time windows for an arc
   * @param arcId The arc ID
   * @returns Array of time windows
   */
  getTimeWindows(arcId: string): ArcTimeWindow[] {
    const arc = this.get(arcId);
    return arc?.timeWindows ?? [];
  }

  /**
   * Check if a time slot is valid for an arc
   * @param arcId The arc ID
   * @param timeSlot The time slot (HH:MM)
   * @returns true if the time slot is in any of the arc's windows
   */
  isTimeSlotValid(arcId: string, timeSlot: string): boolean {
    const windows = this.getTimeWindows(arcId);
    return windows.some((w) => w.activeSlots.includes(timeSlot));
  }

  /**
   * Get arcs active at a specific time slot
   * @param timeSlot The time slot (HH:MM)
   * @returns Array of arc IDs active at that time
   */
  getArcsActiveAtTime(timeSlot: string): string[] {
    return this.getAllIds().filter((arcId) => this.isTimeSlotValid(arcId, timeSlot));
  }

  /**
   * Validate an arc definition
   * @param arc The arc definition to validate
   * @returns Validation result with errors and warnings
   */
  validate(arc: SideArcDefinition): ArcValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check meta
    if (!arc.meta.id || arc.meta.id.trim() === '') {
      errors.push('Arc meta.id is required');
    }
    if (!arc.meta.name || arc.meta.name.trim() === '') {
      errors.push('Arc meta.name is required');
    }
    if (arc.meta.priorityWeight < 0 || arc.meta.priorityWeight > 100) {
      errors.push('Arc meta.priorityWeight must be between 0 and 100');
    }

    // Check states
    if (!arc.states || arc.states.length === 0) {
      errors.push('Arc must have at least one state');
    }

    const stateIds = new Set(arc.states.map((s) => s.id));
    if (stateIds.size !== arc.states.length) {
      errors.push('Arc has duplicate state IDs');
    }

    // Check initial state exists
    if (!stateIds.has(arc.initialStateId)) {
      errors.push(`Initial state "${arc.initialStateId}" not found in states`);
    }

    // Check terminal states have outcome types
    for (const state of arc.states) {
      if (state.isTerminal && !state.outcomeType) {
        warnings.push(`Terminal state "${state.id}" should have an outcomeType`);
      }
    }

    // Check at least one terminal state exists
    const terminalStates = arc.states.filter((s) => s.isTerminal);
    if (terminalStates.length === 0) {
      warnings.push('Arc has no terminal states');
    }

    // Check transitions
    for (const transition of arc.transitions) {
      if (!stateIds.has(transition.from)) {
        errors.push(`Transition "${transition.id}" has invalid from state "${transition.from}"`);
      }
      if (!stateIds.has(transition.to)) {
        errors.push(`Transition "${transition.id}" has invalid to state "${transition.to}"`);
      }

      // Check if transition originates from terminal state
      const fromState = arc.states.find((s) => s.id === transition.from);
      if (fromState?.isTerminal) {
        warnings.push(
          `Transition "${transition.id}" originates from terminal state "${transition.from}"`
        );
      }

      // Validate time slots format
      if (transition.trigger.requiredTimeSlots) {
        for (const slot of transition.trigger.requiredTimeSlots) {
          if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(slot)) {
            errors.push(
              `Transition "${transition.id}" has invalid time slot format: "${slot}"`
            );
          }
        }
      }

      // Validate stochastic probability
      if (transition.trigger.stochastic) {
        const prob = transition.trigger.stochastic.probability;
        if (prob < 0 || prob > 1) {
          errors.push(
            `Transition "${transition.id}" has invalid probability: ${prob}`
          );
        }
      }
    }

    // Check time windows
    for (const window of arc.timeWindows) {
      if (window.arcId !== arc.meta.id) {
        errors.push(`Time window "${window.windowId}" has mismatched arcId`);
      }
      if (!window.activeSlots || window.activeSlots.length === 0) {
        errors.push(`Time window "${window.windowId}" has no active slots`);
      }
      for (const slot of window.activeSlots) {
        if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(slot)) {
          errors.push(
            `Time window "${window.windowId}" has invalid time slot format: "${slot}"`
          );
        }
      }
    }

    // Check resolution profile
    if (arc.resolutionProfile.arcId !== arc.meta.id) {
      errors.push('Resolution profile has mismatched arcId');
    }
    if (!arc.resolutionProfile.availableModes || arc.resolutionProfile.availableModes.length === 0) {
      errors.push('Resolution profile must have at least one available mode');
    }
    if (!arc.resolutionProfile.availableModes.includes(arc.resolutionProfile.defaultMode)) {
      errors.push('Resolution profile defaultMode must be in availableModes');
    }

    // Check looper constraint if present
    if (arc.looperConstraint) {
      if (arc.looperConstraint.arcId !== arc.meta.id) {
        errors.push('Looper constraint has mismatched arcId');
      }
      if (arc.looperConstraint.maxObservationsPerLoop < 1) {
        errors.push('Looper constraint maxObservationsPerLoop must be at least 1');
      }
      if (
        arc.looperConstraint.observationRequirements.length <=
        arc.looperConstraint.maxObservationsPerLoop
      ) {
        warnings.push(
          'Looper constraint observationRequirements count should exceed maxObservationsPerLoop ' +
            'for the arc to be truly looper-only'
        );
      }
      if (arc.meta.looperClass !== 'LOOPER_ONLY') {
        warnings.push(
          'Arc has looperConstraint but looperClass is not LOOPER_ONLY'
        );
      }
    } else if (arc.meta.looperClass === 'LOOPER_ONLY') {
      warnings.push(
        'Arc has looperClass LOOPER_ONLY but no looperConstraint defined'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      arcId: arc.meta.id,
    };
  }

  /**
   * Validate all registered arcs
   * @returns Array of validation results
   */
  validateAll(): ArcValidationResult[] {
    return this.getAll().map((arc) => this.validate(arc));
  }

  /**
   * Get count of registered arcs
   * @returns Number of registered arcs
   */
  get size(): number {
    return this.arcs.size;
  }

  /**
   * Export all arcs as JSON
   * @returns JSON string of all arc definitions
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import arcs from JSON
   * @param json JSON string of arc definitions
   * @param validate Whether to validate (default: true)
   */
  import(json: string, validate: boolean = true): void {
    const arcs = JSON.parse(json) as SideArcDefinition[];
    this.registerAll(arcs, validate);
  }
}
