/**
 * ArcScheduler - Scheduling and conflict detection for side arcs
 *
 * This module handles:
 * - Feasibility checking for arc combinations
 * - Conflict detection between arcs
 * - Optimal arc selection given constraints
 * - Schedule building for multiple arcs
 */

import { ArcRegistry } from './ArcRegistry';
import { ResolutionModeManager } from './ResolutionModes';
import {
  ArcLoopMeta,
  ResolutionMode,
  ArcConflictRule,
  ConflictType,
  FeasibilityResult,
  ArcConflictResult,
  OptimalArcSetResult,
  ArcSchedule,
  ArcScheduleSlot,
  ArcResolutionCost,
  SideArcMeta,
  getTierPriority,
} from './types';

/**
 * Configuration for the scheduler
 */
export interface SchedulerConfig {
  /** Maximum arcs that can be resolved in a single loop */
  maxArcsPerLoop: number;
  /** Maximum time slots available for side arcs */
  maxSideArcSlots: number;
  /** Whether to allow soft conflicts (risky but possible) */
  allowSoftConflicts: boolean;
  /** Minimum narrative value required for arc selection */
  minNarrativeValue: number;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxArcsPerLoop: 5,
  maxSideArcSlots: 8,
  allowSoftConflicts: true,
  minNarrativeValue: 0,
};

/**
 * Slot usage tracking
 */
interface SlotUsage {
  slot: string;
  arcId: string;
  mode: ResolutionMode;
  location?: string;
}

/**
 * ArcScheduler - Handles scheduling and conflict detection
 */
export class ArcScheduler {
  private registry: ArcRegistry;
  private resolutionManager: ResolutionModeManager;
  private conflictRules: ArcConflictRule[];
  private config: SchedulerConfig;

  /**
   * Create a new ArcScheduler
   * @param registry Arc registry
   * @param resolutionManager Resolution mode manager
   * @param conflictRules Array of conflict rules
   * @param config Optional scheduler configuration
   */
  constructor(
    registry: ArcRegistry,
    resolutionManager: ResolutionModeManager,
    conflictRules: ArcConflictRule[] = [],
    config?: Partial<SchedulerConfig>
  ) {
    this.registry = registry;
    this.resolutionManager = resolutionManager;
    this.conflictRules = conflictRules;
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  /**
   * Add a conflict rule
   * @param rule Conflict rule to add
   */
  addConflictRule(rule: ArcConflictRule): void {
    this.conflictRules.push(rule);
  }

  /**
   * Remove conflict rules for an arc
   * @param arcId Arc ID
   */
  removeConflictRules(arcId: string): void {
    this.conflictRules = this.conflictRules.filter(
      (r) => r.arcId1 !== arcId && r.arcId2 !== arcId
    );
  }

  /**
   * Check feasibility of resolving a set of arcs
   * @param arcModes Map of arc ID to chosen resolution mode
   * @param mainArcSlots Time slots reserved for main arc
   * @param metas Arc meta-states
   * @param knowledgeFlags Current knowledge flags
   * @returns Feasibility result
   */
  checkFeasibility(
    arcModes: Map<string, ResolutionMode>,
    mainArcSlots: string[],
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): FeasibilityResult {
    const conflicts: ArcConflictResult[] = [];
    const overloadedSlots: string[] = [];
    const suggestions: string[] = [];

    // Check number of arcs
    if (arcModes.size > this.config.maxArcsPerLoop) {
      suggestions.push(
        `Too many arcs (${arcModes.size}). Maximum is ${this.config.maxArcsPerLoop}`
      );
    }

    // Check for conflicts between selected arcs
    const selectedArcs = Array.from(arcModes.keys());
    for (let i = 0; i < selectedArcs.length; i++) {
      for (let j = i + 1; j < selectedArcs.length; j++) {
        const arcConflicts = this.findConflictsBetween(
          selectedArcs[i],
          arcModes.get(selectedArcs[i])!,
          selectedArcs[j],
          arcModes.get(selectedArcs[j])!,
          metas,
          knowledgeFlags
        );
        conflicts.push(...arcConflicts);
      }
    }

    // Check slot usage
    const slotUsage = this.calculateSlotUsage(arcModes, metas, knowledgeFlags);
    const mainArcSlotSet = new Set(mainArcSlots);

    // Check for conflicts with main arc
    for (const usage of slotUsage) {
      if (mainArcSlotSet.has(usage.slot)) {
        conflicts.push({
          arc1: usage.arcId,
          arc2: 'MAIN_ARC',
          conflictType: 'TIME',
          severity: 'HARD',
          resolution: `Move ${usage.arcId} to a different time slot`,
        });
        overloadedSlots.push(usage.slot);
      }
    }

    // Check for slot overloading
    const slotCounts = new Map<string, number>();
    for (const usage of slotUsage) {
      slotCounts.set(usage.slot, (slotCounts.get(usage.slot) ?? 0) + 1);
    }

    for (const [slot, count] of slotCounts) {
      if (count > 1 && !overloadedSlots.includes(slot)) {
        overloadedSlots.push(slot);
        // Find which arcs are in this slot
        const arcsInSlot = slotUsage
          .filter((u) => u.slot === slot)
          .map((u) => u.arcId);
        suggestions.push(
          `Slot ${slot} is used by multiple arcs: ${arcsInSlot.join(', ')}`
        );
      }
    }

    // Check total slot usage
    const totalSlots = new Set(slotUsage.map((u) => u.slot)).size;
    if (totalSlots > this.config.maxSideArcSlots) {
      suggestions.push(
        `Using ${totalSlots} slots exceeds maximum of ${this.config.maxSideArcSlots}`
      );
    }

    // Determine feasibility
    const hasHardConflicts = conflicts.some((c) => c.severity === 'HARD');
    const hasSoftConflicts = conflicts.some((c) => c.severity === 'SOFT');
    const feasible =
      !hasHardConflicts &&
      (this.config.allowSoftConflicts || !hasSoftConflicts) &&
      overloadedSlots.length === 0;

    return {
      feasible,
      conflicts,
      overloadedSlots,
      suggestions,
    };
  }

  /**
   * Find conflicts between two specific arcs
   * @param arcId1 First arc ID
   * @param mode1 First arc's resolution mode
   * @param arcId2 Second arc ID
   * @param mode2 Second arc's resolution mode
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @returns Array of conflicts found
   */
  findConflictsBetween(
    arcId1: string,
    mode1: ResolutionMode,
    arcId2: string,
    mode2: ResolutionMode,
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): ArcConflictResult[] {
    const conflicts: ArcConflictResult[] = [];

    // Check explicit conflict rules
    for (const rule of this.conflictRules) {
      if (
        (rule.arcId1 === arcId1 && rule.arcId2 === arcId2) ||
        (rule.arcId1 === arcId2 && rule.arcId2 === arcId1)
      ) {
        conflicts.push({
          arc1: arcId1,
          arc2: arcId2,
          conflictType: rule.conflictType,
          severity: rule.mutuallyExclusive ? 'HARD' : 'SOFT',
          resolution: rule.details.description,
        });
      }
    }

    // Check time slot conflicts
    const meta1 = metas.get(arcId1);
    const meta2 = metas.get(arcId2);
    if (meta1 && meta2) {
      const cost1 = this.resolutionManager.computeModeCost(
        arcId1,
        mode1,
        meta1,
        knowledgeFlags
      );
      const cost2 = this.resolutionManager.computeModeCost(
        arcId2,
        mode2,
        meta2,
        knowledgeFlags
      );

      if (cost1 && cost2) {
        // Check for overlapping time slots
        const overlap = cost1.timeSlotsRequired.filter((s) =>
          cost2.timeSlotsRequired.includes(s)
        );
        if (overlap.length > 0) {
          conflicts.push({
            arc1: arcId1,
            arc2: arcId2,
            conflictType: 'TIME',
            severity: 'HARD',
            resolution: `Time slots overlap: ${overlap.join(', ')}`,
          });
        }

        // Check for location conflicts (same time, different locations)
        // This is simplified - a more complete implementation would check
        // if locations are reachable within the time constraints
        const locs1 = new Set(cost1.locationsRequired);
        const locs2 = new Set(cost2.locationsRequired);
        if (
          locs1.size > 0 &&
          locs2.size > 0 &&
          ![...locs1].some((l) => locs2.has(l))
        ) {
          // Different locations required
          const times1 = new Set(cost1.timeSlotsRequired);
          const times2 = new Set(cost2.timeSlotsRequired);
          // Check if any times are adjacent (would need travel)
          for (const t1 of times1) {
            for (const t2 of times2) {
              if (this.areSlotsAdjacent(t1, t2)) {
                conflicts.push({
                  arc1: arcId1,
                  arc2: arcId2,
                  conflictType: 'LOCATION',
                  severity: 'SOFT',
                  resolution: `Adjacent time slots with different locations may require travel time`,
                });
                break;
              }
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two time slots are adjacent
   * @param slot1 First slot (HH:MM)
   * @param slot2 Second slot (HH:MM)
   * @returns true if adjacent
   */
  private areSlotsAdjacent(slot1: string, slot2: string): boolean {
    const mins1 = this.slotToMinutes(slot1);
    const mins2 = this.slotToMinutes(slot2);
    return Math.abs(mins1 - mins2) <= 30; // Within 30 minutes
  }

  /**
   * Convert slot to minutes
   * @param slot Time slot (HH:MM)
   * @returns Minutes from midnight
   */
  private slotToMinutes(slot: string): number {
    const [hours, mins] = slot.split(':').map(Number);
    return hours * 60 + mins;
  }

  /**
   * Calculate slot usage for a set of arc modes
   * @param arcModes Map of arc ID to mode
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @returns Array of slot usage entries
   */
  private calculateSlotUsage(
    arcModes: Map<string, ResolutionMode>,
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): SlotUsage[] {
    const usage: SlotUsage[] = [];

    for (const [arcId, mode] of arcModes) {
      const meta = metas.get(arcId);
      if (!meta) continue;

      const cost = this.resolutionManager.computeModeCost(
        arcId,
        mode,
        meta,
        knowledgeFlags
      );
      if (cost) {
        for (let i = 0; i < cost.timeSlotsRequired.length; i++) {
          usage.push({
            slot: cost.timeSlotsRequired[i],
            arcId,
            mode,
            location: cost.locationsRequired[i],
          });
        }
      }
    }

    return usage;
  }

  /**
   * Compute optimal arc set for a loop
   * @param availableArcs Arcs that could be resolved
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @param mainArcSlots Slots reserved for main arc
   * @param maxArcs Maximum arcs to select (optional)
   * @returns Optimal arc set result
   */
  computeOptimalArcSet(
    availableArcs: string[],
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>,
    mainArcSlots: string[],
    maxArcs?: number
  ): OptimalArcSetResult {
    const maxCount = maxArcs ?? this.config.maxArcsPerLoop;

    // Get costs for all available arcs
    const arcCosts: Array<{
      arcId: string;
      cost: ArcResolutionCost;
      meta: SideArcMeta;
    }> = [];

    for (const arcId of availableArcs) {
      const meta = metas.get(arcId);
      const arc = this.registry.get(arcId);
      if (!meta || !arc) continue;

      const costs = this.resolutionManager.computeResolutionCosts(
        arcId,
        meta,
        knowledgeFlags
      );
      if (costs.length > 0) {
        arcCosts.push({
          arcId,
          cost: costs[0], // Best cost
          meta: arc.meta,
        });
      }
    }

    // Sort by value/cost ratio (higher tier and priority, lower cost = better)
    arcCosts.sort((a, b) => {
      const valueA = getTierPriority(a.meta.tier) * 10 + a.meta.priorityWeight;
      const valueB = getTierPriority(b.meta.tier) * 10 + b.meta.priorityWeight;
      const ratioA = valueA / Math.max(1, a.cost.costScore);
      const ratioB = valueB / Math.max(1, b.cost.costScore);
      return ratioB - ratioA;
    });

    // Greedy selection with conflict checking
    const selected = new Map<string, ResolutionMode>();
    const excluded: Array<{ arcId: string; reason: string }> = [];
    let totalCost = 0;
    let narrativeValue = 0;

    for (const { arcId, cost, meta } of arcCosts) {
      if (selected.size >= maxCount) {
        excluded.push({ arcId, reason: 'Maximum arc count reached' });
        continue;
      }

      // Try adding this arc
      const testSelection = new Map(selected);
      testSelection.set(arcId, cost.mode);

      const feasibility = this.checkFeasibility(
        testSelection,
        mainArcSlots,
        metas,
        knowledgeFlags
      );

      if (feasibility.feasible) {
        selected.set(arcId, cost.mode);
        totalCost += cost.costScore;
        narrativeValue += getTierPriority(meta.tier) * 10 + meta.priorityWeight;
      } else {
        const reasons = [
          ...feasibility.conflicts.map(
            (c) => `Conflicts with ${c.arc2}: ${c.conflictType}`
          ),
          ...feasibility.suggestions,
        ];
        excluded.push({
          arcId,
          reason: reasons[0] ?? 'Unknown conflict',
        });
      }
    }

    return {
      selectedArcs: selected,
      totalCost,
      excludedArcs: excluded,
      narrativeValue,
    };
  }

  /**
   * Build a schedule for selected arcs
   * @param arcModes Selected arcs with modes
   * @param mainArcSlots Main arc slots
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @returns Arc schedule
   */
  buildSchedule(
    arcModes: Map<string, ResolutionMode>,
    mainArcSlots: string[],
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): ArcSchedule {
    const slots = new Map<string, ArcScheduleSlot>();
    let totalDuration = 0;
    let riskSum = 0;
    let riskCount = 0;

    // Add main arc slots
    for (const slot of mainArcSlots) {
      slots.set(slot, {
        timeSlot: slot,
        arcActivities: [],
        isMainArc: true,
      });
    }

    // Add side arc slots
    const slotUsage = this.calculateSlotUsage(arcModes, metas, knowledgeFlags);
    for (const usage of slotUsage) {
      const existing = slots.get(usage.slot);
      if (existing) {
        existing.arcActivities.push({
          arcId: usage.arcId,
          action: `Resolve via ${usage.mode}`,
        });
        if (!existing.location && usage.location) {
          existing.location = usage.location;
        }
      } else {
        slots.set(usage.slot, {
          timeSlot: usage.slot,
          arcActivities: [
            {
              arcId: usage.arcId,
              action: `Resolve via ${usage.mode}`,
            },
          ],
          isMainArc: false,
          location: usage.location,
        });
      }
    }

    // Calculate risk and duration
    for (const [arcId, mode] of arcModes) {
      const meta = metas.get(arcId);
      if (!meta) continue;

      const cost = this.resolutionManager.computeModeCost(
        arcId,
        mode,
        meta,
        knowledgeFlags
      );
      if (cost) {
        totalDuration += cost.timeSlotsRequired.length * 30; // 30 mins per slot
        riskSum += cost.riskScore;
        riskCount++;
      }
    }

    const riskProfile = riskCount > 0 ? Math.round(riskSum / riskCount) : 0;

    return {
      slots,
      totalDuration,
      riskProfile,
      includedArcs: Array.from(arcModes.keys()),
    };
  }

  /**
   * Find all conflicts in the current configuration
   * @param arcModes All arc modes to check
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @returns All conflicts found
   */
  findAllConflicts(
    arcModes: Map<string, ResolutionMode>,
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): ArcConflictResult[] {
    const conflicts: ArcConflictResult[] = [];
    const arcs = Array.from(arcModes.keys());

    for (let i = 0; i < arcs.length; i++) {
      for (let j = i + 1; j < arcs.length; j++) {
        const pairConflicts = this.findConflictsBetween(
          arcs[i],
          arcModes.get(arcs[i])!,
          arcs[j],
          arcModes.get(arcs[j])!,
          metas,
          knowledgeFlags
        );
        conflicts.push(...pairConflicts);
      }
    }

    return conflicts;
  }

  /**
   * Get arcs that conflict with a specific arc
   * @param arcId Arc to check
   * @returns Array of conflicting arc IDs
   */
  getConflictingArcs(arcId: string): string[] {
    const conflicting = new Set<string>();

    for (const rule of this.conflictRules) {
      if (rule.arcId1 === arcId) {
        conflicting.add(rule.arcId2);
      } else if (rule.arcId2 === arcId) {
        conflicting.add(rule.arcId1);
      }
    }

    return Array.from(conflicting);
  }

  /**
   * Suggest alternative arcs when a conflict occurs
   * @param conflictingArcId Arc that's causing conflict
   * @param selectedArcs Currently selected arcs
   * @param metas Arc meta-states
   * @param knowledgeFlags Knowledge flags
   * @returns Array of alternative arc suggestions
   */
  suggestAlternatives(
    conflictingArcId: string,
    selectedArcs: Map<string, ResolutionMode>,
    metas: Map<string, ArcLoopMeta>,
    knowledgeFlags: Set<string>
  ): Array<{ arcId: string; reason: string }> {
    const alternatives: Array<{ arcId: string; reason: string }> = [];
    const conflictingWith = this.getConflictingArcs(conflictingArcId);
    const selectedSet = new Set(selectedArcs.keys());

    // Find arcs that don't conflict with the selection
    for (const arcId of this.registry.getAllIds()) {
      if (selectedSet.has(arcId)) continue;
      if (arcId === conflictingArcId) continue;

      const meta = metas.get(arcId);
      if (!meta) continue;

      // Check if this arc has any resolution modes available
      const modes = this.resolutionManager.getAvailableModes(
        arcId,
        meta,
        knowledgeFlags
      );
      if (modes.length === 0) continue;

      // Check if it conflicts with already selected arcs
      let hasConflict = false;
      for (const selected of selectedSet) {
        if (this.getConflictingArcs(arcId).includes(selected)) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        const arc = this.registry.get(arcId);
        alternatives.push({
          arcId,
          reason: `Tier ${arc?.meta.tier ?? 'Unknown'}, Priority ${arc?.meta.priorityWeight ?? 0}`,
        });
      }
    }

    // Sort by priority
    alternatives.sort((a, b) => {
      const arcA = this.registry.get(a.arcId);
      const arcB = this.registry.get(b.arcId);
      const valA =
        (arcA ? getTierPriority(arcA.meta.tier) * 100 : 0) +
        (arcA?.meta.priorityWeight ?? 0);
      const valB =
        (arcB ? getTierPriority(arcB.meta.tier) * 100 : 0) +
        (arcB?.meta.priorityWeight ?? 0);
      return valB - valA;
    });

    return alternatives.slice(0, 5); // Top 5 alternatives
  }
}
