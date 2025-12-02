/**
 * ReliveOperator: Find paths that minimize deviation from a reference loop
 *
 * Usage: relive({ referenceLoop: previousLoop, maxDeviation: 2 })
 * Returns: Path that matches the reference as closely as possible
 */

import { DayGraph, PathResult } from '../graph';
import { Loop, OperatorType } from '../loop';
import { BaseOperator } from './BaseOperator';
import {
  OperatorContext,
  OperatorResult,
  LoopReference,
  AlternativePath,
} from './types';

export class ReliveOperator extends BaseOperator {
  readonly type: OperatorType = 'relive';
  readonly name = 'Relive';
  readonly description = 'Find paths that minimize deviation from a reference loop';

  private reference: LoopReference;

  constructor(reference: LoopReference) {
    super();
    this.reference = reference;
  }

  canExecute(context: OperatorContext): { valid: boolean; reason?: string } {
    const baseCheck = super.canExecute(context);
    if (!baseCheck.valid) return baseCheck;

    const refLoop = this.reference.referenceLoop;

    if (!refLoop.path || refLoop.path.length === 0) {
      return { valid: false, reason: 'Reference loop has no path' };
    }

    if (refLoop.decision_vector.length === 0) {
      return { valid: false, reason: 'Reference loop has no decisions' };
    }

    // Check that the reference path nodes exist in this graph
    for (const nodeId of refLoop.path) {
      if (!context.graph.hasNode(nodeId)) {
        return {
          valid: false,
          reason: `Reference path node '${nodeId}' does not exist in current graph`,
        };
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
    const refLoop = this.reference.referenceLoop;
    const maxDev = this.reference.maxDeviation ?? 0;

    // If maxDeviation is 0, try to exactly replicate the path
    if (maxDev === 0) {
      return this.exactRelive(context);
    }

    // Otherwise, find paths within deviation tolerance
    return this.tolerantRelive(context);
  }

  /**
   * Attempt to exactly replicate the reference path
   */
  private exactRelive(context: OperatorContext): OperatorResult {
    const { graph } = context;
    const refLoop = this.reference.referenceLoop;
    const refPath = refLoop.path!;

    // Verify the exact path is still valid
    const pathValid = this.verifyPath(refPath, graph, context);

    if (pathValid.valid) {
      const probability = this.getPathProbability(refPath, graph, context);

      return {
        success: true,
        suggestedPath: refPath,
        suggestedDecisions: this.replicateDecisions(refLoop, graph),
        probability,
        rationale: `Exact replication of loop #${refLoop.sequence_number}. ` +
          `Path probability: ${(probability * 100).toFixed(1)}%. ` +
          `Decision vector: [${refLoop.decision_vector.join(', ')}]`,
        warnings: probability < 0.5
          ? ['Reference path has low probability - conditions may have changed']
          : undefined,
      };
    }

    // Path is no longer valid - explain why
    return {
      success: false,
      suggestedPath: [],
      suggestedDecisions: [],
      probability: 0,
      rationale: `Cannot exactly replicate loop #${refLoop.sequence_number}: ${pathValid.reason}`,
      warnings: [
        'Reference path is no longer valid',
        'Consider using relive with maxDeviation > 0',
      ],
    };
  }

  /**
   * Find closest path within deviation tolerance
   */
  private tolerantRelive(context: OperatorContext): OperatorResult {
    const { graph } = context;
    const refLoop = this.reference.referenceLoop;
    const refPath = refLoop.path!;
    const refVector = refLoop.decision_vector;
    const maxDev = this.reference.maxDeviation ?? 2;
    const maxPaths = context.maxPathsToConsider ?? 100;

    // Find terminal node (where the reference ended)
    const terminalNode = refPath[refPath.length - 1];

    // Find all paths to the same terminal
    const allPaths = graph.findAllPaths(graph.startNodeId, terminalNode, maxPaths);

    if (allPaths.length === 0) {
      return this.failureResult(
        `Cannot reach terminal node '${terminalNode}' from start`
      );
    }

    // Score paths by distance from reference decision vector
    const scored = allPaths.map(p => {
      const pathVector = this.pathToDecisionVector(p.path, graph);
      const distance = this.hammingDistance(refVector, pathVector);
      const probability = this.getPathProbability(p.path, graph, context);

      return {
        path: p.path,
        vector: pathVector,
        distance,
        probability,
        // Prefer low distance, then high probability
        score: distance <= maxDev ? (1000 - distance) + probability : -distance,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Find paths within tolerance
    const validPaths = scored.filter(p => p.distance <= maxDev);

    if (validPaths.length === 0) {
      const closest = scored[0];
      return {
        success: false,
        suggestedPath: closest.path,
        suggestedDecisions: this.extractDecisions(
          closest.path,
          graph,
          `Closest to loop #${refLoop.sequence_number}`
        ),
        probability: closest.probability,
        rationale: `No paths within deviation tolerance (max: ${maxDev}). ` +
          `Closest path has distance ${closest.distance}.`,
        warnings: [
          `Closest match deviates by ${closest.distance} decisions`,
          `Consider increasing maxDeviation to ${closest.distance}`,
        ],
      };
    }

    const best = validPaths[0];

    // Build alternatives
    const alternatives: AlternativePath[] = validPaths.slice(1, 4).map(p => ({
      path: p.path,
      probability: p.probability,
      tradeoffs: `Distance: ${p.distance} decisions, ` +
        `Probability: ${(p.probability * 100).toFixed(1)}%`,
    }));

    return {
      success: true,
      suggestedPath: best.path,
      suggestedDecisions: this.extractDecisions(
        best.path,
        graph,
        `Relive loop #${refLoop.sequence_number} (distance: ${best.distance})`
      ),
      probability: best.probability,
      rationale: `Found path within tolerance (distance: ${best.distance}/${maxDev}). ` +
        `Probability: ${(best.probability * 100).toFixed(1)}%. ` +
        `Reference vector: [${refVector.join(', ')}], ` +
        `New vector: [${best.vector.join(', ')}]`,
      alternatives,
      warnings: best.distance > 0
        ? [`Path deviates by ${best.distance} decision(s) from reference`]
        : undefined,
    };
  }

  /**
   * Verify a path is still valid in the graph
   */
  private verifyPath(
    path: string[],
    graph: DayGraph,
    context: OperatorContext
  ): { valid: boolean; reason?: string } {
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      // Check edge exists
      const edges = graph.getOutgoingEdges(from);
      const edge = edges.find(e => e.target_id === to);

      if (!edge) {
        return {
          valid: false,
          reason: `No edge from '${from}' to '${to}'`,
        };
      }

      // Check edge conditions
      if (edge.conditions?.requires_knowledge && context.knownFacts) {
        const hasKnowledge = edge.conditions.requires_knowledge.every(
          k => context.knownFacts!.has(k)
        );
        if (!hasKnowledge) {
          return {
            valid: false,
            reason: `Missing required knowledge for edge from '${from}' to '${to}'`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Replicate decisions from reference loop
   */
  private replicateDecisions(refLoop: Loop, graph: DayGraph): OperatorResult['suggestedDecisions'] {
    return refLoop.decisions.map(d => ({
      nodeId: d.node_id,
      choiceIndex: d.choice_index,
      choiceLabel: d.choice_label,
      confidence: 1.0, // High confidence when replicating
      rationale: `Replicating decision from loop #${refLoop.sequence_number}`,
    }));
  }
}

/**
 * Factory function for creating ReliveOperator
 */
export function relive(reference: LoopReference | Loop): ReliveOperator {
  if ('referenceLoop' in reference) {
    return new ReliveOperator(reference);
  }

  return new ReliveOperator({ referenceLoop: reference, maxDeviation: 0 });
}
