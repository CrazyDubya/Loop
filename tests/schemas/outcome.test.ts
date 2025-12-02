import { SchemaValidator } from '../../src/validators/SchemaValidator';

describe('Outcome Schema', () => {
  let validator: SchemaValidator;

  beforeAll(() => {
    validator = new SchemaValidator();
    validator.initialize();
  });

  const validOutcome = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'death',
    terminal_node_id: 'node_explosion',
    timestamp: '2024-01-15T18:03:00Z',
  };

  describe('valid outcomes', () => {
    it('should accept minimal valid outcome', () => {
      const result = validator.validateOutcome(validOutcome);
      expect(result.valid).toBe(true);
    });

    it('should accept all outcome types', () => {
      const types = [
        'death', 'reset_trigger', 'day_end', 'voluntary_reset',
        'sub_loop_exit', 'success', 'failure', 'partial'
      ];
      for (const type of types) {
        const result = validator.validateOutcome({ ...validOutcome, type });
        expect(result.valid).toBe(true);
      }
    });

    it('should accept outcome with world_state_delta', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        world_state_delta: {
          bank_robbed: true,
          hostages_freed: false,
          villain_escaped: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should accept outcome with characters_affected', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        characters_affected: [
          { character_id: 'sister', state: 'alive' },
          { character_id: 'villain', state: 'escaped' },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept valid hash', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        hash: 'a'.repeat(64),
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid outcomes', () => {
    it('should reject invalid type', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        type: 'invalid_type',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid hash format', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        hash: 'too_short',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid character state', () => {
      const result = validator.validateOutcome({
        ...validOutcome,
        characters_affected: [
          { character_id: 'sister', state: 'invalid_state' },
        ],
      });
      expect(result.valid).toBe(false);
    });
  });
});
