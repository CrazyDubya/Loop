export {
  SchemaValidator,
  getValidator,
  type ValidationResult,
  type ValidationError,
  type SchemaName,
} from './SchemaValidator';

export {
  checkLoopInvariants,
  checkGraphInvariants,
  checkKnowledgeInvariants,
  type InvariantViolation,
  type InvariantCheckResult,
} from './Invariants';

export {
  detectKnowledgeContradictions,
  detectOutcomeContradictions,
  detectTemporalContradictions,
  detectEquivalenceContradictions,
  detectLoopContradictions,
  type Contradiction,
  type ContradictionReport,
  type KnowledgeFact,
  type KnowledgeState,
} from './ContradictionDetector';

export {
  ConsistencyChecker,
  quickLoopCheck,
  type RepairSuggestion,
  type ConsistencyIssue,
  type ConsistencyReport,
  type CheckOptions,
} from './ConsistencyChecker';
