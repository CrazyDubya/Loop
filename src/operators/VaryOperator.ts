/**
 * VaryOperator: Find paths with controlled deviation from a reference loop
 *
 * Usage: vary({ referenceLoop: previousLoop, targetDeviation: 'small' })
 * Returns: Path that differs from reference by a specified amount
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

export class VaryOperator extends BaseOperator {
  readonly type: OperatorType = 'vary';
  readonly name = 'Vary';
  readonly description = 'Find paths with controlled deviation from a reference loop';

  private reference: LoopReference;

  // Deviation ranges for each magnitude
  private static readonly DEVIATION_RANGES: Record<string, { min: number; max: number }> = {
    small: { min: 1, max: 2 },
    medium: { min: 3, max: 5 },
    large: { min: 6, max: Infinity },
  };

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
      return { valid: false, reason: 'Reference loop has no decisions to vary from' };
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
    const refVector = refLoop.decision_vector;
    const maxPaths = context.maxPathsToConsider ?? 200;

    // Determine target deviation range
    const { min: minDev, max: maxDev } = this.getDeviationRange();

    // Find all terminal nodes (places loops can end)
    const terminals = graph.getAllNodes().filter(n =>
      n.type === 'death' || n.type === 'reset'
    );

    // Collect all paths to all terminals
    const allPaths: Array<{ path: string[]; terminal: string }> = [];

    for (const terminal of terminals) {
      const paths = graph.findAllPaths(
        graph.startNodeId,
        terminal.id,
        Math.floor(maxPaths / terminals.length) || 20
      );
      for (const p of paths) {
        allPaths.push({ path: p.path, terminal: terminal.id });
      }
    }

    if (allPaths.length === 0) {
      return this.failureResult('No valid paths found in graph');
    }

    // Score paths by how well they match the target deviation
    const scored = allPaths.map(({ path, terminal }) => {
      const pathVector = this.pathToDecisionVector(path, graph);
      const distance = this.hammingDistance(refVector, pathVector);
      const probability = this.getPathProbability(path, graph, context);

      // Score: prefer distances within range, then prefer middle of range
      let score: number;
      if (distance >= minDev && distance <= maxDev) {
        // Within range - prefer middle of range
        const rangeMiddle = (minDev + Math.min(maxDev, minDev + 10)) / 2;
        score = 1000 - Math.abs(distance - rangeMiddle) + probability;
      } else if (distance < minDev) {
        // Too similar - penalize
        score = -100 + distance;
      } else {
        // Too different - mild penalty
        score = 500 - distance;
      }

      return {
        path,
        vector: pathVector,
        distance,
        probability,
        terminal,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Find paths within target range
    const validPaths = scored.filter(p => p.distance >= minDev && p.distance <= maxDev);

    if (validPaths.length === 0) {
      // No paths in target range - suggest closest
      const closest = scored[0];
      const magnitude = this.reference.targetDeviation ?? 'medium';

      return {
        success: false,
        suggestedPath: closest.path,
        suggestedDecisions: this.extractDecisions(
          closest.path,
          graph,
          `Vary from loop #${refLoop.sequence_number}`
        ),
        probability: closest.probability,
        rationale: `No paths found with ${magnitude} deviation (${minDev}-${maxDev} decisions). ` +
          `Closest path has distance ${closest.distance}.`,
        warnings: closest.distance < minDev
          ? [`Path is too similar (${closest.distance} < ${minDev}). Consider 'relive' instead.`]
          : [`Path differs too much (${closest.distance} > ${maxDev}). Try 'large' deviation.`],
      };
    }

    const best = validPaths[0];
    const magnitude = this.reference.targetDeviation ?? 'medium';

    // Identify what changed
    const changes = this.describeChanges(refVector, best.vector, refLoop, graph);

    // Build alternatives
    const alternatives: AlternativePath[] = validPaths.slice(1, 4).map(p => ({
      path: p.path,
      probability: p.probability,
      tradeoffs: `Distance: ${p.distance}, Terminal: ${p.terminal}`,
    }));

    return {
      success: true,
      suggestedPath: best.path,
      suggestedDecisions: this.extractDecisions(
        best.path,
        graph,
        `${magnitude} variation from loop #${refLoop.sequence_number}`
      ),
      probability: best.probability,
      rationale: `Found ${magnitude} variation (${best.distance} decisions different). ` +
        `${changes} ` +
        `Probability: ${(best.probability * 100).toFixed(1)}%.`,
      alternatives,
    };
  }

  /**
   * Get deviation range based on target magnitude
   */
  private getDeviationRange(): { min: number; max: number } {
    const magnitude = this.reference.targetDeviation ?? 'medium';

    // Use explicit min/max if provided
    if (this.reference.minDeviation !== undefined || this.reference.maxDeviation !== undefined) {
      return {
        min: this.reference.minDeviation ?? 1,
        max: this.reference.maxDeviation ?? Infinity,
      };
    }

    return VaryOperator.DEVIATION_RANGES[magnitude] ?? VaryOperator.DEVIATION_RANGES.medium;
  }

  /**
   * Describe what changed between vectors
   */
  private describeChanges(
    refVector: number[],
    newVector: number[],
    refLoop: Loop,
    graph: DayGraph
  ): string {
    const changes: string[] = [];
    const maxLen = Math.max(refVector.length, newVector.length);

    for (let i = 0; i < maxLen; i++) {
      const refVal = refVector[i];
      const newVal = newVector[i];

      if (refVal !== newVal) {
        if (refVal !== undefined && newVal !== undefined) {
          changes.push(`Decision ${i + 1}: ${refVal} → ${newVal}`);
        } else if (refVal !== undefined) {
          changes.push(`Decision ${i + 1}: skipped`);
        } else {
          changes.push(`Decision ${i + 1}: added (${newVal})`);
        }
      }
    }

    if (changes.length === 0) {
      return 'No decision changes (path differs in non-decision nodes).';
    }

    if (changes.length <= 3) {
      return `Changes: ${changes.join(', ')}.`;
    }

    return `Changes: ${changes.slice(0, 2).join(', ')}, and ${changes.length - 2} more.`;
  }
}

/**
 * Factory function for creating VaryOperator
 */
export function vary(
  referenceLoop: Loop,
  magnitude: 'small' | 'medium' | 'large' = 'medium'
): VaryOperator {
  return new VaryOperator({
    referenceLoop,
    targetDeviation: magnitude,
  });
}

/**
 * Factory function with explicit deviation range
 */
export function varyBy(
  referenceLoop: Loop,
  minDeviation: number,
  maxDeviation?: number
): VaryOperator {
  return new VaryOperator({
    referenceLoop,
    minDeviation,
    maxDeviation,
  });
}
