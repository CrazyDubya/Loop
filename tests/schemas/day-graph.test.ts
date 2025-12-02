import { SchemaValidator } from '../../src/validators/SchemaValidator';

describe('DayGraph Schema', () => {
  let validator: SchemaValidator;

  beforeAll(() => {
    validator = new SchemaValidator();
    validator.initialize();
  });

  const validGraph = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Bank Heist Day',
    time_bounds: {
      start: '06:00',
      end: '23:59',
    },
    start_node_id: 'node_wake_up',
    nodes: [
      {
        id: 'node_wake_up',
        type: 'event',
        time_slot: '06:00',
        label: 'Wake up',
      },
      {
        id: 'node_bank',
        type: 'location',
        time_slot: '10:00',
        label: 'Bank entrance',
        critical: true,
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source_id: 'node_wake_up',
        target_id: 'node_bank',
      },
    ],
  };

  describe('valid graphs', () => {
    it('should accept minimal valid graph', () => {
      const result = validator.validateDayGraph(validGraph);
      expect(result.valid).toBe(true);
    });

    it('should accept graph with all node types', () => {
      const nodeTypes = ['event', 'decision', 'location', 'encounter', 'discovery', 'death', 'reset'];
      const nodes = nodeTypes.map((type, i) => ({
        id: `node_${i}`,
        type,
        time_slot: `${String(6 + i).padStart(2, '0')}:00`,
        label: `Node ${i}`,
      }));
      const result = validator.validateDayGraph({
        ...validGraph,
        nodes,
        edges: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept graph with decision node choices', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        nodes: [
          ...validGraph.nodes,
          {
            id: 'node_decision',
            type: 'decision',
            time_slot: '11:00',
            label: 'Choose entrance',
            choices: [
              { index: 0, label: 'Front door', target_edge_id: 'edge_front' },
              { index: 1, label: 'Back door', target_edge_id: 'edge_back' },
            ],
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept edges with conditions', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        edges: [
          {
            id: 'edge_conditional',
            source_id: 'node_wake_up',
            target_id: 'node_bank',
            type: 'conditional',
            conditions: {
              requires_knowledge: ['fact_code'],
              time_window: { after: '09:00', before: '17:00' },
            },
          },
        ],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid graphs', () => {
    it('should reject empty nodes array', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        nodes: [],
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid time format in bounds', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        time_bounds: { start: '6am', end: '11pm' },
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid time format in node', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        nodes: [
          { id: 'bad', type: 'event', time_slot: '25:00', label: 'Bad time' },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid node type', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        nodes: [
          { id: 'bad', type: 'invalid_type', time_slot: '10:00', label: 'Bad' },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid edge type', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        edges: [
          { id: 'bad', source_id: 'a', target_id: 'b', type: 'invalid' },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it('should reject edge weight > 1', () => {
      const result = validator.validateDayGraph({
        ...validGraph,
        edges: [
          { id: 'bad', source_id: 'a', target_id: 'b', weight: 1.5 },
        ],
      });
      expect(result.valid).toBe(false);
    });
  });
});
