/**
 * TriggerOperator: Find paths that pass through a specific sequence of nodes
 *
 * Usage: trigger({ nodeIds: ['bank', 'vault', 'escape'], strict: false })
 * Returns: Path that visits bank, then vault, then escape (with possible intermediate nodes)
 */

import { DayGraph, PathResult } from '../graph';
import { OperatorType } from '../loop';
import { BaseOperator } from './BaseOperator';
import {
  OperatorContext,
  OperatorResult,
  SequenceTarget,
  AlternativePath,
} from './types';

export class TriggerOperator extends BaseOperator {
  readonly type: OperatorType = 'trigger';
  readonly name = 'Trigger';
  readonly description = 'Find paths that pass through a specific sequence of nodes';

  private target: SequenceTarget;

  constructor(target: SequenceTarget) {
    super();
    this.target = target;
  }

  canExecute(context: OperatorContext): { valid: boolean; reason?: string } {
    const baseCheck = super.canExecute(context);
    if (!baseCheck.valid) return baseCheck;

    if (this.target.nodeIds.length === 0) {
      return { valid: false, reason: 'Sequence must contain at least one node' };
    }

    // Check that all sequence nodes exist
    for (const nodeId of this.target.nodeIds) {
      if (!context.graph.hasNode(nodeId)) {
        return { valid: false, reason: `Sequence node '${nodeId}' does not exist` };
      }
    }

    // Check that each node in sequence can reach the next
    for (let i = 0; i < this.target.nodeIds.length - 1; i++) {
      const from = this.target.nodeIds[i];
      const to = this.target.nodeIds[i + 1];

      if (!context.graph.canReach(from, to)) {
        return {
          valid: false,
          reason: `Cannot reach '${to}' from '${from}' in sequence`,
        };
      }
    }

    // Check that start can reach first node in sequence
    const firstNode = this.target.nodeIds[0];
    if (!context.graph.canReach(context.graph.startNodeId, firstNode)) {
      return {
        valid: false,
        reason: `Cannot reach first sequence node '${firstNode}' from start`,
      };
    }

    return { valid: true };
  }

  execute(context: OperatorContext): OperatorResult {
    const validation = this.canExecute(context);
    if (!validation.valid) {
      return this.failureResult(validation.reason!);
    }

    const { graph } = context;

    // Build full sequence including start node
    const fullSequence = [graph.startNodeId, ...this.target.nodeIds];

    // Remove duplicates while maintaining order
    const uniqueSequence = fullSequence.filter(
      (id, index) => fullSequence.indexOf(id) === index
    );

    // Find path through the sequence
    const result = graph.findPathThrough(uniqueSequence);

    if (!result || !result.found) {
      return this.failureResult(
        `Cannot find path through sequence: ${this.target.nodeIds.join(' → ')}`
      );
    }

    // Validate strict mode if required
    if (this.target.strict) {
      const isStrict = this.isStrictSequence(result.path, this.target.nodeIds);
      if (!isStrict) {
        return {
          success: false,
          suggestedPath: result.path,
          suggestedDecisions: this.extractDecisions(
            result.path,
            graph,
            `Trigger sequence: ${this.target.nodeIds.join(' → ')}`
          ),
          probability: this.getPathProbability(result.path, graph, context),
          rationale: `Found path but it contains intermediate nodes between sequence points. ` +
            `Strict mode requires direct transitions.`,
          warnings: ['Path contains intermediate nodes not in the target sequence'],
        };
      }
    }

    const probability = this.getPathProbability(result.path, graph, context);
    const sequenceStr = this.target.nodeIds.join(' → ');

    // Try to find alternative paths
    const alternatives = this.findAlternativePaths(graph, context, result.path);

    return {
      success: true,
      suggestedPath: result.path,
      suggestedDecisions: this.extractDecisions(
        result.path,
        graph,
        `Trigger sequence: ${sequenceStr}`
      ),
      probability,
      rationale: `Found path through sequence ${sequenceStr} with ${(probability * 100).toFixed(1)}% probability. ` +
        `Path length: ${result.path.length} nodes.`,
      alternatives,
      warnings: probability < 0.5
        ? [`Low probability path (${(probability * 100).toFixed(1)}%)`]
        : undefined,
    };
  }

  /**
   * Check if a path follows the sequence strictly (no intermediate nodes between sequence points)
   */
  private isStrictSequence(path: string[], sequence: string[]): boolean {
    let seqIndex = 0;

    for (const nodeId of path) {
      if (nodeId === sequence[seqIndex]) {
        seqIndex++;
        if (seqIndex >= sequence.length) {
          return true; // Found all sequence nodes
        }
      } else if (seqIndex > 0) {
        // We've started the sequence but found an intermediate node
        return false;
      }
    }

    return seqIndex >= sequence.length;
  }

  /**
   * Find alternative paths through the same sequence
   */
  private findAlternativePaths(
    graph: DayGraph,
    context: OperatorContext,
    primaryPath: string[]
  ): AlternativePath[] {
    const alternatives: AlternativePath[] = [];

    // Try to find paths with different intermediate routes
    for (let i = 0; i < this.target.nodeIds.length - 1; i++) {
      const from = this.target.nodeIds[i];
      const to = this.target.nodeIds[i + 1];

      const allPaths = graph.findAllPaths(from, to, 5);

      for (const altPath of allPaths) {
        if (altPath.path.length > 2) {
          // Found a path with intermediate nodes
          const fullAltPath = this.buildFullAlternativePath(
            graph,
            this.target.nodeIds,
            i,
            altPath.path
          );

          if (fullAltPath && !this.pathsEqual(fullAltPath, primaryPath)) {
            const prob = this.getPathProbability(fullAltPath, graph, context);
            alternatives.push({
              path: fullAltPath,
              probability: prob,
              tradeoffs: `Different route between ${from} and ${to}`,
            });
          }
        }
      }
    }

    return alternatives.slice(0, 3);
  }

  /**
   * Build a full path using an alternative segment
   */
  private buildFullAlternativePath(
    graph: DayGraph,
    sequence: string[],
    segmentIndex: number,
    altSegment: string[]
  ): string[] | null {
    const fullPath: string[] = [];

    // Path from start to first sequence node
    const toFirst = graph.findPath(graph.startNodeId, sequence[0]);
    if (!toFirst.found) return null;
    fullPath.push(...toFirst.path);

    // Add segments between sequence nodes
    for (let i = 0; i < sequence.length - 1; i++) {
      if (i === segmentIndex) {
        // Use alternative segment
        fullPath.push(...altSegment.slice(1));
      } else {
        // Use normal segment
        const segment = graph.findPath(sequence[i], sequence[i + 1]);
        if (!segment.found) return null;
        fullPath.push(...segment.path.slice(1));
      }
    }

    return fullPath;
  }

  /**
   * Check if two paths are equal
   */
  private pathsEqual(path1: string[], path2: string[]): boolean {
    if (path1.length !== path2.length) return false;
    return path1.every((id, i) => id === path2[i]);
  }
}

/**
 * Factory function for creating TriggerOperator
 */
export function trigger(target: SequenceTarget | string[]): TriggerOperator {
  if (Array.isArray(target)) {
    return new TriggerOperator({ nodeIds: target, strict: false });
  }

  return new TriggerOperator(target);
}
