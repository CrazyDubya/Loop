import { MemoryLoopStore } from '../../src/loop/MemoryLoopStore';
import { Loop, Outcome, Decision } from '../../src/loop/types';

describe('MemoryLoopStore', () => {
  let store: MemoryLoopStore;

  // Helper to create a test loop
  function createTestLoop(overrides: Partial<Loop> = {}): Loop {
    const id = overrides.id ?? `loop-${Math.random().toString(36).slice(2)}`;
    return {
      id,
      sequence_number: overrides.sequence_number ?? 1,
      parent_id: overrides.parent_id ?? null,
      epoch_id: overrides.epoch_id ?? 'epoch-1',
      graph_id: 'graph-1',
      status: overrides.status ?? 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      knowledge_state_end_id: 'ks-1',
      emotional_state_start: 'hopeful',
      emotional_state_end: 'frustrated',
      decisions: overrides.decisions ?? [],
      decision_vector: overrides.decision_vector ?? [0, 1, 0],
      path: ['node-1', 'node-2'],
      outcome: overrides.outcome ?? {
        id: 'outcome-1',
        type: 'death',
        terminal_node_id: 'node-death',
        timestamp: '2024-01-01T18:00:00Z',
      },
      sub_loops: [],
      equivalence_class_id: overrides.equivalence_class_id ?? null,
      is_anchor: overrides.is_anchor ?? false,
      tags: overrides.tags ?? [],
      operator_used: overrides.operator_used ?? null,
      operator_target: null,
      narrative_summary: null,
      notes: null,
    };
  }

  beforeEach(() => {
    store = new MemoryLoopStore();
  });

  describe('Loop CRUD', () => {
    it('should save and retrieve a loop', async () => {
      const loop = createTestLoop({ id: 'test-1' });
      await store.saveLoop(loop);

      const retrieved = await store.getLoop('test-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-1');
    });

    it('should return null for non-existent loop', async () => {
      const retrieved = await store.getLoop('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should delete a loop', async () => {
      const loop = createTestLoop({ id: 'to-delete' });
      await store.saveLoop(loop);

      const deleted = await store.deleteLoop('to-delete');
      expect(deleted).toBe(true);
      expect(await store.hasLoop('to-delete')).toBe(false);
    });

    it('should return false when deleting non-existent loop', async () => {
      const deleted = await store.deleteLoop('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should check if loop exists', async () => {
      const loop = createTestLoop({ id: 'exists' });
      await store.saveLoop(loop);

      expect(await store.hasLoop('exists')).toBe(true);
      expect(await store.hasLoop('not-exists')).toBe(false);
    });

    it('should count loops', async () => {
      expect(await store.getLoopCount()).toBe(0);

      await store.saveLoop(createTestLoop({ id: 'l1', sequence_number: 1 }));
      await store.saveLoop(createTestLoop({ id: 'l2', sequence_number: 2 }));

      expect(await store.getLoopCount()).toBe(2);
    });

    it('should update existing loop', async () => {
      const loop = createTestLoop({ id: 'update-me', is_anchor: false });
      await store.saveLoop(loop);

      loop.is_anchor = true;
      await store.saveLoop(loop);

      const retrieved = await store.getLoop('update-me');
      expect(retrieved?.is_anchor).toBe(true);
    });

    it('should get all loops', async () => {
      await store.saveLoop(createTestLoop({ id: 'l1', sequence_number: 1 }));
      await store.saveLoop(createTestLoop({ id: 'l2', sequence_number: 2 }));
      await store.saveLoop(createTestLoop({ id: 'l3', sequence_number: 3 }));

      const all = await store.getAllLoops();
      expect(all).toHaveLength(3);
    });
  });

  describe('Loop Queries', () => {
    beforeEach(async () => {
      // Set up test data
      await store.saveLoop(createTestLoop({
        id: 'l1',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        status: 'completed',
        tags: ['first', 'death'],
        operator_used: 'explore',
        is_anchor: true,
        outcome: { id: 'o1', type: 'death', terminal_node_id: 'n1', timestamp: '' },
      }));

      await store.saveLoop(createTestLoop({
        id: 'l2',
        sequence_number: 2,
        epoch_id: 'epoch-1',
        status: 'completed',
        tags: ['death'],
        operator_used: 'explore',
        outcome: { id: 'o2', type: 'death', terminal_node_id: 'n2', timestamp: '' },
      }));

      await store.saveLoop(createTestLoop({
        id: 'l3',
        sequence_number: 3,
        epoch_id: 'epoch-2',
        status: 'completed',
        tags: ['success'],
        operator_used: 'cause',
        outcome: { id: 'o3', type: 'success', terminal_node_id: 'n3', timestamp: '' },
      }));

      await store.saveLoop(createTestLoop({
        id: 'l4',
        sequence_number: 4,
        epoch_id: 'epoch-2',
        status: 'in_progress',
        outcome: { id: 'o4', type: 'partial', terminal_node_id: '', timestamp: '' },
      }));
    });

    it('should query by epoch', async () => {
      const result = await store.queryLoops({ epoch_id: 'epoch-1' });
      expect(result.loops).toHaveLength(2);
      expect(result.loops.every(l => l.epoch_id === 'epoch-1')).toBe(true);
    });

    it('should query by status', async () => {
      const result = await store.queryLoops({ status: 'completed' });
      expect(result.loops).toHaveLength(3);
    });

    it('should query by outcome type', async () => {
      const result = await store.queryLoops({ outcome_type: 'death' });
      expect(result.loops).toHaveLength(2);
    });

    it('should query by operator', async () => {
      const result = await store.queryLoops({ operator_used: 'explore' });
      expect(result.loops).toHaveLength(2);
    });

    it('should query anchors only', async () => {
      const result = await store.queryLoops({ is_anchor: true });
      expect(result.loops).toHaveLength(1);
      expect(result.loops[0].id).toBe('l1');
    });

    it('should query by tags (all match)', async () => {
      const result = await store.queryLoops({
        tags: ['first', 'death'],
        tags_match: 'all',
      });
      expect(result.loops).toHaveLength(1);
      expect(result.loops[0].id).toBe('l1');
    });

    it('should query by tags (any match)', async () => {
      const result = await store.queryLoops({
        tags: ['first', 'success'],
        tags_match: 'any',
      });
      expect(result.loops).toHaveLength(2);
    });

    it('should combine multiple filters', async () => {
      const result = await store.queryLoops({
        epoch_id: 'epoch-1',
        status: 'completed',
        operator_used: 'explore',
      });
      expect(result.loops).toHaveLength(2);
    });

    it('should apply limit and offset', async () => {
      const result = await store.queryLoops({ limit: 2, offset: 1 });
      expect(result.loops).toHaveLength(2);
      expect(result.loops[0].sequence_number).toBe(2);
      expect(result.total).toBe(4);
      expect(result.hasMore).toBe(true);
    });

    it('should query by sequence range', async () => {
      const result = await store.queryLoops({
        sequence_range: { min: 2, max: 3 },
      });
      expect(result.loops).toHaveLength(2);
      expect(result.loops.map(l => l.sequence_number).sort()).toEqual([2, 3]);
    });
  });

  describe('Specialized Queries', () => {
    beforeEach(async () => {
      await store.saveLoop(createTestLoop({ id: 'p1', sequence_number: 1 }));
      await store.saveLoop(createTestLoop({ id: 'c1', sequence_number: 2, parent_id: 'p1' }));
      await store.saveLoop(createTestLoop({ id: 'c2', sequence_number: 3, parent_id: 'p1' }));
      await store.saveLoop(createTestLoop({ id: 'gc1', sequence_number: 4, parent_id: 'c1' }));
    });

    it('should get loop ancestry', async () => {
      const ancestry = await store.getLoopAncestry('gc1');
      expect(ancestry).toHaveLength(3);
      expect(ancestry.map(l => l.id)).toEqual(['gc1', 'c1', 'p1']);
    });

    it('should get loop descendants', async () => {
      const descendants = await store.getLoopDescendants('p1');
      expect(descendants).toHaveLength(3);
      expect(descendants.map(l => l.id).sort()).toEqual(['c1', 'c2', 'gc1']);
    });

    it('should get next sequence number', async () => {
      const next = await store.getNextSequenceNumber();
      expect(next).toBe(5);
    });
  });

  describe('Equivalence Classes', () => {
    it('should save and retrieve equivalence class', async () => {
      const ec = {
        id: 'ec-1',
        outcome_hash: 'hash1',
        knowledge_end_hash: 'hash2',
        composite_hash: 'composite1',
        representative_loop_id: 'loop-1',
        sample_loop_ids: ['loop-1'],
        member_count: 1,
        epoch_distribution: { 'epoch-1': 1 },
        outcome_summary: 'Death by explosion',
        knowledge_delta_summary: 'Learned nothing',
        common_tags: ['death'],
        first_occurrence_loop_id: 'loop-1',
        last_occurrence_loop_id: 'loop-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      await store.saveEquivalenceClass(ec);

      const retrieved = await store.getEquivalenceClass('ec-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('ec-1');
    });

    it('should get equivalence class by hash', async () => {
      const ec = {
        id: 'ec-1',
        outcome_hash: 'hash1',
        knowledge_end_hash: 'hash2',
        composite_hash: 'unique-composite',
        representative_loop_id: 'loop-1',
        sample_loop_ids: ['loop-1'],
        member_count: 1,
        epoch_distribution: {},
        outcome_summary: '',
        knowledge_delta_summary: '',
        common_tags: [],
        first_occurrence_loop_id: 'loop-1',
        last_occurrence_loop_id: 'loop-1',
        created_at: '',
        updated_at: '',
      };

      await store.saveEquivalenceClass(ec);

      const retrieved = await store.getEquivalenceClassByHash('unique-composite');
      expect(retrieved?.id).toBe('ec-1');
    });

    it('should get loops in equivalence class', async () => {
      await store.saveLoop(createTestLoop({ id: 'l1', sequence_number: 1, equivalence_class_id: 'ec-1' }));
      await store.saveLoop(createTestLoop({ id: 'l2', sequence_number: 2, equivalence_class_id: 'ec-1' }));
      await store.saveLoop(createTestLoop({ id: 'l3', sequence_number: 3, equivalence_class_id: 'ec-2' }));

      const loops = await store.getLoopsInEquivalenceClass('ec-1');
      expect(loops).toHaveLength(2);
    });
  });

  describe('Bulk Operations', () => {
    it('should save loops in batch', async () => {
      const loops = [
        createTestLoop({ id: 'b1', sequence_number: 1 }),
        createTestLoop({ id: 'b2', sequence_number: 2 }),
        createTestLoop({ id: 'b3', sequence_number: 3 }),
      ];

      await store.saveLoopsBatch(loops);

      expect(await store.getLoopCount()).toBe(3);
    });

    it('should clear all data', async () => {
      await store.saveLoop(createTestLoop({ id: 'l1', sequence_number: 1 }));
      await store.saveLoop(createTestLoop({ id: 'l2', sequence_number: 2 }));

      await store.clear();

      expect(await store.getLoopCount()).toBe(0);
      expect(await store.getNextSequenceNumber()).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should compute statistics', async () => {
      await store.saveLoop(createTestLoop({
        id: 'l1',
        sequence_number: 1,
        epoch_id: 'e1',
        status: 'completed',
        is_anchor: true,
        outcome: { id: 'o1', type: 'death', terminal_node_id: 'n1', timestamp: '' },
      }));

      await store.saveLoop(createTestLoop({
        id: 'l2',
        sequence_number: 2,
        epoch_id: 'e1',
        status: 'completed',
        outcome: { id: 'o2', type: 'success', terminal_node_id: 'n2', timestamp: '' },
      }));

      await store.saveLoop(createTestLoop({
        id: 'l3',
        sequence_number: 3,
        epoch_id: 'e2',
        status: 'in_progress',
      }));

      const stats = await store.getStatistics();

      expect(stats.totalLoops).toBe(3);
      expect(stats.loopsByStatus.completed).toBe(2);
      expect(stats.loopsByStatus.in_progress).toBe(1);
      expect(stats.loopsByEpoch['e1']).toBe(2);
      expect(stats.loopsByEpoch['e2']).toBe(1);
      expect(stats.anchorLoopCount).toBe(1);
    });
  });
});
