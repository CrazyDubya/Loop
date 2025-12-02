import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

const SCHEMAS_DIR = join(__dirname, '../../schemas');

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export type SchemaName =
  | 'loop'
  | 'decision'
  | 'outcome'
  | 'knowledge-state'
  | 'epoch'
  | 'day-graph'
  | 'sub-loop'
  | 'equivalence-class';

/**
 * Schema validator using AJV with all Loop Engine schemas pre-loaded
 */
export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<SchemaName, ValidateFunction> = new Map();
  private initialized = false;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictSchema: true,
      strictNumbers: true,
      strictTypes: true,
      strictTuples: true,
      strictRequired: true,
      allowUnionTypes: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Initialize by loading all schemas
   */
  initialize(): void {
    if (this.initialized) return;

    const schemaFiles: SchemaName[] = [
      'decision',
      'outcome',
      'knowledge-state',
      'epoch',
      'day-graph',
      'sub-loop',
      'loop',
      'equivalence-class',
    ];

    // Load all schemas first (for $ref resolution)
    for (const name of schemaFiles) {
      const schemaPath = join(SCHEMAS_DIR, `${name}.schema.json`);
      const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
      this.ajv.addSchema(schema, `${name}.schema.json`);
    }

    // Compile validators
    for (const name of schemaFiles) {
      const validator = this.ajv.getSchema(`${name}.schema.json`);
      if (validator) {
        this.validators.set(name, validator);
      }
    }

    this.initialized = true;
  }

  /**
   * Validate data against a specific schema
   */
  validate(schemaName: SchemaName, data: unknown): ValidationResult {
    if (!this.initialized) {
      this.initialize();
    }

    const validator = this.validators.get(schemaName);
    if (!validator) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Unknown schema: ${schemaName}`,
          keyword: 'schema',
          params: { schemaName },
        }],
      };
    }

    const valid = validator(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    return {
      valid: false,
      errors: this.formatErrors(validator.errors || []),
    };
  }

  /**
   * Validate a Loop
   */
  validateLoop(data: unknown): ValidationResult {
    return this.validate('loop', data);
  }

  /**
   * Validate a Decision
   */
  validateDecision(data: unknown): ValidationResult {
    return this.validate('decision', data);
  }

  /**
   * Validate an Outcome
   */
  validateOutcome(data: unknown): ValidationResult {
    return this.validate('outcome', data);
  }

  /**
   * Validate a KnowledgeState
   */
  validateKnowledgeState(data: unknown): ValidationResult {
    return this.validate('knowledge-state', data);
  }

  /**
   * Validate an Epoch
   */
  validateEpoch(data: unknown): ValidationResult {
    return this.validate('epoch', data);
  }

  /**
   * Validate a DayGraph
   */
  validateDayGraph(data: unknown): ValidationResult {
    return this.validate('day-graph', data);
  }

  /**
   * Validate a SubLoop
   */
  validateSubLoop(data: unknown): ValidationResult {
    return this.validate('sub-loop', data);
  }

  /**
   * Validate an EquivalenceClass
   */
  validateEquivalenceClass(data: unknown): ValidationResult {
    return this.validate('equivalence-class', data);
  }

  /**
   * Format AJV errors into our error format
   */
  private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(err => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown error',
      keyword: err.keyword,
      params: err.params as Record<string, unknown>,
    }));
  }

  /**
   * Get human-readable error summary
   */
  static formatErrorSummary(result: ValidationResult): string {
    if (result.valid) {
      return 'Valid';
    }

    return result.errors
      .map(e => `${e.path}: ${e.message}`)
      .join('\n');
  }
}

// Singleton instance
let _instance: SchemaValidator | null = null;

export function getValidator(): SchemaValidator {
  if (!_instance) {
    _instance = new SchemaValidator();
    _instance.initialize();
  }
  return _instance;
}
