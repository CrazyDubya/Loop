import {
  DayGraph,
  DayGraphData,
  Loop,
  MemoryLoopStore,
  EquivalenceEngine,
  detectKnowledgeContradictions,
  detectOutcomeContradictions,
  detectTemporalContradictions,
  detectLoopContradictions,
  ConsistencyChecker,
  quickLoopCheck,
  KnowledgeState,
  KnowledgeFact,
} from '../../src';

describe('ContradictionDetector', () => {
  describe('detectKnowledgeContradictions', () => {
    it('should detect conflicting values for same key', () => {
      const states: KnowledgeState[] = [
        {
          id: 'ks-1',
          version: 1,
          facts: [
            { id: 'f1', key: 'door_locked', value: true, certainty: 1.0 },
            { id: 'f2', key: 'door_locked', value: false, certainty: 0.8 },
          ],
        },
      ];

      const contradictions = detectKnowledgeContradictions(states);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].type).toBe('knowledge');
      expect(contradictions[0].severity).toBe('error');
      expect(contradictions[0].message).toContain('Conflicting values');
      expect(contradictions[0].message).toContain('door_locked');
    });

    it('should not flag same values as contradictions', () => {
      const states: KnowledgeState[] = [
        {
          id: 'ks-1',
          version: 1,
          facts: [
            { id: 'f1', key: 'guard_schedule', value: '9am', certainty: 1.0 },
            { id: 'f2', key: 'guard_schedule', value: '9am', certainty: 0.5 },
          ],
        },
      ];

      const contradictions = detectKnowledgeContradictions(states);

      expect(contradictions.length).toBe(0);
    });

    it('should detect missing contradicted_by references', () => {
      const states: KnowledgeState[] = [
        {
          id: 'ks-1',
          version: 1,
          facts: [
            { id: 'f1', key: 'killer_identity', value: 'john', certainty: 0.5, contradicted_by: ['f999'] },
          ],
        },
      ];

      const contradictions = detectKnowledgeContradictions(states);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].type).toBe('knowledge');
      expect(contradictions[0].severity).toBe('warning');
      expect(contradictions[0].message).toContain('non-existent fact');
    });

    it('should detect disappearing facts between parent and child', () => {
      const states: KnowledgeState[] = [
        {
          id: 'parent',
          version: 1,
          facts: [
            { id: 'f1', key: 'secret_passage', value: true, certainty: 1.0 },
            { id: 'f2', key: 'vault_code', value: '1234', certainty: 1.0 },
          ],
        },
        {
          id: 'child',
          version: 2,
          parent_id: 'parent',
          facts: [
            // secret_passage fact is missing without explicit contradiction
            { id: 'f2', key: 'vault_code', value: '1234', certainty: 1.0 },
          ],
        },
      ];

      const contradictions = detectKnowledgeContradictions(states);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].type).toBe('knowledge');
      expect(contradictions[0].severity).toBe('warning');
      expect(contradictions[0].message).toContain('disappeared');
    });
  });

  describe('detectOutcomeContradictions', () => {
    function createTestGraph(): DayGraph {
      const data: DayGraphData = {
        id: 'test-graph',
        name: 'Test',
        time_bounds: { start: '06:00', end: '22:00' },
        start_node_id: 'start',
        nodes: [
          { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
          { id: 'middle', type: 'event', time_slot: '12:00', label: 'Middle' },
          { id: 'end', type: 'death', time_slot: '18:00', label: 'End' },
          { id: 'isolated', type: 'event', time_slot: '10:00', label: 'Isolated' },
        ],
        edges: [
          { id: 'e1', source_id: 'start', target_id: 'middle' },
          { id: 'e2', source_id: 'middle', target_id: 'end' },
        ],
      };
      return new DayGraph(data);
    }

    function createTestLoop(): Loop {
      return {
        id: 'loop-1',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T18:00:00Z',
        duration_story_minutes: 720,
        knowledge_state_start_id: 'ks-0',
        knowledge_state_end_id: 'ks-1',
        emotional_state_start: 'hopeful',
        emotional_state_end: 'frustrated',
        decisions: [],
        decision_vector: [],
        path: ['start', 'middle', 'end'],
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'end',
          timestamp: '2024-01-01T18:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };
    }

    it('should detect non-existent terminal node', () => {
      const graph = createTestGraph();
      const loop = createTestLoop();
      loop.outcome.terminal_node_id = 'nonexistent';

      const contradictions = detectOutcomeContradictions(loop, graph);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].type).toBe('outcome');
      expect(contradictions[0].severity).toBe('error');
      expect(contradictions[0].message).toContain('non-existent');
    });

    it('should detect unreachable terminal from path', () => {
      const graph = createTestGraph();
      const loop = createTestLoop();
      loop.path = ['start', 'middle'];
      loop.outcome.terminal_node_id = 'isolated'; // Not reachable from middle

      const contradictions = detectOutcomeContradictions(loop, graph);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions.some(c => c.type === 'outcome')).toBe(true);
    });

    it('should detect disconnected path', () => {
      const graph = createTestGraph();
      const loop = createTestLoop();
      loop.path = ['start', 'isolated', 'end']; // isolated is not connected

      const contradictions = detectOutcomeContradictions(loop, graph);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions.some(c => c.type === 'path')).toBe(true);
    });

    it('should pass valid loop', () => {
      const graph = createTestGraph();
      const loop = createTestLoop();

      const contradictions = detectOutcomeContradictions(loop, graph);

      expect(contradictions.filter(c => c.severity === 'error').length).toBe(0);
    });
  });

  describe('detectTemporalContradictions', () => {
    function createTestGraph(): DayGraph {
      const data: DayGraphData = {
        id: 'test-graph',
        name: 'Test',
        time_bounds: { start: '06:00', end: '22:00' },
        start_node_id: 'morning',
        nodes: [
          { id: 'morning', type: 'event', time_slot: '08:00', label: 'Morning' },
          { id: 'noon', type: 'event', time_slot: '12:00', label: 'Noon' },
          { id: 'evening', type: 'event', time_slot: '18:00', label: 'Evening' },
        ],
        edges: [
          { id: 'e1', source_id: 'morning', target_id: 'noon' },
          { id: 'e2', source_id: 'noon', target_id: 'evening' },
        ],
      };
      return new DayGraph(data);
    }

    it('should detect backward time flow', () => {
      const graph = createTestGraph();
      const loop: Loop = {
        id: 'loop-1',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T18:00:00Z',
        duration_story_minutes: 720,
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        decisions: [],
        decision_vector: [],
        path: ['evening', 'morning'], // Time goes backward!
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'morning',
          timestamp: '2024-01-01T08:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };

      const contradictions = detectTemporalContradictions(loop, graph);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].type).toBe('temporal');
      expect(contradictions[0].severity).toBe('error');
      expect(contradictions[0].message).toContain('backward');
    });

    it('should pass forward time flow', () => {
      const graph = createTestGraph();
      const loop: Loop = {
        id: 'loop-1',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T18:00:00Z',
        duration_story_minutes: 720,
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        decisions: [],
        decision_vector: [],
        path: ['morning', 'noon', 'evening'],
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'evening',
          timestamp: '2024-01-01T18:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };

      const contradictions = detectTemporalContradictions(loop, graph);

      expect(contradictions.length).toBe(0);
    });
  });

  describe('detectLoopContradictions', () => {
    it('should combine outcome and temporal contradictions', () => {
      const data: DayGraphData = {
        id: 'test-graph',
        name: 'Test',
        time_bounds: { start: '06:00', end: '22:00' },
        start_node_id: 'start',
        nodes: [
          { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
          { id: 'end', type: 'death', time_slot: '18:00', label: 'End' },
        ],
        edges: [
          { id: 'e1', source_id: 'start', target_id: 'end' },
        ],
      };
      const graph = new DayGraph(data);

      const loop: Loop = {
        id: 'loop-1',
        sequence_number: 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T18:00:00Z',
        duration_story_minutes: 720,
        knowledge_state_start_id: 'ks-0',
        emotional_state_start: 'hopeful',
        decisions: [],
        decision_vector: [],
        path: ['start', 'end'],
        outcome: {
          id: 'o1',
          type: 'death',
          terminal_node_id: 'end',
          timestamp: '2024-01-01T18:00:00Z',
        },
        is_anchor: false,
        tags: [],
      };

      const report = detectLoopContradictions(loop, graph);

      expect(report.hasContradictions).toBe(false);
      expect(report.checkedAt).toBeDefined();
    });
  });
});

describe('ConsistencyChecker', () => {
  function createTestGraph(): DayGraph {
    const data: DayGraphData = {
      id: 'test-graph',
      name: 'Test Graph',
      time_bounds: { start: '06:00', end: '22:00' },
      start_node_id: 'start',
      nodes: [
        { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
        {
          id: 'decision1',
          type: 'decision',
          time_slot: '08:00',
          label: 'Decision',
          choices: [
            { index: 0, label: 'Option A', target_edge_id: 'e_a' },
            { index: 1, label: 'Option B', target_edge_id: 'e_b' },
          ],
        },
        { id: 'path_a', type: 'event', time_slot: '10:00', label: 'Path A' },
        { id: 'path_b', type: 'event', time_slot: '10:00', label: 'Path B' },
        { id: 'end', type: 'death', time_slot: '18:00', label: 'End' },
      ],
      edges: [
        { id: 'e_start', source_id: 'start', target_id: 'decision1' },
        { id: 'e_a', source_id: 'decision1', target_id: 'path_a', type: 'choice' },
        { id: 'e_b', source_id: 'decision1', target_id: 'path_b', type: 'choice' },
        { id: 'e_a_end', source_id: 'path_a', target_id: 'end' },
        { id: 'e_b_end', source_id: 'path_b', target_id: 'end' },
      ],
    };
    return new DayGraph(data);
  }

  function createValidLoop(): Loop {
    return {
      id: 'loop-1',
      sequence_number: 1,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      knowledge_state_end_id: 'ks-1',
      emotional_state_start: 'hopeful',
      emotional_state_end: 'frustrated',
      decisions: [
        { id: 'd1', node_id: 'decision1', choice_index: 0, timestamp: '2024-01-01T08:00:00Z' },
      ],
      decision_vector: [0],
      path: ['start', 'decision1', 'path_a', 'end'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'end',
        timestamp: '2024-01-01T18:00:00Z',
      },
      is_anchor: false,
      tags: [],
    };
  }

  describe('checkLoop', () => {
    it('should validate a correct loop', () => {
      const graph = createTestGraph();
      const loop = createValidLoop();
      const checker = new ConsistencyChecker({ graph });

      const report = checker.checkLoop(loop);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    it('should detect invalid decision node reference', () => {
      const graph = createTestGraph();
      const loop = createValidLoop();
      loop.decisions[0].node_id = 'nonexistent';

      const checker = new ConsistencyChecker({ graph });
      const report = checker.checkLoop(loop);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.issues.some(i => i.category === 'reference')).toBe(true);
    });

    it('should detect invalid path reference', () => {
      const graph = createTestGraph();
      const loop = createValidLoop();
      loop.path = ['start', 'nonexistent', 'end'];

      const checker = new ConsistencyChecker({ graph });
      const report = checker.checkLoop(loop);

      expect(report.valid).toBe(false);
      expect(report.issues.some(i =>
        i.category === 'reference' && i.message.includes('Path')
      )).toBe(true);
    });

    it('should include repair suggestions', () => {
      const graph = createTestGraph();
      const loop = createValidLoop();
      loop.decisions[0].node_id = 'nonexistent';

      const checker = new ConsistencyChecker({ graph });
      const report = checker.checkLoop(loop);

      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.issues[0].repairs.length).toBeGreaterThan(0);
      expect(report.issues[0].repairs[0].action).toBeDefined();
    });
  });

  describe('checkGraph', () => {
    it('should validate a correct graph', () => {
      const graph = createTestGraph();
      const checker = new ConsistencyChecker();

      const report = checker.checkGraph(graph);

      expect(report.valid).toBe(true);
    });

    it('should detect dead ends', () => {
      const data: DayGraphData = {
        id: 'bad-graph',
        name: 'Bad',
        time_bounds: { start: '06:00', end: '22:00' },
        start_node_id: 'start',
        nodes: [
          { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
          { id: 'dead', type: 'event', time_slot: '12:00', label: 'Dead End' }, // Non-terminal with no outgoing
        ],
        edges: [
          { id: 'e1', source_id: 'start', target_id: 'dead' },
        ],
      };
      const graph = new DayGraph(data);
      const checker = new ConsistencyChecker();

      const report = checker.checkGraph(graph);

      expect(report.issues.some(i => i.message.includes('no outgoing edges'))).toBe(true);
    });

    it('should detect decision nodes without choices', () => {
      const data: DayGraphData = {
        id: 'bad-graph',
        name: 'Bad',
        time_bounds: { start: '06:00', end: '22:00' },
        start_node_id: 'start',
        nodes: [
          { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
          { id: 'decision', type: 'decision', time_slot: '12:00', label: 'No Choices' },
          { id: 'end', type: 'death', time_slot: '18:00', label: 'End' },
        ],
        edges: [
          { id: 'e1', source_id: 'start', target_id: 'decision' },
          { id: 'e2', source_id: 'decision', target_id: 'end' },
        ],
      };
      const graph = new DayGraph(data);
      const checker = new ConsistencyChecker();

      const report = checker.checkGraph(graph);

      expect(report.issues.some(i => i.message.includes('no choices'))).toBe(true);
    });
  });

  describe('checkKnowledgeStates', () => {
    it('should validate knowledge states', () => {
      const checker = new ConsistencyChecker();

      checker.addKnowledgeState({
        id: 'ks-1',
        version: 1,
        facts: [
          { id: 'f1', key: 'bomb_location', value: 'basement', certainty: 1.0 },
        ],
      });

      checker.addKnowledgeState({
        id: 'ks-2',
        version: 2,
        parent_id: 'ks-1',
        facts: [
          { id: 'f1', key: 'bomb_location', value: 'basement', certainty: 1.0 },
          { id: 'f2', key: 'bomb_timer', value: '30min', certainty: 0.8 },
        ],
      });

      const report = checker.checkKnowledgeStates();

      expect(report.valid).toBe(true);
    });
  });

  describe('report summary', () => {
    it('should categorize issues correctly', () => {
      const graph = createTestGraph();
      const loop = createValidLoop();
      loop.decisions[0].node_id = 'nonexistent';
      loop.path = ['start', 'also_nonexistent', 'end'];

      const checker = new ConsistencyChecker({ graph });
      const report = checker.checkLoop(loop);

      expect(report.summary.byCategory['reference']).toBeGreaterThan(0);
      expect(report.summary.byEntityType['loop']).toBeGreaterThan(0);
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('quickLoopCheck', () => {
  function createTestGraph(): DayGraph {
    const data: DayGraphData = {
      id: 'test-graph',
      name: 'Test',
      time_bounds: { start: '06:00', end: '22:00' },
      start_node_id: 'start',
      nodes: [
        { id: 'start', type: 'event', time_slot: '06:00', label: 'Start' },
        { id: 'decision', type: 'decision', time_slot: '08:00', label: 'Decision' },
        { id: 'end', type: 'death', time_slot: '18:00', label: 'End' },
      ],
      edges: [
        { id: 'e1', source_id: 'start', target_id: 'decision' },
        { id: 'e2', source_id: 'decision', target_id: 'end' },
      ],
    };
    return new DayGraph(data);
  }

  it('should pass valid loop', () => {
    const graph = createTestGraph();
    const loop: Loop = {
      id: 'loop-1',
      sequence_number: 1,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      emotional_state_start: 'hopeful',
      decisions: [
        { id: 'd1', node_id: 'decision', choice_index: 0, timestamp: '' },
      ],
      decision_vector: [0],
      path: ['start', 'decision', 'end'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'end',
        timestamp: '',
      },
      is_anchor: false,
      tags: [],
    };

    const result = quickLoopCheck(loop, graph);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should fail on invalid terminal node', () => {
    const graph = createTestGraph();
    const loop: Loop = {
      id: 'loop-1',
      sequence_number: 1,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      emotional_state_start: 'hopeful',
      decisions: [],
      decision_vector: [],
      path: ['start', 'end'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'nonexistent',
        timestamp: '',
      },
      is_anchor: false,
      tags: [],
    };

    const result = quickLoopCheck(loop, graph);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Terminal node'))).toBe(true);
  });

  it('should fail on reversed timestamps', () => {
    const graph = createTestGraph();
    const loop: Loop = {
      id: 'loop-1',
      sequence_number: 1,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T18:00:00Z', // Later than end!
      ended_at: '2024-01-01T06:00:00Z',
      duration_story_minutes: -720,
      knowledge_state_start_id: 'ks-0',
      emotional_state_start: 'hopeful',
      decisions: [],
      decision_vector: [],
      path: ['start', 'end'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'end',
        timestamp: '',
      },
      is_anchor: false,
      tags: [],
    };

    const result = quickLoopCheck(loop, graph);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('time'))).toBe(true);
  });
});
