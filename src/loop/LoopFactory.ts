/**
 * LoopFactory: Creates and manages loop lifecycle
 */

import { LoopStore } from './LoopStore';
import {
  Loop,
  Decision,
  Outcome,
  CreateLoopInput,
  CreateDecisionInput,
  CreateOutcomeInput,
  generateId,
  nowISO,
  LoopStatus,
} from './types';
import { createHash } from 'crypto';

/**
 * Factory for creating and completing loops
 */
export class LoopFactory {
  private store: LoopStore;

  constructor(store: LoopStore) {
    this.store = store;
  }

  /**
   * Create a new loop and start it
   */
  async createLoop(input: CreateLoopInput): Promise<Loop> {
    const sequenceNumber = await this.store.getNextSequenceNumber();

    const loop: Loop = {
      id: generateId(),
      sequence_number: sequenceNumber,
      parent_id: input.parent_id ?? null,
      epoch_id: input.epoch_id,
      graph_id: input.graph_id,
      status: 'in_progress',
      created_at: nowISO(),
      started_at: nowISO(),
      ended_at: null,
      duration_story_minutes: null,
      knowledge_state_start_id: input.knowledge_state_start_id,
      knowledge_state_end_id: null,
      emotional_state_start: input.emotional_state_start,
      emotional_state_end: null,
      decisions: [],
      decision_vector: [],
      path: [],
      outcome: {
        id: generateId(),
        type: 'partial', // Will be updated when loop completes
        terminal_node_id: '',
        timestamp: '',
      },
      sub_loops: [],
      equivalence_class_id: null,
      is_anchor: input.is_anchor ?? false,
      tags: input.tags ?? [],
      operator_used: input.operator_used ?? null,
      operator_target: input.operator_target ?? null,
      narrative_summary: null,
      notes: input.notes ?? null,
    };

    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Add a decision to an in-progress loop
   */
  async addDecision(loopId: string, input: CreateDecisionInput): Promise<Decision> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    if (loop.status !== 'in_progress') {
      throw new Error(`Cannot add decision to loop with status '${loop.status}'`);
    }

    const decision: Decision = {
      id: generateId(),
      node_id: input.node_id,
      choice_index: input.choice_index,
      choice_label: input.choice_label,
      timestamp: input.timestamp,
      confidence: input.confidence,
      rationale: input.rationale,
      influenced_by: input.influenced_by,
    };

    loop.decisions.push(decision);
    loop.decision_vector.push(input.choice_index);

    if (!loop.path) {
      loop.path = [];
    }
    if (!loop.path.includes(input.node_id)) {
      loop.path.push(input.node_id);
    }

    await this.store.saveLoop(loop);
    return decision;
  }

  /**
   * Complete a loop with an outcome
   */
  async completeLoop(
    loopId: string,
    outcomeInput: CreateOutcomeInput,
    options: {
      knowledge_state_end_id?: string;
      emotional_state_end?: Loop['emotional_state_end'];
      narrative_summary?: string;
    } = {}
  ): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    if (loop.status !== 'in_progress') {
      throw new Error(`Cannot complete loop with status '${loop.status}'`);
    }

    const outcome: Outcome = {
      id: generateId(),
      type: outcomeInput.type,
      terminal_node_id: outcomeInput.terminal_node_id,
      timestamp: outcomeInput.timestamp,
      cause: outcomeInput.cause,
      world_state_delta: outcomeInput.world_state_delta,
      characters_affected: outcomeInput.characters_affected,
      hash: this.computeOutcomeHash(outcomeInput),
    };

    // Add terminal node to path
    if (loop.path && !loop.path.includes(outcome.terminal_node_id)) {
      loop.path.push(outcome.terminal_node_id);
    }

    // Calculate duration
    const startTime = new Date(loop.started_at).getTime();
    const endTime = new Date(outcomeInput.timestamp).getTime();
    const durationMinutes = Math.floor((endTime - startTime) / 60000);

    loop.status = 'completed';
    loop.ended_at = outcomeInput.timestamp;
    loop.duration_story_minutes = durationMinutes;
    loop.outcome = outcome;
    loop.knowledge_state_end_id = options.knowledge_state_end_id ?? null;
    loop.emotional_state_end = options.emotional_state_end ?? null;
    loop.narrative_summary = options.narrative_summary ?? null;

    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Abort a loop (voluntary reset without meaningful outcome)
   */
  async abortLoop(
    loopId: string,
    reason?: string
  ): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    if (loop.status !== 'in_progress') {
      throw new Error(`Cannot abort loop with status '${loop.status}'`);
    }

    const now = nowISO();

    loop.status = 'aborted';
    loop.ended_at = now;
    loop.outcome = {
      id: generateId(),
      type: 'voluntary_reset',
      terminal_node_id: loop.path?.[loop.path.length - 1] ?? '',
      timestamp: now,
      cause: reason,
    };

    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Clone a loop as a starting point for a new loop (for relive/vary operators)
   */
  async cloneAsParent(
    sourceLoopId: string,
    overrides: Partial<CreateLoopInput> = {}
  ): Promise<Loop> {
    const source = await this.store.getLoop(sourceLoopId);

    if (!source) {
      throw new Error(`Source loop '${sourceLoopId}' not found`);
    }

    const input: CreateLoopInput = {
      epoch_id: overrides.epoch_id ?? source.epoch_id,
      graph_id: overrides.graph_id ?? source.graph_id,
      knowledge_state_start_id: overrides.knowledge_state_start_id ?? source.knowledge_state_start_id,
      emotional_state_start: overrides.emotional_state_start ?? source.emotional_state_start,
      parent_id: sourceLoopId,
      operator_used: overrides.operator_used ?? source.operator_used ?? undefined,
      operator_target: overrides.operator_target ?? sourceLoopId,
      is_anchor: overrides.is_anchor ?? false,
      tags: overrides.tags ?? [...source.tags],
      notes: overrides.notes,
    };

    return this.createLoop(input);
  }

  /**
   * Mark a loop as an anchor (important loop to fully narrate)
   */
  async markAsAnchor(loopId: string, isAnchor = true): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    loop.is_anchor = isAnchor;
    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Add tags to a loop
   */
  async addTags(loopId: string, tags: string[]): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    const existingTags = new Set(loop.tags);
    for (const tag of tags) {
      existingTags.add(tag);
    }
    loop.tags = Array.from(existingTags);

    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Remove tags from a loop
   */
  async removeTags(loopId: string, tags: string[]): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    const tagsToRemove = new Set(tags);
    loop.tags = loop.tags.filter(t => !tagsToRemove.has(t));

    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Update loop notes
   */
  async updateNotes(loopId: string, notes: string | null): Promise<Loop> {
    const loop = await this.store.getLoop(loopId);

    if (!loop) {
      throw new Error(`Loop '${loopId}' not found`);
    }

    loop.notes = notes;
    await this.store.saveLoop(loop);
    return loop;
  }

  /**
   * Compute hash for outcome (for equivalence class matching)
   */
  private computeOutcomeHash(outcome: CreateOutcomeInput): string {
    const canonical = JSON.stringify({
      type: outcome.type,
      terminal_node_id: outcome.terminal_node_id,
      cause: outcome.cause ?? null,
      world_state_delta: outcome.world_state_delta ?? null,
      characters_affected: outcome.characters_affected?.sort((a, b) =>
        a.character_id.localeCompare(b.character_id)
      ) ?? null,
    });

    return createHash('sha256').update(canonical).digest('hex');
  }
}
