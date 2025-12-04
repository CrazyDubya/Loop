/**
 * LooperConstraints - Validation and checking for looper-only arcs
 *
 * This module ensures that arcs marked as "LOOPER_ONLY" genuinely
 * require cross-loop information and cannot be solved in a single loop.
 * It validates the design constraints and provides runtime status queries.
 */

import { ArcRegistry } from './ArcRegistry';
import {
  SideArcDefinition,
  ArcLoopMeta,
  LooperOnlyConstraint,
  LooperOnlyValidation,
  LooperArcStatus,
  ArcTimeWindow,
  ArcTransition,
  createInitialArcLoopMeta,
} from './types';

/**
 * Graph context for path analysis
 */
export interface GraphContext {
  /** Time bounds for the day (HH:MM format) */
  timeBounds: { start: string; end: string };
  /** Travel time between locations in minutes */
  travelTimes?: Map<string, Map<string, number>>;
  /** Slot duration in minutes */
  slotDurationMinutes: number;
}

/**
 * Result of analyzing observation possibilities
 */
export interface ObservationAnalysis {
  /** Maximum observations achievable in one loop */
  maxPerLoop: number;
  /** All possible combinations of observations per loop */
  possibleCombinations: string[][];
  /** Time slots that conflict (can't both be visited) */
  conflictingSlots: Array<[string, string]>;
  /** Locations that conflict */
  conflictingLocations: Array<[string, string]>;
}

/**
 * LooperConstraintChecker - Validates and checks looper-only constraints
 */
export class LooperConstraintChecker {
  private registry: ArcRegistry;
  private graphContext?: GraphContext;

  /**
   * Create a new LooperConstraintChecker
   * @param registry The arc registry
   * @param graphContext Optional graph context for path analysis
   */
  constructor(registry: ArcRegistry, graphContext?: GraphContext) {
    this.registry = registry;
    this.graphContext = graphContext;
  }

  /**
   * Set or update the graph context
   * @param context New graph context
   */
  setGraphContext(context: GraphContext): void {
    this.graphContext = context;
  }

  /**
   * Validate that an arc's looper-only design is correct
   * @param arcId The arc ID to validate
   * @returns Validation result
   */
  validateLooperOnlyDesign(arcId: string): LooperOnlyValidation {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return {
        isValid: false,
        actualMaxPerLoop: 0,
        declaredMaxPerLoop: 0,
        conflictingTimeSlots: [],
        conflictingLocations: [],
        warnings: [`Arc "${arcId}" not found in registry`],
      };
    }

    if (!arc.looperConstraint) {
      return {
        isValid: arc.meta.looperClass !== 'LOOPER_ONLY',
        actualMaxPerLoop: 0,
        declaredMaxPerLoop: 0,
        conflictingTimeSlots: [],
        conflictingLocations: [],
        warnings: arc.meta.looperClass === 'LOOPER_ONLY'
          ? ['Arc marked LOOPER_ONLY but has no looperConstraint']
          : [],
      };
    }

    const constraint = arc.looperConstraint;
    const analysis = this.analyzeObservationPossibilities(arc, constraint);
    const warnings: string[] = [];

    // Check if declared max matches actual
    if (analysis.maxPerLoop > constraint.maxObservationsPerLoop) {
      warnings.push(
        `Declared maxObservationsPerLoop (${constraint.maxObservationsPerLoop}) is less than ` +
        `actual achievable (${analysis.maxPerLoop})`
      );
    }

    // Check if the constraint actually makes it looper-only
    const observationsRequired = constraint.observationRequirements.length;
    const isActuallyLooperOnly = analysis.maxPerLoop < observationsRequired;

    if (!isActuallyLooperOnly) {
      warnings.push(
        `Arc can be resolved in a single loop: requires ${observationsRequired} observations, ` +
        `but ${analysis.maxPerLoop} are achievable per loop`
      );
    }

    // Verify there are actual conflicts that enforce the constraint
    if (analysis.conflictingSlots.length === 0 && analysis.conflictingLocations.length === 0) {
      warnings.push(
        'No time slot or location conflicts found to enforce looper-only constraint'
      );
    }

    return {
      isValid: isActuallyLooperOnly && warnings.length === 0,
      actualMaxPerLoop: analysis.maxPerLoop,
      declaredMaxPerLoop: constraint.maxObservationsPerLoop,
      conflictingTimeSlots: analysis.conflictingSlots.map(([a, b]) => [a, b]),
      conflictingLocations: analysis.conflictingLocations.map(([a, b]) => [a, b]),
      warnings,
    };
  }

  /**
   * Analyze what observations are possible in a single loop
   * @param arc Arc definition
   * @param constraint Looper constraint
   * @returns Analysis result
   */
  private analyzeObservationPossibilities(
    arc: SideArcDefinition,
    constraint: LooperOnlyConstraint
  ): ObservationAnalysis {
    // Map observation requirements to their time/location constraints
    const obsConstraints = this.mapObservationsToConstraints(arc, constraint);

    // Find conflicting pairs
    const conflictingSlots: Array<[string, string]> = [];
    const conflictingLocations: Array<[string, string]> = [];

    const obsIds = constraint.observationRequirements;
    for (let i = 0; i < obsIds.length; i++) {
      for (let j = i + 1; j < obsIds.length; j++) {
        const obs1 = obsConstraints.get(obsIds[i]);
        const obs2 = obsConstraints.get(obsIds[j]);

        if (obs1 && obs2) {
          // Check time conflicts
          if (this.timeSlotsConflict(obs1.timeSlots, obs2.timeSlots)) {
            conflictingSlots.push([obsIds[i], obsIds[j]]);
          }

          // Check location conflicts (if same time, different locations)
          if (this.locationsConflict(obs1, obs2)) {
            conflictingLocations.push([obsIds[i], obsIds[j]]);
          }
        }
      }
    }

    // Calculate max achievable observations
    const possibleCombinations = this.findMaximalCompatibleSets(
      obsIds,
      conflictingSlots,
      conflictingLocations
    );

    const maxPerLoop = possibleCombinations.reduce(
      (max, combo) => Math.max(max, combo.length),
      0
    );

    return {
      maxPerLoop,
      possibleCombinations,
      conflictingSlots,
      conflictingLocations,
    };
  }

  /**
   * Map observations to their time/location constraints
   * @param arc Arc definition
   * @param constraint Looper constraint
   * @returns Map of observation ID to constraints
   */
  private mapObservationsToConstraints(
    arc: SideArcDefinition,
    constraint: LooperOnlyConstraint
  ): Map<string, { timeSlots: string[]; locations: string[] }> {
    const result = new Map<string, { timeSlots: string[]; locations: string[] }>();

    for (const obsId of constraint.observationRequirements) {
      // Find transitions that produce this observation
      const relevantTransitions = arc.transitions.filter((t) => {
        // Check if this transition relates to the observation
        return (
          t.id.includes(obsId) ||
          t.trigger.requiredKnowledgeFlags?.includes(obsId) ||
          arc.knowledgeFlagsProduced.includes(obsId)
        );
      });

      // Collect time slots and locations from transitions
      const timeSlots = new Set<string>();
      const locations = new Set<string>();

      for (const t of relevantTransitions) {
        if (t.trigger.requiredTimeSlots) {
          t.trigger.requiredTimeSlots.forEach((s) => timeSlots.add(s));
        }
        if (t.trigger.requiredLocations) {
          t.trigger.requiredLocations.forEach((l) => locations.add(l));
        }
      }

      // Also check time windows
      for (const window of arc.timeWindows) {
        if (window.windowId.includes(obsId) || obsId.includes(window.windowId)) {
          window.activeSlots.forEach((s) => timeSlots.add(s));
          window.locations?.forEach((l) => locations.add(l));
        }
      }

      result.set(obsId, {
        timeSlots: Array.from(timeSlots),
        locations: Array.from(locations),
      });
    }

    return result;
  }

  /**
   * Check if two sets of time slots conflict (overlap in a way that prevents both)
   * @param slots1 First set of time slots
   * @param slots2 Second set of time slots
   * @returns true if they conflict
   */
  private timeSlotsConflict(slots1: string[], slots2: string[]): boolean {
    // If slots overlap exactly, no conflict (can do both)
    // Conflict occurs when slots are at the same time or too close
    for (const s1 of slots1) {
      for (const s2 of slots2) {
        if (s1 === s2) {
          // Same time slot - could be conflict or not depending on locations
          // For simplicity, assume conflict if they share a slot
          return true;
        }
        // Check if slots are too close together (e.g., within travel time)
        if (this.graphContext && this.areSlotsAdjacent(s1, s2)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if slots are adjacent (within one slot duration)
   * @param slot1 First slot (HH:MM)
   * @param slot2 Second slot (HH:MM)
   * @returns true if adjacent
   */
  private areSlotsAdjacent(slot1: string, slot2: string): boolean {
    const mins1 = this.slotToMinutes(slot1);
    const mins2 = this.slotToMinutes(slot2);
    const slotDuration = this.graphContext?.slotDurationMinutes ?? 30;
    return Math.abs(mins1 - mins2) <= slotDuration;
  }

  /**
   * Convert time slot to minutes from midnight
   * @param slot Time slot (HH:MM)
   * @returns Minutes from midnight
   */
  private slotToMinutes(slot: string): number {
    const [hours, mins] = slot.split(':').map(Number);
    return hours * 60 + mins;
  }

  /**
   * Check if two observations have location conflicts
   * @param obs1 First observation constraints
   * @param obs2 Second observation constraints
   * @returns true if locations conflict
   */
  private locationsConflict(
    obs1: { timeSlots: string[]; locations: string[] },
    obs2: { timeSlots: string[]; locations: string[] }
  ): boolean {
    // Locations conflict if they're different and time slots overlap
    const hasOverlappingTime = obs1.timeSlots.some((s) => obs2.timeSlots.includes(s));
    if (!hasOverlappingTime) return false;

    // If either has no location constraint, no location conflict
    if (obs1.locations.length === 0 || obs2.locations.length === 0) return false;

    // Conflict if no shared locations
    const sharedLocations = obs1.locations.filter((l) => obs2.locations.includes(l));
    return sharedLocations.length === 0;
  }

  /**
   * Find maximal compatible sets of observations
   * @param obsIds All observation IDs
   * @param conflictingSlots Conflicting time slot pairs
   * @param conflictingLocations Conflicting location pairs
   * @returns Array of maximal compatible sets
   */
  private findMaximalCompatibleSets(
    obsIds: string[],
    conflictingSlots: Array<[string, string]>,
    conflictingLocations: Array<[string, string]>
  ): string[][] {
    // Build conflict graph
    const conflicts = new Map<string, Set<string>>();
    for (const id of obsIds) {
      conflicts.set(id, new Set());
    }

    for (const [a, b] of conflictingSlots) {
      conflicts.get(a)?.add(b);
      conflicts.get(b)?.add(a);
    }

    for (const [a, b] of conflictingLocations) {
      conflicts.get(a)?.add(b);
      conflicts.get(b)?.add(a);
    }

    // Find all maximal independent sets (simplified - just find compatible subsets)
    const maximalSets: string[][] = [];

    // Use backtracking to find all maximal compatible sets
    const findSets = (current: string[], remaining: string[]): void => {
      if (remaining.length === 0) {
        // Check if this is maximal
        const canExtend = obsIds.some(
          (id) =>
            !current.includes(id) &&
            current.every((c) => !conflicts.get(c)?.has(id))
        );
        if (!canExtend && current.length > 0) {
          maximalSets.push([...current]);
        }
        return;
      }

      const [next, ...rest] = remaining;

      // Try including next
      const canInclude = current.every((c) => !conflicts.get(c)?.has(next));
      if (canInclude) {
        findSets([...current, next], rest);
      }

      // Try excluding next
      findSets(current, rest);
    };

    findSets([], obsIds);

    // If no sets found, each observation is compatible with itself
    if (maximalSets.length === 0) {
      return obsIds.map((id) => [id]);
    }

    return maximalSets;
  }

  /**
   * Get maximum observations achievable per loop for an arc
   * @param arcId Arc ID
   * @param startNode Starting node (optional, for path analysis)
   * @returns Analysis result
   */
  getMaxObservationsPerLoop(
    arcId: string,
    startNode?: string
  ): { max: number; possibleCombinations: string[][] } {
    const arc = this.registry.get(arcId);
    if (!arc || !arc.looperConstraint) {
      return { max: 0, possibleCombinations: [] };
    }

    const analysis = this.analyzeObservationPossibilities(arc, arc.looperConstraint);
    return {
      max: analysis.maxPerLoop,
      possibleCombinations: analysis.possibleCombinations,
    };
  }

  /**
   * Compute minimum loops needed to resolve an arc
   * @param arcId Arc ID
   * @param currentMeta Current meta-state
   * @returns Minimum loops needed
   */
  computeMinLoopsToResolve(arcId: string, currentMeta: ArcLoopMeta): number {
    const arc = this.registry.get(arcId);
    if (!arc) return 0;

    if (!arc.looperConstraint) {
      // Not looper-only, could be resolved in 1 loop
      return currentMeta.observations > 0 ? 0 : 1;
    }

    const constraint = arc.looperConstraint;
    const { max: maxPerLoop } = this.getMaxObservationsPerLoop(arcId);

    // Count how many observations we still need
    const acquiredObs = currentMeta.discoveredFlags.filter((f) =>
      constraint.observationRequirements.includes(f)
    ).length;
    const neededObs = constraint.observationRequirements.length - acquiredObs;

    if (neededObs <= 0) return 0;

    // Ceiling division: how many loops to get remaining observations
    return Math.ceil(neededObs / Math.max(1, maxPerLoop));
  }

  /**
   * Get status of a looper-only arc
   * @param arcId Arc ID
   * @param meta Current meta-state
   * @param knowledgeFlags Current knowledge flags
   * @returns Looper arc status
   */
  getLooperArcStatus(
    arcId: string,
    meta: ArcLoopMeta,
    knowledgeFlags: Set<string>
  ): LooperArcStatus {
    const arc = this.registry.get(arcId);
    if (!arc) {
      return {
        arcId,
        looperClass: 'NORMAL',
        metaLevel: meta.level,
        observationsAcquired: [],
        observationsNeeded: [],
        missingKnowledgeFlags: [],
        estimatedLoopsRemaining: 0,
        canResolveThisLoop: false,
      };
    }

    const constraint = arc.looperConstraint;
    const observationRequirements = constraint?.observationRequirements ?? [];
    const resolutionFlags = constraint?.resolutionFlags ?? [];

    // Determine which observations have been acquired
    const observationsAcquired = observationRequirements.filter(
      (obs) => knowledgeFlags.has(obs) || meta.discoveredFlags.includes(obs)
    );
    const observationsNeeded = observationRequirements.filter(
      (obs) => !observationsAcquired.includes(obs)
    );

    // Check missing resolution flags
    const missingKnowledgeFlags = resolutionFlags.filter(
      (flag) => !knowledgeFlags.has(flag)
    );

    // Can resolve if all observations acquired and all flags present
    const canResolveThisLoop =
      observationsNeeded.length === 0 && missingKnowledgeFlags.length === 0;

    // Estimate loops remaining
    const estimatedLoopsRemaining = canResolveThisLoop
      ? 0
      : this.computeMinLoopsToResolve(arcId, meta);

    return {
      arcId,
      looperClass: arc.meta.looperClass,
      metaLevel: meta.level,
      observationsAcquired,
      observationsNeeded,
      missingKnowledgeFlags,
      estimatedLoopsRemaining,
      canResolveThisLoop,
    };
  }

  /**
   * Get status of all looper-only arcs
   * @param metas Map of arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Array of looper arc statuses
   */
  getAllLooperArcStatuses(
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): LooperArcStatus[] {
    const looperArcs = this.registry.getLooperOnlyArcs();
    return looperArcs.map((arc) => {
      const meta = metas.get(arc.meta.id) ?? createInitialArcLoopMeta(arc.meta.id);
      return this.getLooperArcStatus(arc.meta.id, meta, knowledgeFlags);
    });
  }

  /**
   * Validate all looper-only arcs in the registry
   * @returns Array of validation results
   */
  validateAllLooperArcs(): LooperOnlyValidation[] {
    const looperArcs = this.registry.getLooperOnlyArcs();
    return looperArcs.map((arc) => this.validateLooperOnlyDesign(arc.meta.id));
  }

  /**
   * Check if an observation can be made in the current context
   * @param arcId Arc ID
   * @param observationId Observation ID
   * @param currentTimeSlot Current time slot
   * @param currentLocation Current location
   * @returns Whether observation is possible
   */
  canMakeObservation(
    arcId: string,
    observationId: string,
    currentTimeSlot: string,
    currentLocation: string
  ): { possible: boolean; reason?: string } {
    const arc = this.registry.get(arcId);
    if (!arc || !arc.looperConstraint) {
      return { possible: false, reason: 'Arc not found or not looper-only' };
    }

    // Check if observation is in requirements
    if (!arc.looperConstraint.observationRequirements.includes(observationId)) {
      return { possible: false, reason: 'Observation not in requirements' };
    }

    // Check time windows
    const relevantWindows = arc.timeWindows.filter(
      (w) => w.windowId.includes(observationId) || observationId.includes(w.windowId)
    );

    for (const window of relevantWindows) {
      const timeOk = window.activeSlots.includes(currentTimeSlot);
      const locationOk = !window.locations || window.locations.includes(currentLocation);

      if (timeOk && locationOk) {
        return { possible: true };
      }
    }

    // Check transitions that enable this observation
    for (const t of arc.transitions) {
      const timeOk =
        !t.trigger.requiredTimeSlots ||
        t.trigger.requiredTimeSlots.includes(currentTimeSlot);
      const locationOk =
        !t.trigger.requiredLocations ||
        t.trigger.requiredLocations.includes(currentLocation);

      if (timeOk && locationOk) {
        return { possible: true };
      }
    }

    return { possible: false, reason: 'Time slot or location not valid for observation' };
  }
}
