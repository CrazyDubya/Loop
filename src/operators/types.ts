/**
 * Operator types and interfaces
 */

import { DayGraph, GraphNode, PathResult } from '../graph';
import { Loop, Decision, OperatorType } from '../loop';

/**
 * Result of an operator execution
 */
export interface OperatorResult {
  success: boolean;

  /** Suggested path through the graph */
  suggestedPath: string[];

  /** Suggested decisions at each decision node */
  suggestedDecisions: SuggestedDecision[];

  /** Probability of achieving the goal (0-1) */
  probability: number;

  /** Explanation of why this path was chosen */
  rationale: string;

  /** Alternative paths considered */
  alternatives?: AlternativePath[];

  /** Warnings or caveats */
  warnings?: string[];
}

export interface SuggestedDecision {
  nodeId: string;
  choiceIndex: number;
  choiceLabel?: string;
  confidence: number;
  rationale: string;
}

export interface AlternativePath {
  path: string[];
  probability: number;
  tradeoffs: string;
}

/**
 * Context provided to operators
 */
export interface OperatorContext {
  /** The graph to operate on */
  graph: DayGraph;

  /** Current knowledge state (affects available paths) */
  knownFacts?: Set<string>;

  /** Previous loops for learning */
  previousLoops?: Loop[];

  /** Maximum paths to consider */
  maxPathsToConsider?: number;

  /** Minimum acceptable probability */
  minProbability?: number;
}

/**
 * Base interface for all operators
 */
export interface Operator {
  /** Operator type identifier */
  readonly type: OperatorType;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this operator does */
  readonly description: string;

  /**
   * Execute the operator
   */
  execute(context: OperatorContext): OperatorResult;

  /**
   * Validate that the operator can run in the given context
   */
  canExecute(context: OperatorContext): { valid: boolean; reason?: string };
}

/**
 * Target specification for cause/avoid operators
 */
export interface EventTarget {
  /** Node ID(s) to target */
  nodeIds: string[];

  /** Match mode: reach ANY of the nodes or ALL of them */
  mode: 'any' | 'all';
}

/**
 * Sequence specification for trigger operator
 */
export interface SequenceTarget {
  /** Ordered list of node IDs that must be visited */
  nodeIds: string[];

  /** Whether the sequence must be exact (no intermediate nodes) */
  strict: boolean;
}

/**
 * Reference for relive/vary operators
 */
export interface LoopReference {
  /** The loop to base decisions on */
  referenceLoop: Loop;

  /** Maximum allowed deviation (for relive) */
  maxDeviation?: number;

  /** Minimum required deviation (for vary) */
  minDeviation?: number;

  /** Target deviation magnitude (for vary) */
  targetDeviation?: 'small' | 'medium' | 'large';
}

/**
 * Probability model for edges
 */
export interface EdgeProbability {
  edgeId: string;
  baseProbability: number;
  modifiers: ProbabilityModifier[];
  effectiveProbability: number;
}

export interface ProbabilityModifier {
  source: 'knowledge' | 'skill' | 'time' | 'condition';
  factor: number;
  reason: string;
}
