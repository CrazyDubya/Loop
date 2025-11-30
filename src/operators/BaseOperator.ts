/**
 * BaseOperator: Common functionality for all operators
 */

import { DayGraph, GraphNode, GraphEdge, PathResult } from '../graph';
import { Loop, Decision, OperatorType } from '../loop';
import {
  Operator,
  OperatorContext,
  OperatorResult,
  SuggestedDecision,
  AlternativePath,
  EdgeProbability,
} from './types';

export abstract class BaseOperator implements Operator {
  abstract readonly type: OperatorType;
  abstract readonly name: string;
  abstract readonly description: string;

  abstract execute(context: OperatorContext): OperatorResult;

  canExecute(context: OperatorContext): { valid: boolean; reason?: string } {
    if (!context.graph) {
      return { valid: false, reason: 'No graph provided' };
    }

    if (context.graph.nodeCount === 0) {
      return { valid: false, reason: 'Graph has no nodes' };
    }

    return { valid: true };
  }

  /**
   * Calculate base probability for an edge
   */
  protected getEdgeProbability(edge: GraphEdge, context: OperatorContext): number {
    let prob = edge.weight ?? 1.0;

    // Apply knowledge-based modifiers
    if (edge.conditions?.requires_knowledge && context.knownFacts) {
      const hasAllKnowledge = edge.conditions.requires_knowledge.every(
        k => context.knownFacts!.has(k)
      );
      if (!hasAllKnowledge) {
        prob = 0; // Can't traverse without required knowledge
      }
    }

    return Math.min(1, Math.max(0, prob));
  }

  /**
   * Calculate path probability (product of edge probabilities)
   */
  protected getPathProbability(
    path: string[],
    graph: DayGraph,
    context: OperatorContext
  ): number {
    if (path.length < 2) return 1.0;

    let probability = 1.0;

    for (let i = 0; i < path.length - 1; i++) {
      const edges = graph.getOutgoingEdges(path[i]);
      const edge = edges.find(e => e.target_id === path[i + 1]);

      if (!edge) {
        return 0; // No edge means impossible
      }

      probability *= this.getEdgeProbability(edge, context);
    }

    return probability;
  }

  /**
   * Extract decisions from a path through the graph
   */
  protected extractDecisions(
    path: string[],
    graph: DayGraph,
    rationale: string
  ): SuggestedDecision[] {
    const decisions: SuggestedDecision[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const node = graph.getNode(path[i]);
      if (!node) continue;

      // Only decision nodes require explicit choices
      if (node.type === 'decision' && node.choices) {
        const nextNodeId = path[i + 1];
        const edges = graph.getOutgoingEdges(path[i]);
        const targetEdge = edges.find(e => e.target_id === nextNodeId);

        if (targetEdge) {
          const choice = node.choices.find(c => c.target_edge_id === targetEdge.id);
          if (choice) {
            decisions.push({
              nodeId: node.id,
              choiceIndex: choice.index,
              choiceLabel: choice.label,
              confidence: choice.probability_weight ?? 0.5,
              rationale,
            });
          }
        }
      }
    }

    return decisions;
  }

  /**
   * Score paths and rank them
   */
  protected rankPaths(
    paths: PathResult[],
    graph: DayGraph,
    context: OperatorContext,
    scorer: (path: string[], prob: number) => number
  ): Array<{ path: string[]; score: number; probability: number }> {
    const scored = paths.map(p => {
      const probability = this.getPathProbability(p.path, graph, context);
      const score = scorer(p.path, probability);
      return { path: p.path, score, probability };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Create a failure result
   */
  protected failureResult(reason: string): OperatorResult {
    return {
      success: false,
      suggestedPath: [],
      suggestedDecisions: [],
      probability: 0,
      rationale: reason,
      warnings: [reason],
    };
  }

  /**
   * Find all paths that pass through a target node
   */
  protected findPathsThrough(
    graph: DayGraph,
    targetNodeId: string,
    maxPaths: number = 50
  ): PathResult[] {
    const startNode = graph.startNodeId;

    // Find paths from start to target
    const pathsToTarget = graph.findAllPaths(startNode, targetNodeId, maxPaths);

    return pathsToTarget;
  }

  /**
   * Find all paths that avoid a target node
   */
  protected findPathsAvoiding(
    graph: DayGraph,
    avoidNodeIds: Set<string>,
    terminalTypes: string[] = ['death', 'reset'],
    maxPaths: number = 50
  ): PathResult[] {
    const results: PathResult[] = [];
    const startNode = graph.startNodeId;

    // Find terminal nodes
    const terminals = graph.getAllNodes().filter(n =>
      terminalTypes.includes(n.type) && !avoidNodeIds.has(n.id)
    );

    for (const terminal of terminals) {
      const paths = graph.findAllPaths(startNode, terminal.id, Math.floor(maxPaths / terminals.length) || 10);

      // Filter paths that don't go through avoided nodes
      const validPaths = paths.filter(p =>
        !p.path.some(nodeId => avoidNodeIds.has(nodeId))
      );

      results.push(...validPaths);
    }

    return results;
  }

  /**
   * Calculate Hamming distance between decision vectors
   */
  protected hammingDistance(v1: number[], v2: number[]): number {
    const maxLen = Math.max(v1.length, v2.length);
    let distance = 0;

    for (let i = 0; i < maxLen; i++) {
      const val1 = v1[i] ?? -1;
      const val2 = v2[i] ?? -1;
      if (val1 !== val2) {
        distance++;
      }
    }

    return distance;
  }

  /**
   * Extract decision vector from a path
   */
  protected pathToDecisionVector(path: string[], graph: DayGraph): number[] {
    const vector: number[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const node = graph.getNode(path[i]);
      if (!node || node.type !== 'decision' || !node.choices) continue;

      const nextNodeId = path[i + 1];
      const edges = graph.getOutgoingEdges(path[i]);
      const targetEdge = edges.find(e => e.target_id === nextNodeId);

      if (targetEdge) {
        const choice = node.choices.find(c => c.target_edge_id === targetEdge.id);
        if (choice) {
          vector.push(choice.index);
        }
      }
    }

    return vector;
  }
}
