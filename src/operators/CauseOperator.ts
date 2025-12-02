/**
 * CauseOperator: Find paths that maximize probability of reaching target event(s)
 *
 * Usage: cause({ nodeIds: ['explosion'], mode: 'any' })
 * Returns: Path most likely to reach the explosion node
 */

import { DayGraph, PathResult } from '../graph';
import { OperatorType } from '../loop';
import { BaseOperator } from './BaseOperator';
import {
  OperatorContext,
  OperatorResult,
  EventTarget,
  AlternativePath,
} from './types';

export class CauseOperator extends BaseOperator {
  readonly type: OperatorType = 'cause';
  readonly name = 'Cause';
  readonly description = 'Find paths that maximize probability of reaching target event(s)';

  private target: EventTarget;

  constructor(target: EventTarget) {
    super();
    this.target = target;
  }

  canExecute(context: OperatorContext): { valid: boolean; reason?: string } {
    const baseCheck = super.canExecute(context);
    if (!baseCheck.valid) return baseCheck;

    // Check that target nodes exist
    for (const nodeId of this.target.nodeIds) {
      if (!context.graph.hasNode(nodeId)) {
        return { valid: false, reason: `Target node '${nodeId}' does not exist` };
      }
    }

    // Check that targets are reachable from start
    for (const nodeId of this.target.nodeIds) {
      if (!context.graph.canReach(context.graph.startNodeId, nodeId)) {
        return { valid: false, reason: `Target node '${nodeId}' is not reachable from start` };
      }
    }

    return { valid: true };
  }

  execute(context: OperatorContext): OperatorResult {
    const validation = this.canExecute(context);
    if (!validation.valid) {
      return this.failureResult(validation.reason!);
    }

    const { graph } = context;
    const maxPaths = context.maxPathsToConsider ?? 100;
    const minProb = context.minProbability ?? 0;

    // Collect all paths to target nodes
    const allPaths: PathResult[] = [];

    if (this.target.mode === 'any') {
      // Find paths to ANY target node
      for (const targetId of this.target.nodeIds) {
        const paths = this.findPathsThrough(graph, targetId, Math.floor(maxPaths / this.target.nodeIds.length));
        allPaths.push(...paths);
      }
    } else {
      // Find paths through ALL target nodes (in order or any order)
      const result = graph.findPathThrough(this.target.nodeIds);
      if (result) {
        allPaths.push(result);
      }
    }

    if (allPaths.length === 0) {
      return this.failureResult('No paths found to target node(s)');
    }

    // Score paths by probability
    const scored = this.rankPaths(
      allPaths,
      graph,
      context,
      (path, prob) => prob // Pure probability scoring
    );

    // Filter by minimum probability
    const validPaths = scored.filter(p => p.probability >= minProb);

    if (validPaths.length === 0) {
      return this.failureResult(
        `No paths meet minimum probability threshold (${minProb}). ` +
        `Best path has probability ${scored[0]?.probability.toFixed(3) ?? 0}`
      );
    }

    const best = validPaths[0];
    const targetNames = this.target.nodeIds.join(', ');

    // Build alternatives
    const alternatives: AlternativePath[] = validPaths.slice(1, 4).map(p => ({
      path: p.path,
      probability: p.probability,
      tradeoffs: `${((1 - p.probability / best.probability) * 100).toFixed(1)}% less likely`,
    }));

    return {
      success: true,
      suggestedPath: best.path,
      suggestedDecisions: this.extractDecisions(
        best.path,
        graph,
        `Maximize probability of reaching ${targetNames}`
      ),
      probability: best.probability,
      rationale: `Selected path with ${(best.probability * 100).toFixed(1)}% probability of reaching ${targetNames}. ` +
        `Considered ${allPaths.length} total paths.`,
      alternatives,
      warnings: best.probability < 0.5
        ? [`Low probability path (${(best.probability * 100).toFixed(1)}%) - may require multiple attempts`]
        : undefined,
    };
  }
}

/**
 * Factory function for creating CauseOperator
 */
export function cause(target: EventTarget | string | string[]): CauseOperator {
  if (typeof target === 'string') {
    return new CauseOperator({ nodeIds: [target], mode: 'any' });
  }

  if (Array.isArray(target)) {
    return new CauseOperator({ nodeIds: target, mode: 'any' });
  }

  return new CauseOperator(target);
}
