import { SchemaValidator } from '../../src/validators/SchemaValidator';

describe('Loop Schema', () => {
  let validator: SchemaValidator;

  beforeAll(() => {
    validator = new SchemaValidator();
    validator.initialize();
  });

  const validDecision = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    node_id: 'node_bank',
    choice_index: 0,
    timestamp: '2024-01-15T10:30:00Z',
  };

  const validOutcome = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    type: 'death',
    terminal_node_id: 'node_explosion',
    timestamp: '2024-01-15T18:03:00Z',
  };

  const validLoop = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    sequence_number: 1,
    epoch_id: 'epoch_naive',
    graph_id: 'graph_bank_day',
    status: 'completed',
    started_at: '2024-01-15T06:00:00Z',
    knowledge_state_start_id: 'ks_0',
    decisions: [validDecision],
    outcome: validOutcome,
  };

  describe('valid loops', () => {
    it('should accept minimal valid loop', () => {
      const result = validator.validateLoop(validLoop);
      expect(result.valid).toBe(true);
    });

    it('should accept loop with all optional fields', () => {
      const full = {
        ...validLoop,
        parent_id: '550e8400-e29b-41d4-a716-446655449999',
        created_at: '2024-01-15T00:00:00Z',
        ended_at: '2024-01-15T18:03:00Z',
        duration_story_minutes: 723,
        knowledge_state_end_id: 'ks_1',
        emotional_state_start: 'hopeful',
        emotional_state_end: 'frustrated',
        decision_vector: [0, 1, 0, 2],
        path: ['node_wake', 'node_bank', 'node_explosion'],
        sub_loops: [],
        equivalence_class_id: 'ec_death_1',
        is_anchor: true,
        tags: ['first_attempt', 'early_death'],
        operator_used: 'explore',
        operator_target: null,
        narrative_summary: 'First naive attempt, died in explosion.',
        notes: 'Test loop',
      };
      const result = validator.validateLoop(full);
      expect(result.valid).toBe(true);
    });

    it('should accept all status types', () => {
      for (const status of ['in_progress', 'completed', 'aborted']) {
        const result = validator.validateLoop({ ...validLoop, status });
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all emotional states', () => {
      const states = [
        'hopeful', 'curious', 'frustrated', 'desperate',
        'numb', 'determined', 'broken', 'calm', 'angry', 'resigned'
      ];
      for (const state of states) {
        const result = validator.validateLoop({
          ...validLoop,
          emotional_state_start: state,
          emotional_state_end: state,
        });
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all operator types', () => {
      const operators = ['explore', 'cause', 'avoid', 'trigger', 'relive', 'vary', 'chaos'];
      for (const op of operators) {
        const result = validator.validateLoop({
          ...validLoop,
          operator_used: op,
        });
        expect(result.valid).toBe(true);
      }
    });

    it('should accept null for nullable fields', () => {
      const result = validator.validateLoop({
        ...validLoop,
        parent_id: null,
        ended_at: null,
        knowledge_state_end_id: null,
        emotional_state_end: null,
        equivalence_class_id: null,
        operator_used: null,
        operator_target: null,
        narrative_summary: null,
        notes: null,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid loops', () => {
    it('should reject missing required fields', () => {
      const { id, ...noId } = validLoop;
      const result = validator.validateLoop(noId);
      expect(result.valid).toBe(false);
    });

    it('should reject sequence_number < 1', () => {
      const result = validator.validateLoop({
        ...validLoop,
        sequence_number: 0,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = validator.validateLoop({
        ...validLoop,
        status: 'invalid',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = validator.validateLoop({
        ...validLoop,
        duration_story_minutes: -10,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid emotional state', () => {
      const result = validator.validateLoop({
        ...validLoop,
        emotional_state_start: 'invalid_emotion',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid decision in array', () => {
      const result = validator.validateLoop({
        ...validLoop,
        decisions: [{ invalid: 'decision' }],
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid outcome', () => {
      const result = validator.validateLoop({
        ...validLoop,
        outcome: { invalid: 'outcome' },
      });
      expect(result.valid).toBe(false);
    });
  });
});
