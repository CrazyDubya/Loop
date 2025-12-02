import { EquivalenceEngine } from '../../src/loop/EquivalenceEngine';
import { LoopFactory } from '../../src/loop/LoopFactory';
import { MemoryLoopStore } from '../../src/loop/MemoryLoopStore';
import { Loop } from '../../src/loop/types';

describe('EquivalenceEngine', () => {
  let store: MemoryLoopStore;
  let factory: LoopFactory;
  let engine: EquivalenceEngine;

  beforeEach(() => {
    store = new MemoryLoopStore();
    factory = new LoopFactory(store);
    engine = new EquivalenceEngine(store);
  });

  async function createCompletedLoop(overrides: {
    outcomeType?: 'death' | 'success' | 'failure';
    terminalNode?: string;
    cause?: string;
    knowledgeEnd?: string;
    tags?: string[];
    decisionVector?: number[];
  } = {}): Promise<Loop> {
    const loop = await factory.createLoop({
      epoch_id: 'epoch-1',
      graph_id: 'graph-1',
      knowledge_state_start_id: 'ks-0',
      emotional_state_start: 'hopeful',
      tags: overrides.tags,
    });

    // Add decisions to set decision vector
    if (overrides.decisionVector) {
      for (let i = 0; i < overrides.decisionVector.length; i++) {
        await factory.addDecision(loop.id, {
          node_id: `node-${i}`,
          choice_index: overrides.decisionVector[i],
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
        });
      }
    }

    return factory.completeLoop(loop.id, {
      type: overrides.outcomeType ?? 'death',
      terminal_node_id: overrides.terminalNode ?? 'death-node',
      timestamp: new Date().toISOString(),
      cause: overrides.cause ?? 'Explosion',
    }, {
      knowledge_state_end_id: overrides.knowledgeEnd ?? 'ks-1',
    });
  }

  describe('computeCompositeHash', () => {
    it('should compute same hash for equivalent loops', async () => {
      const loop1 = await createCompletedLoop({
        outcomeType: 'death',
        terminalNode: 'explosion',
        cause: 'Bomb',
        knowledgeEnd: 'ks-learned-code',
      });

      const loop2 = await createCompletedLoop({
        outcomeType: 'death',
        terminalNode: 'explosion',
        cause: 'Bomb',
        knowledgeEnd: 'ks-learned-code',
      });

      const hash1 = engine.computeCompositeHash(loop1);
      const hash2 = engine.computeCompositeHash(loop2);

      expect(hash1).toBe(hash2);
    });

    it('should compute different hash for different outcomes', async () => {
      const loop1 = await createCompletedLoop({
        outcomeType: 'death',
        terminalNode: 'explosion',
      });

      const loop2 = await createCompletedLoop({
        outcomeType: 'success',
        terminalNode: 'escape',
      });

      const hash1 = engine.computeCompositeHash(loop1);
      const hash2 = engine.computeCompositeHash(loop2);

      expect(hash1).not.toBe(hash2);
    });

    it('should compute different hash for different knowledge', async () => {
      const loop1 = await createCompletedLoop({
        knowledgeEnd: 'ks-1',
      });

      const loop2 = await createCompletedLoop({
        knowledgeEnd: 'ks-2',
      });

      const hash1 = engine.computeCompositeHash(loop1);
      const hash2 = engine.computeCompositeHash(loop2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('assignToClass', () => {
    it('should create new class for first loop', async () => {
      const loop = await createCompletedLoop();

      const ec = await engine.assignToClass(loop);

      expect(ec.id).toBeDefined();
      expect(ec.member_count).toBe(1);
      expect(ec.representative_loop_id).toBe(loop.id);
      expect(ec.sample_loop_ids).toContain(loop.id);
    });

    it('should add to existing class for equivalent loops', async () => {
      const loop1 = await createCompletedLoop({
        outcomeType: 'death',
        terminalNode: 'explosion',
        cause: 'Bomb',
        knowledgeEnd: 'ks-1',
      });

      const loop2 = await createCompletedLoop({
        outcomeType: 'death',
        terminalNode: 'explosion',
        cause: 'Bomb',
        knowledgeEnd: 'ks-1',
      });

      const ec1 = await engine.assignToClass(loop1);
      const ec2 = await engine.assignToClass(loop2);

      expect(ec1.id).toBe(ec2.id);
      expect(ec2.member_count).toBe(2);
    });

    it('should create separate classes for different outcomes', async () => {
      const loop1 = await createCompletedLoop({ outcomeType: 'death' });
      const loop2 = await createCompletedLoop({ outcomeType: 'success' });

      const ec1 = await engine.assignToClass(loop1);
      const ec2 = await engine.assignToClass(loop2);

      expect(ec1.id).not.toBe(ec2.id);
    });

    it('should throw for in-progress loop', async () => {
      const loop = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      await expect(engine.assignToClass(loop)).rejects.toThrow(/completed loops/);
    });

    it('should update epoch distribution', async () => {
      const loop1 = await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });
      await factory.completeLoop(loop1.id, {
        type: 'death',
        terminal_node_id: 'death',
        timestamp: new Date().toISOString(),
      }, { knowledge_state_end_id: 'ks-1' });
      const completed1 = await store.getLoop(loop1.id);

      const loop2 = await factory.createLoop({
        epoch_id: 'epoch-2',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });
      await factory.completeLoop(loop2.id, {
        type: 'death',
        terminal_node_id: 'death',
        timestamp: new Date().toISOString(),
      }, { knowledge_state_end_id: 'ks-1' });
      const completed2 = await store.getLoop(loop2.id);

      await engine.assignToClass(completed1!);
      const ec = await engine.assignToClass(completed2!);

      expect(ec.epoch_distribution['epoch-1']).toBe(1);
      expect(ec.epoch_distribution['epoch-2']).toBe(1);
    });

    it('should track common tags', async () => {
      const loop1 = await createCompletedLoop({ tags: ['death', 'explosion', 'bank'] });
      const loop2 = await createCompletedLoop({ tags: ['death', 'explosion', 'morning'] });

      await engine.assignToClass(loop1);
      const ec = await engine.assignToClass(loop2);

      expect(ec.common_tags).toContain('death');
      expect(ec.common_tags).toContain('explosion');
      expect(ec.common_tags).not.toContain('bank');
      expect(ec.common_tags).not.toContain('morning');
    });
  });

  describe('processUnassignedLoops', () => {
    it('should process all unassigned completed loops', async () => {
      await createCompletedLoop({ outcomeType: 'death', knowledgeEnd: 'ks-1' });
      await createCompletedLoop({ outcomeType: 'death', knowledgeEnd: 'ks-1' });
      await createCompletedLoop({ outcomeType: 'success', knowledgeEnd: 'ks-2' });

      const result = await engine.processUnassignedLoops();

      expect(result.processed).toBe(3);
      expect(result.newClasses).toBe(2); // death+ks1, success+ks2
      expect(result.existingClasses).toBe(1); // second death+ks1
    });

    it('should skip in-progress loops', async () => {
      await factory.createLoop({
        epoch_id: 'epoch-1',
        graph_id: 'graph-1',
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
      });

      const result = await engine.processUnassignedLoops();

      expect(result.processed).toBe(0);
    });
  });

  describe('rebuildAllClasses', () => {
    it('should rebuild all classes from scratch', async () => {
      const loop1 = await createCompletedLoop();
      const loop2 = await createCompletedLoop();

      await engine.assignToClass(loop1);
      await engine.assignToClass(loop2);

      const result = await engine.rebuildAllClasses();

      expect(result.loopsProcessed).toBe(2);
      expect(result.classesCreated).toBe(1);
    });
  });

  describe('getClassStatistics', () => {
    it('should compute class statistics', async () => {
      // Create 3 loops in same class
      await createCompletedLoop({ knowledgeEnd: 'ks-1' });
      await createCompletedLoop({ knowledgeEnd: 'ks-1' });
      await createCompletedLoop({ knowledgeEnd: 'ks-1' });

      // Create 1 loop in different class
      await createCompletedLoop({ knowledgeEnd: 'ks-2' });

      await engine.processUnassignedLoops();

      const stats = await engine.getClassStatistics();

      expect(stats.totalClasses).toBe(2);
      expect(stats.totalLoops).toBe(4);
      expect(stats.largestClass?.count).toBe(3);
      expect(stats.smallestClass?.count).toBe(1);
      expect(stats.averageLoopsPerClass).toBe(2);
      expect(stats.singletonClasses).toBe(1);
    });

    it('should handle empty store', async () => {
      const stats = await engine.getClassStatistics();

      expect(stats.totalClasses).toBe(0);
      expect(stats.totalLoops).toBe(0);
      expect(stats.largestClass).toBeNull();
    });
  });

  describe('computeDecisionDistance', () => {
    it('should compute Hamming distance', async () => {
      const loop1 = await createCompletedLoop({ decisionVector: [0, 1, 0, 1] });
      const loop2 = await createCompletedLoop({ decisionVector: [0, 0, 0, 1] });

      const distance = engine.computeDecisionDistance(loop1, loop2);

      expect(distance).toBe(1); // Only position 1 differs
    });

    it('should handle different length vectors', async () => {
      const loop1 = await createCompletedLoop({ decisionVector: [0, 1] });
      const loop2 = await createCompletedLoop({ decisionVector: [0, 1, 2, 3] });

      const distance = engine.computeDecisionDistance(loop1, loop2);

      expect(distance).toBe(2); // Positions 2 and 3 differ (missing vs present)
    });

    it('should return 0 for identical vectors', async () => {
      const loop1 = await createCompletedLoop({ decisionVector: [0, 1, 2] });
      const loop2 = await createCompletedLoop({ decisionVector: [0, 1, 2] });

      const distance = engine.computeDecisionDistance(loop1, loop2);

      expect(distance).toBe(0);
    });
  });

  describe('findSimilarLoops', () => {
    it('should find loops with similar decision vectors', async () => {
      const target = await createCompletedLoop({ decisionVector: [0, 1, 0, 1] });
      await createCompletedLoop({ decisionVector: [0, 1, 0, 0] }); // distance 1
      await createCompletedLoop({ decisionVector: [1, 1, 1, 1] }); // distance 2
      await createCompletedLoop({ decisionVector: [1, 0, 1, 0] }); // distance 4

      const similar = await engine.findSimilarLoops(target.id, 2);

      expect(similar).toHaveLength(2);
      expect(similar[0].distance).toBe(1);
      expect(similar[1].distance).toBe(2);
    });
  });
});
