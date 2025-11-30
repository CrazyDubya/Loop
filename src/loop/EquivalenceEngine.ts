/**
 * EquivalenceEngine: Groups loops into equivalence classes
 *
 * Two loops are equivalent if they have:
 * - Same outcome hash (same end state)
 * - Same knowledge end hash (same knowledge gained)
 */

import { LoopStore } from './LoopStore';
import {
  Loop,
  EquivalenceClass,
  generateId,
  nowISO,
} from './types';
import { createHash } from 'crypto';

export class EquivalenceEngine {
  private store: LoopStore;

  constructor(store: LoopStore) {
    this.store = store;
  }

  /**
   * Compute the composite hash for a loop
   */
  computeCompositeHash(loop: Loop): string {
    const outcomeHash = loop.outcome.hash ?? this.computeOutcomeHash(loop);
    const knowledgeHash = this.computeKnowledgeHash(loop);

    return createHash('sha256')
      .update(outcomeHash + knowledgeHash)
      .digest('hex');
  }

  /**
   * Assign a loop to its equivalence class (create if needed)
   */
  async assignToClass(loop: Loop): Promise<EquivalenceClass> {
    if (loop.status !== 'completed') {
      throw new Error('Can only assign completed loops to equivalence classes');
    }

    const compositeHash = this.computeCompositeHash(loop);

    // Check if class already exists
    let ec = await this.store.getEquivalenceClassByHash(compositeHash);

    if (ec) {
      // Update existing class
      ec = await this.addLoopToClass(ec, loop);
    } else {
      // Create new class
      ec = await this.createClass(loop, compositeHash);
    }

    // Update loop with class assignment
    loop.equivalence_class_id = ec.id;
    await this.store.saveLoop(loop);

    return ec;
  }

  /**
   * Process all unassigned loops
   */
  async processUnassignedLoops(): Promise<{
    processed: number;
    newClasses: number;
    existingClasses: number;
  }> {
    const loops = await this.store.getAllLoops();
    const completedUnassigned = loops.filter(
      l => l.status === 'completed' && !l.equivalence_class_id
    );

    let newClasses = 0;
    let existingClasses = 0;

    for (const loop of completedUnassigned) {
      const compositeHash = this.computeCompositeHash(loop);
      const existing = await this.store.getEquivalenceClassByHash(compositeHash);

      if (existing) {
        await this.addLoopToClass(existing, loop);
        existingClasses++;
      } else {
        await this.createClass(loop, compositeHash);
        newClasses++;
      }
    }

    return {
      processed: completedUnassigned.length,
      newClasses,
      existingClasses,
    };
  }

  /**
   * Recalculate all equivalence classes from scratch
   */
  async rebuildAllClasses(): Promise<{
    loopsProcessed: number;
    classesCreated: number;
  }> {
    // Clear existing classes
    const existingClasses = await this.store.getAllEquivalenceClasses();
    for (const ec of existingClasses) {
      await this.store.deleteEquivalenceClass(ec.id);
    }

    // Clear class assignments from loops
    const loops = await this.store.getAllLoops();
    for (const loop of loops) {
      if (loop.equivalence_class_id) {
        loop.equivalence_class_id = null;
        await this.store.saveLoop(loop);
      }
    }

    // Rebuild
    const result = await this.processUnassignedLoops();

    return {
      loopsProcessed: result.processed,
      classesCreated: result.newClasses,
    };
  }

  /**
   * Get class statistics
   */
  async getClassStatistics(): Promise<{
    totalClasses: number;
    totalLoops: number;
    largestClass: { id: string; count: number } | null;
    smallestClass: { id: string; count: number } | null;
    averageLoopsPerClass: number;
    singletonClasses: number;
  }> {
    const classes = await this.store.getAllEquivalenceClasses();

    if (classes.length === 0) {
      return {
        totalClasses: 0,
        totalLoops: 0,
        largestClass: null,
        smallestClass: null,
        averageLoopsPerClass: 0,
        singletonClasses: 0,
      };
    }

    let largest = classes[0];
    let smallest = classes[0];
    let totalLoops = 0;
    let singletons = 0;

    for (const ec of classes) {
      totalLoops += ec.member_count;

      if (ec.member_count > largest.member_count) {
        largest = ec;
      }
      if (ec.member_count < smallest.member_count) {
        smallest = ec;
      }
      if (ec.member_count === 1) {
        singletons++;
      }
    }

    return {
      totalClasses: classes.length,
      totalLoops,
      largestClass: { id: largest.id, count: largest.member_count },
      smallestClass: { id: smallest.id, count: smallest.member_count },
      averageLoopsPerClass: totalLoops / classes.length,
      singletonClasses: singletons,
    };
  }

  /**
   * Find similar classes (by outcome type)
   */
  async findSimilarClasses(classId: string): Promise<EquivalenceClass[]> {
    const targetClass = await this.store.getEquivalenceClass(classId);
    if (!targetClass) return [];

    const allClasses = await this.store.getAllEquivalenceClasses();

    // Get a loop from target class to check outcome type
    const targetLoops = await this.store.getLoopsInEquivalenceClass(classId);
    if (targetLoops.length === 0) return [];

    const targetOutcomeType = targetLoops[0].outcome.type;

    // Find classes with same outcome type
    const similar: EquivalenceClass[] = [];

    for (const ec of allClasses) {
      if (ec.id === classId) continue;

      const loops = await this.store.getLoopsInEquivalenceClass(ec.id);
      if (loops.length > 0 && loops[0].outcome.type === targetOutcomeType) {
        similar.push(ec);
      }
    }

    return similar;
  }

  /**
   * Compute decision vector distance (Hamming) between two loops
   */
  computeDecisionDistance(loop1: Loop, loop2: Loop): number {
    const v1 = loop1.decision_vector;
    const v2 = loop2.decision_vector;

    const maxLen = Math.max(v1.length, v2.length);
    let distance = 0;

    for (let i = 0; i < maxLen; i++) {
      const val1 = v1[i] ?? -1;
      const val2 = v2[i] ?? -1;
      if (val1 !== val2) {
        distance++;
      }
    }

    return distance;
  }

  /**
   * Find loops most similar to a given loop (by decision vector)
   */
  async findSimilarLoops(loopId: string, limit = 10): Promise<Array<{ loop: Loop; distance: number }>> {
    const targetLoop = await this.store.getLoop(loopId);
    if (!targetLoop) return [];

    const allLoops = await this.store.getAllLoops();
    const distances: Array<{ loop: Loop; distance: number }> = [];

    for (const loop of allLoops) {
      if (loop.id === loopId) continue;
      if (loop.status !== 'completed') continue;

      const distance = this.computeDecisionDistance(targetLoop, loop);
      distances.push({ loop, distance });
    }

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, limit);
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async createClass(loop: Loop, compositeHash: string): Promise<EquivalenceClass> {
    const now = nowISO();

    const ec: EquivalenceClass = {
      id: generateId(),
      outcome_hash: loop.outcome.hash ?? this.computeOutcomeHash(loop),
      knowledge_end_hash: this.computeKnowledgeHash(loop),
      composite_hash: compositeHash,
      representative_loop_id: loop.id,
      sample_loop_ids: [loop.id],
      member_count: 1,
      epoch_distribution: { [loop.epoch_id]: 1 },
      outcome_summary: this.generateOutcomeSummary(loop),
      knowledge_delta_summary: this.generateKnowledgeSummary(loop),
      common_tags: [...loop.tags],
      decision_vector_centroid: [...loop.decision_vector],
      decision_vector_variance: 0,
      first_occurrence_loop_id: loop.id,
      last_occurrence_loop_id: loop.id,
      created_at: now,
      updated_at: now,
    };

    await this.store.saveEquivalenceClass(ec);

    loop.equivalence_class_id = ec.id;
    await this.store.saveLoop(loop);

    return ec;
  }

  private async addLoopToClass(ec: EquivalenceClass, loop: Loop): Promise<EquivalenceClass> {
    // Update member count
    ec.member_count++;

    // Update epoch distribution
    ec.epoch_distribution[loop.epoch_id] = (ec.epoch_distribution[loop.epoch_id] || 0) + 1;

    // Update sample loops (keep max 5)
    if (ec.sample_loop_ids.length < 5 && !ec.sample_loop_ids.includes(loop.id)) {
      ec.sample_loop_ids.push(loop.id);
    }

    // Update last occurrence
    ec.last_occurrence_loop_id = loop.id;

    // Update common tags (intersection)
    const loopTagSet = new Set(loop.tags);
    ec.common_tags = ec.common_tags.filter(t => loopTagSet.has(t));

    // Update decision vector centroid and variance
    if (ec.decision_vector_centroid) {
      ec.decision_vector_centroid = this.updateCentroid(
        ec.decision_vector_centroid,
        loop.decision_vector,
        ec.member_count
      );
      ec.decision_vector_variance = this.computeVariance(ec, loop);
    }

    ec.updated_at = nowISO();

    await this.store.saveEquivalenceClass(ec);

    loop.equivalence_class_id = ec.id;
    await this.store.saveLoop(loop);

    return ec;
  }

  private computeOutcomeHash(loop: Loop): string {
    const canonical = JSON.stringify({
      type: loop.outcome.type,
      terminal_node_id: loop.outcome.terminal_node_id,
      cause: loop.outcome.cause ?? null,
      world_state_delta: loop.outcome.world_state_delta ?? null,
      characters_affected: loop.outcome.characters_affected?.sort((a, b) =>
        a.character_id.localeCompare(b.character_id)
      ) ?? null,
    });

    return createHash('sha256').update(canonical).digest('hex');
  }

  private computeKnowledgeHash(loop: Loop): string {
    // For now, hash the knowledge state end ID
    // In a full implementation, this would hash the actual knowledge delta
    const value = loop.knowledge_state_end_id ?? 'none';
    return createHash('sha256').update(value).digest('hex');
  }

  private generateOutcomeSummary(loop: Loop): string {
    const outcome = loop.outcome;
    let summary = `${outcome.type}`;

    if (outcome.cause) {
      summary += `: ${outcome.cause}`;
    }

    if (outcome.terminal_node_id) {
      summary += ` at ${outcome.terminal_node_id}`;
    }

    return summary;
  }

  private generateKnowledgeSummary(loop: Loop): string {
    if (!loop.knowledge_state_end_id) {
      return 'No knowledge gained';
    }
    return `Knowledge state: ${loop.knowledge_state_end_id}`;
  }

  private updateCentroid(current: number[], newVector: number[], count: number): number[] {
    const maxLen = Math.max(current.length, newVector.length);
    const result: number[] = [];

    for (let i = 0; i < maxLen; i++) {
      const currVal = current[i] ?? 0;
      const newVal = newVector[i] ?? 0;
      // Running average
      result[i] = currVal + (newVal - currVal) / count;
    }

    return result;
  }

  private computeVariance(ec: EquivalenceClass, loop: Loop): number {
    if (!ec.decision_vector_centroid) return 0;

    const distance = this.computeDecisionDistance(
      { decision_vector: ec.decision_vector_centroid } as Loop,
      loop
    );

    // Simple incremental variance approximation
    const oldVar = ec.decision_vector_variance ?? 0;
    return oldVar + (distance * distance - oldVar) / ec.member_count;
  }
}
