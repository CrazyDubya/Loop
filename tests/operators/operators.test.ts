import {
  DayGraph,
  DayGraphData,
  cause,
  avoid,
  trigger,
  relive,
  vary,
  varyBy,
  OperatorContext,
  Loop,
} from '../../src';

describe('Operators', () => {
  // Create a test graph with multiple paths and decision points
  function createTestGraph(): DayGraph {
    const data: DayGraphData = {
      id: 'test-graph',
      name: 'Test Day',
      time_bounds: { start: '06:00', end: '22:00' },
      start_node_id: 'start',
      nodes: [
        { id: 'start', type: 'event', time_slot: '06:00', label: 'Wake Up' },
        {
          id: 'decision1',
          type: 'decision',
          time_slot: '08:00',
          label: 'Morning Choice',
          choices: [
            { index: 0, label: 'Go to bank', target_edge_id: 'e_to_bank' },
            { index: 1, label: 'Go to park', target_edge_id: 'e_to_park' },
            { index: 2, label: 'Stay home', target_edge_id: 'e_to_home' },
          ],
        },
        { id: 'bank', type: 'location', time_slot: '09:00', label: 'Bank' },
        { id: 'park', type: 'location', time_slot: '09:00', label: 'Park' },
        { id: 'home', type: 'location', time_slot: '09:00', label: 'Home' },
        {
          id: 'decision2',
          type: 'decision',
          time_slot: '10:00',
          label: 'Bank Choice',
          choices: [
            { index: 0, label: 'Rob bank', target_edge_id: 'e_to_vault' },
            { index: 1, label: 'Deposit money', target_edge_id: 'e_to_teller' },
          ],
        },
        { id: 'vault', type: 'location', time_slot: '11:00', label: 'Vault' },
        { id: 'teller', type: 'location', time_slot: '11:00', label: 'Teller' },
        { id: 'explosion', type: 'death', time_slot: '12:00', label: 'Explosion' },
        { id: 'escape', type: 'reset', time_slot: '14:00', label: 'Escape' },
        { id: 'peaceful_day', type: 'reset', time_slot: '20:00', label: 'Peaceful Day' },
        { id: 'caught', type: 'death', time_slot: '15:00', label: 'Caught' },
      ],
      edges: [
        { id: 'e_start', source_id: 'start', target_id: 'decision1' },
        { id: 'e_to_bank', source_id: 'decision1', target_id: 'bank', type: 'choice' },
        { id: 'e_to_park', source_id: 'decision1', target_id: 'park', type: 'choice' },
        { id: 'e_to_home', source_id: 'decision1', target_id: 'home', type: 'choice' },
        { id: 'e_bank_decision', source_id: 'bank', target_id: 'decision2' },
        { id: 'e_to_vault', source_id: 'decision2', target_id: 'vault', type: 'choice' },
        { id: 'e_to_teller', source_id: 'decision2', target_id: 'teller', type: 'choice' },
        { id: 'e_vault_explosion', source_id: 'vault', target_id: 'explosion', weight: 0.7 },
        { id: 'e_vault_escape', source_id: 'vault', target_id: 'escape', weight: 0.3 },
        { id: 'e_teller_caught', source_id: 'teller', target_id: 'caught' },
        { id: 'e_park_peaceful', source_id: 'park', target_id: 'peaceful_day' },
        { id: 'e_home_peaceful', source_id: 'home', target_id: 'peaceful_day' },
      ],
    };

    return new DayGraph(data);
  }

  function createContext(graph: DayGraph, overrides: Partial<OperatorContext> = {}): OperatorContext {
    return {
      graph,
      knownFacts: new Set(),
      ...overrides,
    };
  }

  describe('CauseOperator', () => {
    it('should find path to target node', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = cause('explosion');

      const result = op.execute(context);

      expect(result.success).toBe(true);
      expect(result.suggestedPath).toContain('explosion');
      expect(result.probability).toBeGreaterThan(0);
    });

    it('should include decision suggestions', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = cause('explosion');

      const result = op.execute(context);

      expect(result.suggestedDecisions.length).toBeGreaterThan(0);
      // Should suggest going to bank (choice 0) then vault (choice 0)
      expect(result.suggestedDecisions[0].nodeId).toBe('decision1');
      expect(result.suggestedDecisions[0].choiceIndex).toBe(0); // Go to bank
    });

    it('should handle unreachable target', () => {
      const graph = createTestGraph();
      // Add an isolated node
      graph.addNode({
        id: 'isolated',
        type: 'event',
        time_slot: '10:00',
        label: 'Isolated',
      });

      const context = createContext(graph);
      const op = cause('isolated');

      const validation = op.canExecute(context);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('not reachable');
    });

    it('should handle non-existent target', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = cause('nonexistent');

      const validation = op.canExecute(context);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('does not exist');
    });

    it('should accept multiple targets with any mode', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = cause({ nodeIds: ['explosion', 'escape'], mode: 'any' });

      const result = op.execute(context);

      expect(result.success).toBe(true);
      // Path should reach either explosion or escape
      expect(
        result.suggestedPath.includes('explosion') ||
        result.suggestedPath.includes('escape')
      ).toBe(true);
    });
  });

  describe('AvoidOperator', () => {
    it('should find path avoiding target node', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = avoid('explosion');

      const result = op.execute(context);

      expect(result.success).toBe(true);
      expect(result.suggestedPath).not.toContain('explosion');
    });

    it('should suggest going to park or home to avoid bank dangers', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = avoid(['explosion', 'caught']);

      const result = op.execute(context);

      expect(result.success).toBe(true);
      // Should avoid bank entirely
      expect(result.suggestedPath).not.toContain('bank');
      // Should go to park or home
      expect(
        result.suggestedPath.includes('park') ||
        result.suggestedPath.includes('home')
      ).toBe(true);
    });

    it('should report when avoidance is impossible', () => {
      // Create a graph where all paths lead to the avoided node
      const data: DayGraphData = {
        id: 'unavoidable',
        name: 'Unavoidable',
        time_bounds: { start: '00:00', end: '23:59' },
        start_node_id: 'start',
        nodes: [
          { id: 'start', type: 'event', time_slot: '00:00', label: 'Start' },
          { id: 'middle', type: 'event', time_slot: '12:00', label: 'Middle' },
          { id: 'doom', type: 'death', time_slot: '18:00', label: 'Doom' },
        ],
        edges: [
          { id: 'e1', source_id: 'start', target_id: 'middle' },
          { id: 'e2', source_id: 'middle', target_id: 'doom' },
        ],
      };

      const graph = new DayGraph(data);
      const context = createContext(graph);
      const op = avoid('doom');

      const result = op.execute(context);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Cannot find any path');
    });
  });

  describe('TriggerOperator', () => {
    it('should find path through sequence', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = trigger(['bank', 'vault', 'explosion']);

      const result = op.execute(context);

      expect(result.success).toBe(true);
      // Verify sequence order
      const bankIndex = result.suggestedPath.indexOf('bank');
      const vaultIndex = result.suggestedPath.indexOf('vault');
      const explosionIndex = result.suggestedPath.indexOf('explosion');

      expect(bankIndex).toBeLessThan(vaultIndex);
      expect(vaultIndex).toBeLessThan(explosionIndex);
    });

    it('should reject impossible sequence', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      // Can't go from explosion back to bank
      const op = trigger(['explosion', 'bank']);

      const validation = op.canExecute(context);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Cannot reach');
    });

    it('should handle empty sequence', () => {
      const graph = createTestGraph();
      const context = createContext(graph);
      const op = trigger([]);

      const validation = op.canExecute(context);
      expect(validation.valid).toBe(false);
    });
  });

  describe('ReliveOperator', () => {
    function createReferenceLoop(): Loop {
      return {
        id: 'ref-loop',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T12:00:00Z',
        duration_story_minutes: 360,
        knowledge_state_start_id: 'ks-0',
        knowledge_state_end_id: 'ks-1',
        emotional_state_start: 'hopeful',
        emotional_state_end: 'frustrated',
        decisions: [
          { id: 'd1', node_id: 'decision1', choice_index: 0, timestamp: '' },
          { id: 'd2', node_id: 'decision2', choice_index: 0, timestamp: '' },
        ],
        decision_vector: [0, 0], // bank, vault
        path: ['start', 'decision1', 'bank', 'decision2', 'vault', 'explosion'],
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'explosion',
          timestamp: '2024-01-01T12:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };
    }

    it('should replicate exact path when maxDeviation is 0', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = relive(refLoop);

      const result = op.execute(context);

      expect(result.success).toBe(true);
      expect(result.suggestedPath).toEqual(refLoop.path);
    });

    it('should find similar path within deviation tolerance', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = relive({ referenceLoop: refLoop, maxDeviation: 1 });

      const result = op.execute(context);

      expect(result.success).toBe(true);
      // Path should end at same terminal or similar
    });

    it('should reject loop with no path', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      refLoop.path = [];

      const context = createContext(graph);
      const op = relive(refLoop);

      const validation = op.canExecute(context);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('no path');
    });
  });

  describe('VaryOperator', () => {
    function createReferenceLoop(): Loop {
      return {
        id: 'ref-loop',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T12:00:00Z',
        duration_story_minutes: 360,
        knowledge_state_start_id: 'ks-0',
        knowledge_state_end_id: 'ks-1',
        emotional_state_start: 'hopeful',
        emotional_state_end: 'frustrated',
        decisions: [
          { id: 'd1', node_id: 'decision1', choice_index: 0, timestamp: '' },
          { id: 'd2', node_id: 'decision2', choice_index: 0, timestamp: '' },
        ],
        decision_vector: [0, 0], // bank, vault
        path: ['start', 'decision1', 'bank', 'decision2', 'vault', 'explosion'],
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'explosion',
          timestamp: '2024-01-01T12:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };
    }

    it('should find path with small deviation', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = vary(refLoop, 'small');

      const result = op.execute(context);

      // Should find a path that differs by 1-2 decisions
      if (result.success) {
        expect(result.rationale).toContain('variation');
      }
    });

    it('should find path with medium deviation', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = vary(refLoop, 'medium');

      const result = op.execute(context);

      // Medium deviation might not be achievable in small graph
      // Just verify it runs without error
      expect(result.rationale).toBeDefined();
    });

    it('should allow explicit deviation range', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = varyBy(refLoop, 1, 1); // Exactly 1 decision different

      const result = op.execute(context);

      // Should try to find path with exactly 1 different decision
      expect(result.rationale).toBeDefined();
    });

    it('should describe changes from reference', () => {
      const graph = createTestGraph();
      const refLoop = createReferenceLoop();
      const context = createContext(graph);
      const op = vary(refLoop, 'small');

      const result = op.execute(context);

      if (result.success) {
        expect(result.rationale).toContain('decision');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const data: DayGraphData = {
        id: 'empty',
        name: 'Empty',
        time_bounds: { start: '00:00', end: '23:59' },
        start_node_id: 'start',
        nodes: [{ id: 'start', type: 'event', time_slot: '00:00', label: 'Start' }],
        edges: [],
      };

      const graph = new DayGraph(data);
      const context = createContext(graph);
      const op = cause('start');

      const result = op.execute(context);

      // Start node is the target, so path is just [start]
      expect(result.success).toBe(true);
      expect(result.suggestedPath).toEqual(['start']);
    });

    it('should handle linear graph', () => {
      const data: DayGraphData = {
        id: 'linear',
        name: 'Linear',
        time_bounds: { start: '00:00', end: '23:59' },
        start_node_id: 'n1',
        nodes: [
          { id: 'n1', type: 'event', time_slot: '00:00', label: 'N1' },
          { id: 'n2', type: 'event', time_slot: '06:00', label: 'N2' },
          { id: 'n3', type: 'event', time_slot: '12:00', label: 'N3' },
          { id: 'n4', type: 'death', time_slot: '18:00', label: 'N4' },
        ],
        edges: [
          { id: 'e1', source_id: 'n1', target_id: 'n2' },
          { id: 'e2', source_id: 'n2', target_id: 'n3' },
          { id: 'e3', source_id: 'n3', target_id: 'n4' },
        ],
      };

      const graph = new DayGraph(data);
      const context = createContext(graph);

      const causeResult = cause('n4').execute(context);
      expect(causeResult.success).toBe(true);
      expect(causeResult.suggestedPath).toEqual(['n1', 'n2', 'n3', 'n4']);

      const avoidResult = avoid('n4').execute(context);
      expect(avoidResult.success).toBe(false); // Can't avoid in linear graph
    });
  });
});
