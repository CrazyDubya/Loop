/**
 * MemoryLoopStore: In-memory implementation of LoopStore
 *
 * Good for development, testing, and small datasets.
 * Not persistent - data is lost when the process ends.
 */

import { LoopStore, LoopStoreStatistics } from './LoopStore';
import {
  Loop,
  EquivalenceClass,
  LoopQuery,
  LoopQueryResult,
  LoopStatus,
  OutcomeType,
  OperatorType,
} from './types';

export class MemoryLoopStore implements LoopStore {
  private loops: Map<string, Loop> = new Map();
  private equivalenceClasses: Map<string, EquivalenceClass> = new Map();
  private hashToClassId: Map<string, string> = new Map();

  // Indexes for faster queries
  private byEpoch: Map<string, Set<string>> = new Map();
  private byStatus: Map<LoopStatus, Set<string>> = new Map();
  private byOutcomeType: Map<OutcomeType, Set<string>> = new Map();
  private byTag: Map<string, Set<string>> = new Map();
  private byOperator: Map<OperatorType, Set<string>> = new Map();
  private byEquivalenceClass: Map<string, Set<string>> = new Map();
  private byParent: Map<string, Set<string>> = new Map();
  private anchors: Set<string> = new Set();

  private nextSequence = 1;

  // ============================================
  // Loop CRUD
  // ============================================

  async saveLoop(loop: Loop): Promise<void> {
    const existing = this.loops.get(loop.id);

    // Remove from old indexes if updating
    if (existing) {
      this.removeFromIndexes(existing);
    }

    // Save loop
    this.loops.set(loop.id, { ...loop });

    // Add to indexes
    this.addToIndexes(loop);

    // Update sequence counter
    if (loop.sequence_number >= this.nextSequence) {
      this.nextSequence = loop.sequence_number + 1;
    }
  }

  async getLoop(id: string): Promise<Loop | null> {
    const loop = this.loops.get(id);
    return loop ? { ...loop } : null;
  }

  async deleteLoop(id: string): Promise<boolean> {
    const loop = this.loops.get(id);
    if (!loop) return false;

    this.removeFromIndexes(loop);
    this.loops.delete(id);
    return true;
  }

  async hasLoop(id: string): Promise<boolean> {
    return this.loops.has(id);
  }

  async getLoopCount(): Promise<number> {
    return this.loops.size;
  }

  async getAllLoops(): Promise<Loop[]> {
    return Array.from(this.loops.values()).map(l => ({ ...l }));
  }

  // ============================================
  // Loop Queries
  // ============================================

  async queryLoops(query: LoopQuery): Promise<LoopQueryResult> {
    let candidateIds: Set<string> | null = null;

    // Start with most restrictive filter
    if (query.epoch_id) {
      candidateIds = this.intersect(candidateIds, this.byEpoch.get(query.epoch_id));
    }

    if (query.status) {
      candidateIds = this.intersect(candidateIds, this.byStatus.get(query.status));
    }

    if (query.outcome_type) {
      candidateIds = this.intersect(candidateIds, this.byOutcomeType.get(query.outcome_type));
    }

    if (query.operator_used) {
      candidateIds = this.intersect(candidateIds, this.byOperator.get(query.operator_used));
    }

    if (query.is_anchor !== undefined) {
      if (query.is_anchor) {
        candidateIds = this.intersect(candidateIds, this.anchors);
      } else {
        const nonAnchors = new Set(
          Array.from(this.loops.keys()).filter(id => !this.anchors.has(id))
        );
        candidateIds = this.intersect(candidateIds, nonAnchors);
      }
    }

    if (query.equivalence_class_id) {
      candidateIds = this.intersect(
        candidateIds,
        this.byEquivalenceClass.get(query.equivalence_class_id)
      );
    }

    if (query.parent_id) {
      candidateIds = this.intersect(candidateIds, this.byParent.get(query.parent_id));
    }

    if (query.tags && query.tags.length > 0) {
      const match = query.tags_match || 'all';
      if (match === 'all') {
        for (const tag of query.tags) {
          candidateIds = this.intersect(candidateIds, this.byTag.get(tag));
        }
      } else {
        // 'any' match
        const unionSet = new Set<string>();
        for (const tag of query.tags) {
          const tagSet = this.byTag.get(tag);
          if (tagSet) {
            tagSet.forEach(id => unionSet.add(id));
          }
        }
        candidateIds = this.intersect(candidateIds, unionSet);
      }
    }

    // If no filters applied, use all loops
    if (candidateIds === null) {
      candidateIds = new Set(this.loops.keys());
    }

    // Convert to loops and apply remaining filters
    let loops = Array.from(candidateIds)
      .map(id => this.loops.get(id)!)
      .filter(loop => {
        // Sequence range filter
        if (query.sequence_range) {
          if (query.sequence_range.min !== undefined && loop.sequence_number < query.sequence_range.min) {
            return false;
          }
          if (query.sequence_range.max !== undefined && loop.sequence_number > query.sequence_range.max) {
            return false;
          }
        }

        // Time range filter
        if (query.time_range) {
          const loopTime = new Date(loop.started_at).getTime();
          if (query.time_range.start) {
            const startTime = new Date(query.time_range.start).getTime();
            if (loopTime < startTime) return false;
          }
          if (query.time_range.end) {
            const endTime = new Date(query.time_range.end).getTime();
            if (loopTime > endTime) return false;
          }
        }

        return true;
      });

    // Sort by sequence number
    loops.sort((a, b) => a.sequence_number - b.sequence_number);

    const total = loops.length;

    // Apply offset and limit
    const offset = query.offset || 0;
    const limit = query.limit || loops.length;

    loops = loops.slice(offset, offset + limit);

    return {
      loops: loops.map(l => ({ ...l })),
      total,
      hasMore: offset + loops.length < total,
    };
  }

  async getLoopsByEpoch(epochId: string): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byEpoch.get(epochId));
  }

  async getLoopsByStatus(status: LoopStatus): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byStatus.get(status));
  }

  async getLoopsByOutcomeType(outcomeType: OutcomeType): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byOutcomeType.get(outcomeType));
  }

  async getLoopsByTag(tag: string): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byTag.get(tag));
  }

  async getLoopsByTags(tags: string[], match: 'all' | 'any'): Promise<Loop[]> {
    if (tags.length === 0) return [];

    if (match === 'any') {
      const unionSet = new Set<string>();
      for (const tag of tags) {
        const tagSet = this.byTag.get(tag);
        if (tagSet) {
          tagSet.forEach(id => unionSet.add(id));
        }
      }
      return this.getLoopsFromIndex(unionSet);
    }

    // 'all' match
    let candidateIds: Set<string> | null = null;
    for (const tag of tags) {
      candidateIds = this.intersect(candidateIds, this.byTag.get(tag));
    }
    return this.getLoopsFromIndex(candidateIds || new Set());
  }

  async getLoopsByOperator(operator: OperatorType): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byOperator.get(operator));
  }

  async getAnchorLoops(): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.anchors);
  }

  async getLoopsInEquivalenceClass(classId: string): Promise<Loop[]> {
    return this.getLoopsFromIndex(this.byEquivalenceClass.get(classId));
  }

  async getLoopAncestry(loopId: string): Promise<Loop[]> {
    const ancestry: Loop[] = [];
    let currentId: string | null | undefined = loopId;

    while (currentId) {
      const loop = this.loops.get(currentId);
      if (!loop) break;
      ancestry.push({ ...loop });
      currentId = loop.parent_id;
    }

    return ancestry;
  }

  async getLoopDescendants(loopId: string): Promise<Loop[]> {
    const descendants: Loop[] = [];
    const queue = [loopId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = this.byParent.get(currentId);
      if (children) {
        for (const childId of children) {
          const child = this.loops.get(childId);
          if (child) {
            descendants.push({ ...child });
            queue.push(childId);
          }
        }
      }
    }

    return descendants;
  }

  async getNextSequenceNumber(): Promise<number> {
    return this.nextSequence;
  }

  // ============================================
  // Equivalence Class CRUD
  // ============================================

  async saveEquivalenceClass(ec: EquivalenceClass): Promise<void> {
    const existing = this.equivalenceClasses.get(ec.id);

    // Remove old hash mapping
    if (existing) {
      this.hashToClassId.delete(existing.composite_hash);
    }

    this.equivalenceClasses.set(ec.id, { ...ec });
    this.hashToClassId.set(ec.composite_hash, ec.id);
  }

  async getEquivalenceClass(id: string): Promise<EquivalenceClass | null> {
    const ec = this.equivalenceClasses.get(id);
    return ec ? { ...ec } : null;
  }

  async getEquivalenceClassByHash(compositeHash: string): Promise<EquivalenceClass | null> {
    const id = this.hashToClassId.get(compositeHash);
    if (!id) return null;
    return this.getEquivalenceClass(id);
  }

  async deleteEquivalenceClass(id: string): Promise<boolean> {
    const ec = this.equivalenceClasses.get(id);
    if (!ec) return false;

    this.hashToClassId.delete(ec.composite_hash);
    this.equivalenceClasses.delete(id);

    // Remove class association from loops
    const loopIds = this.byEquivalenceClass.get(id);
    if (loopIds) {
      for (const loopId of loopIds) {
        const loop = this.loops.get(loopId);
        if (loop) {
          loop.equivalence_class_id = null;
        }
      }
    }
    this.byEquivalenceClass.delete(id);

    return true;
  }

  async getAllEquivalenceClasses(): Promise<EquivalenceClass[]> {
    return Array.from(this.equivalenceClasses.values()).map(ec => ({ ...ec }));
  }

  async getEquivalenceClassCount(): Promise<number> {
    return this.equivalenceClasses.size;
  }

  // ============================================
  // Bulk Operations
  // ============================================

  async saveLoopsBatch(loops: Loop[]): Promise<void> {
    for (const loop of loops) {
      await this.saveLoop(loop);
    }
  }

  async clear(): Promise<void> {
    this.loops.clear();
    this.equivalenceClasses.clear();
    this.hashToClassId.clear();
    this.byEpoch.clear();
    this.byStatus.clear();
    this.byOutcomeType.clear();
    this.byTag.clear();
    this.byOperator.clear();
    this.byEquivalenceClass.clear();
    this.byParent.clear();
    this.anchors.clear();
    this.nextSequence = 1;
  }

  // ============================================
  // Statistics
  // ============================================

  async getStatistics(): Promise<LoopStoreStatistics> {
    const loopsByStatus: Record<string, number> = {};
    const loopsByEpoch: Record<string, number> = {};
    const loopsByOutcomeType: Record<string, number> = {};

    for (const [status, ids] of this.byStatus) {
      loopsByStatus[status] = ids.size;
    }

    for (const [epoch, ids] of this.byEpoch) {
      loopsByEpoch[epoch] = ids.size;
    }

    for (const [type, ids] of this.byOutcomeType) {
      loopsByOutcomeType[type] = ids.size;
    }

    const ecCount = this.equivalenceClasses.size;

    return {
      totalLoops: this.loops.size,
      loopsByStatus: loopsByStatus as Record<LoopStatus, number>,
      loopsByEpoch,
      loopsByOutcomeType: loopsByOutcomeType as Record<OutcomeType, number>,
      anchorLoopCount: this.anchors.size,
      equivalenceClassCount: ecCount,
      averageLoopsPerClass: ecCount > 0 ? this.loops.size / ecCount : 0,
    };
  }

  // ============================================
  // Index Helpers
  // ============================================

  private addToIndexes(loop: Loop): void {
    // By epoch
    if (!this.byEpoch.has(loop.epoch_id)) {
      this.byEpoch.set(loop.epoch_id, new Set());
    }
    this.byEpoch.get(loop.epoch_id)!.add(loop.id);

    // By status
    if (!this.byStatus.has(loop.status)) {
      this.byStatus.set(loop.status, new Set());
    }
    this.byStatus.get(loop.status)!.add(loop.id);

    // By outcome type
    if (!this.byOutcomeType.has(loop.outcome.type)) {
      this.byOutcomeType.set(loop.outcome.type, new Set());
    }
    this.byOutcomeType.get(loop.outcome.type)!.add(loop.id);

    // By tags
    for (const tag of loop.tags) {
      if (!this.byTag.has(tag)) {
        this.byTag.set(tag, new Set());
      }
      this.byTag.get(tag)!.add(loop.id);
    }

    // By operator
    if (loop.operator_used) {
      if (!this.byOperator.has(loop.operator_used)) {
        this.byOperator.set(loop.operator_used, new Set());
      }
      this.byOperator.get(loop.operator_used)!.add(loop.id);
    }

    // By equivalence class
    if (loop.equivalence_class_id) {
      if (!this.byEquivalenceClass.has(loop.equivalence_class_id)) {
        this.byEquivalenceClass.set(loop.equivalence_class_id, new Set());
      }
      this.byEquivalenceClass.get(loop.equivalence_class_id)!.add(loop.id);
    }

    // By parent
    if (loop.parent_id) {
      if (!this.byParent.has(loop.parent_id)) {
        this.byParent.set(loop.parent_id, new Set());
      }
      this.byParent.get(loop.parent_id)!.add(loop.id);
    }

    // Anchors
    if (loop.is_anchor) {
      this.anchors.add(loop.id);
    }
  }

  private removeFromIndexes(loop: Loop): void {
    this.byEpoch.get(loop.epoch_id)?.delete(loop.id);
    this.byStatus.get(loop.status)?.delete(loop.id);
    this.byOutcomeType.get(loop.outcome.type)?.delete(loop.id);

    for (const tag of loop.tags) {
      this.byTag.get(tag)?.delete(loop.id);
    }

    if (loop.operator_used) {
      this.byOperator.get(loop.operator_used)?.delete(loop.id);
    }

    if (loop.equivalence_class_id) {
      this.byEquivalenceClass.get(loop.equivalence_class_id)?.delete(loop.id);
    }

    if (loop.parent_id) {
      this.byParent.get(loop.parent_id)?.delete(loop.id);
    }

    this.anchors.delete(loop.id);
  }

  private getLoopsFromIndex(ids: Set<string> | undefined): Loop[] {
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.loops.get(id)!)
      .filter(Boolean)
      .map(l => ({ ...l }));
  }

  private intersect(
    a: Set<string> | null,
    b: Set<string> | undefined
  ): Set<string> | null {
    if (!b || b.size === 0) {
      return a === null ? null : new Set();
    }

    if (a === null) {
      return new Set(b);
    }

    const result = new Set<string>();
    for (const id of a) {
      if (b.has(id)) {
        result.add(id);
      }
    }
    return result;
  }
}
