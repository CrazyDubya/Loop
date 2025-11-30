import { LoopFactory } from '../../src/loop/LoopFactory';
import { MemoryLoopStore } from '../../src/loop/MemoryLoopStore';
import { CreateLoopInput, CreateDecisionInput, CreateOutcomeInput } from '../../src/loop/types';

describe('LoopFactory', () => {
  let store: MemoryLoopStore;
  let factory: LoopFactory;

  beforeEach(() => {
    store = new MemoryLoopStore();
    factory = new LoopFactory(store);
  });

  describe('createLoop', () => {
    it('should create a new loop', async () => {
      const input: CreateLoopInput = {
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      };

      const loop = await factory.createLoop(input);

      expect(loop.id).toBeDefined();
      expect(loop.sequence_number).toBe(1);
      expect(loop.status).toBe('in_progress');
      expect(loop.epoch_id).toBe('epoch-1');
      expect(loop.decisions).toHaveLength(0);
    });

    it('should increment sequence numbers', async () => {
      const input: CreateLoopInput = {
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      };

      const loop1 = await factory.createLoop(input);
      const loop2 = await factory.createLoop(input);
      const loop3 = await factory.createLoop(input);

      expect(loop1.sequence_number).toBe(1);
      expect(loop2.sequence_number).toBe(2);
      expect(loop3.sequence_number).toBe(3);
    });

    it('should set optional fields', async () => {
      const input: CreateLoopInput = {
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        parent_id: 'parent-loop',
        operator_used: 'cause',
        operator_target: 'event-x',
        is_anchor: true,
        tags: ['important', 'breakthrough'],
        notes: 'Test notes',
      };

      const loop = await factory.createLoop(input);

      expect(loop.parent_id).toBe('parent-loop');
      expect(loop.operator_used).toBe('cause');
      expect(loop.operator_target).toBe('event-x');
      expect(loop.is_anchor).toBe(true);
      expect(loop.tags).toEqual(['important', 'breakthrough']);
      expect(loop.notes).toBe('Test notes');
    });
  });

  describe('addDecision', () => {
    it('should add a decision to an in-progress loop', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      const decisionInput: CreateDecisionInput = {
        node_id: 'node-1',
        choice_index: 2,
        choice_label: 'Go left',
        timestamp: '2024-01-01T08:00:00Z',
        confidence: 0.7,
        rationale: 'Seemed like the right choice',
      };

      const decision = await factory.addDecision(loop.id, decisionInput);

      expect(decision.id).toBeDefined();
      expect(decision.node_id).toBe('node-1');
      expect(decision.choice_index).toBe(2);

      const updated = await store.getLoop(loop.id);
      expect(updated?.decisions).toHaveLength(1);
      expect(updated?.decision_vector).toEqual([2]);
      expect(updated?.path).toContain('node-1');
    });

    it('should add multiple decisions', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      await factory.addDecision(loop.id, {
        node_id: 'node-1',
        choice_index: 0,
        timestamp: '2024-01-01T08:00:00Z',
      });

      await factory.addDecision(loop.id, {
        node_id: 'node-2',
        choice_index: 1,
        timestamp: '2024-01-01T09:00:00Z',
      });

      await factory.addDecision(loop.id, {
        node_id: 'node-3',
        choice_index: 2,
        timestamp: '2024-01-01T10:00:00Z',
      });

      const updated = await store.getLoop(loop.id);
      expect(updated?.decisions).toHaveLength(3);
      expect(updated?.decision_vector).toEqual([0, 1, 2]);
    });

    it('should throw for non-existent loop', async () => {
      await expect(factory.addDecision('nonexistent', {
        node_id: 'node-1',
        choice_index: 0,
        timestamp: '2024-01-01T08:00:00Z',
      })).rejects.toThrow(/not found/);
    });

    it('should throw for completed loop', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      await factory.completeLoop(loop.id, {
        type: 'death',
        terminal_node_id: 'death-node',
        timestamp: '2024-01-01T18:00:00Z',
      });

      await expect(factory.addDecision(loop.id, {
        node_id: 'node-1',
        choice_index: 0,
        timestamp: '2024-01-01T08:00:00Z',
      })).rejects.toThrow(/Cannot add decision/);
    });
  });

  describe('completeLoop', () => {
    it('should complete a loop with outcome', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      // Use a timestamp after the loop start
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();

      const outcomeInput: CreateOutcomeInput = {
        type: 'death',
        terminal_node_id: 'death-node',
        timestamp: futureTimestamp,
        cause: 'Explosion at bank',
        world_state_delta: { bank_exploded: true },
        characters_affected: [{ character_id: 'sister', state: 'dead' }],
      };

      const completed = await factory.completeLoop(loop.id, outcomeInput, {
        knowledge_state_end_id: 'ks-1',
        emotional_state_end: 'frustrated',
        narrative_summary: 'Died in explosion',
      });

      expect(completed.status).toBe('completed');
      expect(completed.outcome.type).toBe('death');
      expect(completed.outcome.hash).toBeDefined();
      expect(completed.knowledge_state_end_id).toBe('ks-1');
      expect(completed.emotional_state_end).toBe('frustrated');
      expect(completed.narrative_summary).toBe('Died in explosion');
      expect(completed.duration_story_minutes).toBeGreaterThanOrEqual(0);
    });

    it('should add terminal node to path', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      await factory.addDecision(loop.id, {
        node_id: 'node-1',
        choice_index: 0,
        timestamp: '2024-01-01T08:00:00Z',
      });

      const completed = await factory.completeLoop(loop.id, {
        type: 'death',
        terminal_node_id: 'death-node',
        timestamp: '2024-01-01T18:00:00Z',
      });

      expect(completed.path).toContain('death-node');
    });

    it('should throw for non-existent loop', async () => {
      await expect(factory.completeLoop('nonexistent', {
        type: 'death',
        terminal_node_id: 'death-node',
        timestamp: '2024-01-01T18:00:00Z',
      })).rejects.toThrow(/not found/);
    });
  });

  describe('abortLoop', () => {
    it('should abort a loop', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      const aborted = await factory.abortLoop(loop.id, 'Gave up');

      expect(aborted.status).toBe('aborted');
      expect(aborted.outcome.type).toBe('voluntary_reset');
      expect(aborted.outcome.cause).toBe('Gave up');
    });
  });

  describe('cloneAsParent', () => {
    it('should clone a loop as parent for new loop', async () => {
      const original = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        tags: ['original', 'test'],
      });

      await factory.completeLoop(original.id, {
        type: 'death',
        terminal_node_id: 'death-node',
        timestamp: '2024-01-01T18:00:00Z',
      });

      const clone = await factory.cloneAsParent(original.id, {
        operator_used: 'relive',
      });

      expect(clone.parent_id).toBe(original.id);
      expect(clone.epoch_id).toBe(original.epoch_id);
      expect(clone.graph_id).toBe(original.graph_id);
      expect(clone.operator_used).toBe('relive');
      expect(clone.operator_target).toBe(original.id);
      expect(clone.tags).toEqual(['original', 'test']);
      expect(clone.status).toBe('in_progress');
    });
  });

  describe('markAsAnchor', () => {
    it('should mark a loop as anchor', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      expect(loop.is_anchor).toBe(false);

      const updated = await factory.markAsAnchor(loop.id, true);
      expect(updated.is_anchor).toBe(true);

      const unmarked = await factory.markAsAnchor(loop.id, false);
      expect(unmarked.is_anchor).toBe(false);
    });
  });

  describe('tag management', () => {
    it('should add tags', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        tags: ['existing'],
      });

      const updated = await factory.addTags(loop.id, ['new1', 'new2']);
      expect(updated.tags).toContain('existing');
      expect(updated.tags).toContain('new1');
      expect(updated.tags).toContain('new2');
    });

    it('should not duplicate tags', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        tags: ['existing'],
      });

      const updated = await factory.addTags(loop.id, ['existing', 'new']);
      expect(updated.tags.filter(t => t === 'existing')).toHaveLength(1);
    });

    it('should remove tags', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        tags: ['keep', 'remove1', 'remove2'],
      });

      const updated = await factory.removeTags(loop.id, ['remove1', 'remove2']);
      expect(updated.tags).toEqual(['keep']);
    });
  });
});
