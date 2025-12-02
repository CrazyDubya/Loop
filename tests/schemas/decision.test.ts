import { SchemaValidator } from '../../src/validators/SchemaValidator';

describe('Decision Schema', () => {
  let validator: SchemaValidator;

  beforeAll(() => {
    validator = new SchemaValidator();
    validator.initialize();
  });

  const validDecision = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    node_id: 'node_bank_entrance',
    choice_index: 0,
    timestamp: '2024-01-15T10:30:00Z',
  };

  describe('valid decisions', () => {
    it('should accept minimal valid decision', () => {
      const result = validator.validateDecision(validDecision);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept decision with all optional fields', () => {
      const full = {
        ...validDecision,
        choice_label: 'Enter through front door',
        confidence: 0.8,
        rationale: 'Saw guard leave for break',
        influenced_by: ['fact_guard_schedule', 'fact_door_unlocked'],
      };
      const result = validator.validateDecision(full);
      expect(result.valid).toBe(true);
    });

    it('should accept confidence of 0', () => {
      const result = validator.validateDecision({
        ...validDecision,
        confidence: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept confidence of 1', () => {
      const result = validator.validateDecision({
        ...validDecision,
        confidence: 1,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid decisions', () => {
    it('should reject missing id', () => {
      const { id, ...noId } = validDecision;
      const result = validator.validateDecision(noId);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('id'))).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = validator.validateDecision({
        ...validDecision,
        id: 'not-a-uuid',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject missing node_id', () => {
      const { node_id, ...noNodeId } = validDecision;
      const result = validator.validateDecision(noNodeId);
      expect(result.valid).toBe(false);
    });

    it('should reject negative choice_index', () => {
      const result = validator.validateDecision({
        ...validDecision,
        choice_index: -1,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const result = validator.validateDecision({
        ...validDecision,
        timestamp: 'not-a-date',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject confidence > 1', () => {
      const result = validator.validateDecision({
        ...validDecision,
        confidence: 1.5,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject confidence < 0', () => {
      const result = validator.validateDecision({
        ...validDecision,
        confidence: -0.1,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject additional properties', () => {
      const result = validator.validateDecision({
        ...validDecision,
        extra_field: 'not allowed',
      });
      expect(result.valid).toBe(false);
    });
  });
});
