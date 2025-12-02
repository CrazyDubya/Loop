import {
  checkLoopInvariants,
  checkGraphInvariants,
  checkKnowledgeInvariants,
} from '../../src/validators/Invariants';

describe('Invariants', () => {
  describe('Loop Invariants', () => {
    const baseLoop = {
      id: 'loop-1',
      sequence_number: 1,
      started_at: '2024-01-15T06:00:00Z',
      ended_at: '2024-01-15T18:00:00Z',
      knowledge_state_start_id: 'ks-0',
      decisions: [
        { id: 'd1', node_id: 'n1', timestamp: '2024-01-15T08:00:00Z', choice_index: 0 },
        { id: 'd2', node_id: 'n2', timestamp: '2024-01-15T10:00:00Z', choice_index: 1 },
      ],
      outcome: {
        id: 'o1',
        type: 'death',
        timestamp: '2024-01-15T18:00:00Z',
        terminal_node_id: 'n3',
      },
    };

    it('should pass for valid loop', () => {
      const result = checkLoopInvariants(baseLoop);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('INV-L1: should detect out-of-order decisions', () => {
      const loop = {
        ...baseLoop,
        decisions: [
          { id: 'd1', node_id: 'n1', timestamp: '2024-01-15T10:00:00Z', choice_index: 0 },
          { id: 'd2', node_id: 'n2', timestamp: '2024-01-15T08:00:00Z', choice_index: 1 },
        ],
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L1')).toBe(true);
    });

    it('INV-L2: should detect outcome before last decision', () => {
      const loop = {
        ...baseLoop,
        outcome: {
          ...baseLoop.outcome,
          timestamp: '2024-01-15T09:00:00Z', // Before 10:00 decision
        },
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L2')).toBe(true);
    });

    it('INV-L3: should detect loop end before start', () => {
      const loop = {
        ...baseLoop,
        started_at: '2024-01-15T18:00:00Z',
        ended_at: '2024-01-15T06:00:00Z',
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L3')).toBe(true);
    });

    it('INV-L4: should detect decision node not in path', () => {
      const loop = {
        ...baseLoop,
        path: ['n1', 'n3'], // Missing n2
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L4')).toBe(true);
    });

    it('INV-L5: should detect sub-loop depth > 3', () => {
      const loop = {
        ...baseLoop,
        sub_loops: [
          { id: 'sl1', depth: 4, start_time: '2024-01-15T10:00:00Z' },
        ],
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L5')).toBe(true);
    });

    it('INV-L6: should detect sub-loop outside parent bounds', () => {
      const loop = {
        ...baseLoop,
        sub_loops: [
          { id: 'sl1', depth: 1, start_time: '2024-01-15T05:00:00Z' },
        ],
      };
      const result = checkLoopInvariants(loop);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L6')).toBe(true);
    });

    it('INV-L7: should detect decision node not in graph', () => {
      const graph = {
        id: 'g1',
        nodes: [{ id: 'n1', type: 'event', time_slot: '08:00' }],
        edges: [],
        start_node_id: 'n1',
        time_bounds: { start: '06:00', end: '20:00' },
      };
      const result = checkLoopInvariants(baseLoop, graph);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-L7')).toBe(true);
    });
  });

  describe('Graph Invariants', () => {
    const baseGraph = {
      id: 'g1',
      nodes: [
        { id: 'n1', type: 'event', time_slot: '08:00' },
        { id: 'n2', type: 'event', time_slot: '10:00' },
        { id: 'n3', type: 'death', time_slot: '18:00' },
      ],
      edges: [
        { id: 'e1', source_id: 'n1', target_id: 'n2' },
        { id: 'e2', source_id: 'n2', target_id: 'n3' },
      ],
      start_node_id: 'n1',
      time_bounds: { start: '06:00', end: '20:00' },
    };

    it('should pass for valid graph', () => {
      const result = checkGraphInvariants(baseGraph);
      expect(result.passed).toBe(true);
    });

    it('INV-G1: should detect missing start node', () => {
      const graph = { ...baseGraph, start_node_id: 'nonexistent' };
      const result = checkGraphInvariants(graph);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-G1')).toBe(true);
    });

    it('INV-G2: should detect edge with missing source', () => {
      const graph = {
        ...baseGraph,
        edges: [{ id: 'bad', source_id: 'missing', target_id: 'n2' }],
      };
      const result = checkGraphInvariants(graph);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-G2')).toBe(true);
    });

    it('INV-G3: should detect self-loop', () => {
      const graph = {
        ...baseGraph,
        edges: [{ id: 'self', source_id: 'n1', target_id: 'n1' }],
      };
      const result = checkGraphInvariants(graph);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-G3')).toBe(true);
    });

    it('INV-G4: should warn about node outside time bounds', () => {
      const graph = {
        ...baseGraph,
        nodes: [
          ...baseGraph.nodes,
          { id: 'late', type: 'event', time_slot: '22:00' },
        ],
      };
      const result = checkGraphInvariants(graph);
      expect(result.violations.some(v => v.invariant === 'INV-G4')).toBe(true);
    });

    it('INV-G5: should warn about unreachable nodes', () => {
      const graph = {
        ...baseGraph,
        nodes: [
          ...baseGraph.nodes,
          { id: 'orphan', type: 'event', time_slot: '12:00' },
        ],
      };
      const result = checkGraphInvariants(graph);
      expect(result.violations.some(v => v.invariant === 'INV-G5')).toBe(true);
    });
  });

  describe('Knowledge Invariants', () => {
    const baseKnowledge = {
      id: 'ks-1',
      version: 1,
      parent_id: 'ks-0',
      facts: [
        { id: 'f1', certainty: 0.8, learned_in_loop: 'loop-1' },
        { id: 'f2', certainty: 1.0, learned_in_loop: 'loop-1' },
      ],
      created_at: '2024-01-15T00:00:00Z',
    };

    const parentKnowledge = {
      id: 'ks-0',
      version: 0,
      parent_id: null,
      facts: [],
      created_at: '2024-01-14T00:00:00Z',
    };

    it('should pass for valid knowledge state', () => {
      const result = checkKnowledgeInvariants(baseKnowledge, parentKnowledge);
      expect(result.passed).toBe(true);
    });

    it('INV-K1: should detect version not greater than parent', () => {
      const current = { ...baseKnowledge, version: 0 };
      const result = checkKnowledgeInvariants(current, parentKnowledge);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-K1')).toBe(true);
    });

    it('INV-K2: should detect parent_id mismatch', () => {
      const current = { ...baseKnowledge, parent_id: 'wrong-id' };
      const result = checkKnowledgeInvariants(current, parentKnowledge);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-K2')).toBe(true);
    });

    it('INV-K3: should detect invalid certainty', () => {
      const current = {
        ...baseKnowledge,
        facts: [{ id: 'f1', certainty: 1.5, learned_in_loop: 'loop-1' }],
      };
      const result = checkKnowledgeInvariants(current);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.invariant === 'INV-K3')).toBe(true);
    });

    it('INV-K4: should warn about missing contradicted_by reference', () => {
      const current = {
        ...baseKnowledge,
        facts: [
          { id: 'f1', certainty: 0.8, contradicted_by: ['nonexistent'], learned_in_loop: 'loop-1' },
        ],
      };
      const result = checkKnowledgeInvariants(current);
      expect(result.violations.some(v => v.invariant === 'INV-K4')).toBe(true);
    });
  });
});
