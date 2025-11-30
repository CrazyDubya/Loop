/**
 * AvoidOperator: Find paths that minimize probability of reaching target event(s)
 *
 * Usage: avoid({ nodeIds: ['explosion'], mode: 'all' })
 * Returns: Path least likely to reach any explosion node
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

export class AvoidOperator extends BaseOperator {
  readonly type: OperatorType = 'avoid';
  readonly name = 'Avoid';
  readonly description = 'Find paths that minimize probability of reaching target event(s)';

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

    return { valid: true };
  }

  execute(context: OperatorContext): OperatorResult {
    const validation = this.canExecute(context);
    if (!validation.valid) {
      return this.failureResult(validation.reason!);
    }

    const { graph } = context;
    const maxPaths = context.maxPathsToConsider ?? 100;
    const avoidSet = new Set(this.target.nodeIds);

    // Find paths that don't go through avoided nodes
    const safePaths = this.findPathsAvoiding(graph, avoidSet, ['death', 'reset'], maxPaths);

    if (safePaths.length === 0) {
      // All paths go through the avoided nodes - this might be impossible to avoid
      return {
        success: false,
        suggestedPath: [],
        suggestedDecisions: [],
        probability: 0,
        rationale: `Cannot find any path that avoids ${this.target.nodeIds.join(', ')}. ` +
          'All paths lead through the avoided events.',
        warnings: [
          'Avoidance may be impossible given the graph structure',
          'Consider if the avoided events are truly avoidable',
        ],
      };
    }

    // Score paths - prefer those with highest probability that avoid targets
    const scored = this.rankPaths(
      safePaths,
      graph,
      context,
      (path, prob) => prob // Probability of completing the safe path
    );

    const best = scored[0];
    const targetNames = this.target.nodeIds.join(', ');

    // Calculate how "safely" we avoid (distance from avoided nodes)
    const safetyScore = this.calculateSafetyScore(best.path, graph, avoidSet);

    // Build alternatives
    const alternatives: AlternativePath[] = scored.slice(1, 4).map(p => ({
      path: p.path,
      probability: p.probability,
      tradeoffs: this.describeSafetyTradeoff(p.path, best.path, graph, avoidSet),
    }));

    return {
      success: true,
      suggestedPath: best.path,
      suggestedDecisions: this.extractDecisions(
        best.path,
        graph,
        `Avoid ${targetNames}`
      ),
      probability: best.probability,
      rationale: `Selected path that avoids ${targetNames} with ${(best.probability * 100).toFixed(1)}% success probability. ` +
        `Safety margin: ${safetyScore.toFixed(1)} nodes away from danger. ` +
        `Considered ${safePaths.length} safe paths.`,
      alternatives,
      warnings: safetyScore < 2
        ? ['Path passes close to avoided events - small deviations could lead to them']
        : undefined,
    };
  }

  /**
   * Calculate how "safely" a path avoids the target nodes
   * Higher score = more distance from avoided nodes
   */
  private calculateSafetyScore(path: string[], graph: DayGraph, avoidSet: Set<string>): number {
    let minDistance = Infinity;

    for (const nodeId of path) {
      // Check distance to each avoided node
      for (const avoidId of avoidSet) {
        // Simple heuristic: count edges between path node and avoided node
        const node = graph.getNode(nodeId);
        const neighbors = graph.getNeighbors(nodeId);

        if (neighbors.some(n => avoidSet.has(n))) {
          minDistance = Math.min(minDistance, 1);
        } else {
          // Check 2-hop neighbors
          for (const neighbor of neighbors) {
            const secondNeighbors = graph.getNeighbors(neighbor);
            if (secondNeighbors.some(n => avoidSet.has(n))) {
              minDistance = Math.min(minDistance, 2);
            }
          }
        }
      }
    }

    return minDistance === Infinity ? 10 : minDistance;
  }

  /**
   * Describe the safety tradeoff between two paths
   */
  private describeSafetyTradeoff(
    path: string[],
    bestPath: string[],
    graph: DayGraph,
    avoidSet: Set<string>
  ): string {
    const pathSafety = this.calculateSafetyScore(path, graph, avoidSet);
    const bestSafety = this.calculateSafetyScore(bestPath, graph, avoidSet);

    if (pathSafety < bestSafety) {
      return `Closer to danger (${pathSafety} vs ${bestSafety} nodes away)`;
    } else if (pathSafety > bestSafety) {
      return `Safer route (${pathSafety} vs ${bestSafety} nodes away)`;
    }
    return 'Similar safety level';
  }
}

/**
 * Factory function for creating AvoidOperator
 */
export function avoid(target: EventTarget | string | string[]): AvoidOperator {
  if (typeof target === 'string') {
    return new AvoidOperator({ nodeIds: [target], mode: 'all' });
  }

  if (Array.isArray(target)) {
    return new AvoidOperator({ nodeIds: target, mode: 'all' });
  }

  return new AvoidOperator(target);
}
