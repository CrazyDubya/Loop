/**
 * ConsistencyChecker - Comprehensive validation system
 *
 * Combines schema validation, invariant checking, and contradiction detection
 * into a single unified interface. Provides detailed reports with repair suggestions.
 */

import { DayGraph, DayGraphData } from '../graph';
import { Loop, LoopStore } from '../loop';
import {
  checkLoopInvariants,
  checkGraphInvariants,
  checkKnowledgeInvariants,
  InvariantViolation,
} from './Invariants';
import {
  detectLoopContradictions,
  detectKnowledgeContradictions,
  detectEquivalenceContradictions,
  Contradiction,
  KnowledgeState,
} from './ContradictionDetector';

export interface RepairSuggestion {
  issue: string;
  action: string;
  automated: boolean; // Can this be auto-fixed?
  priority: 'critical' | 'high' | 'medium' | 'low';
  code?: string; // Example code to fix
}

export interface ConsistencyIssue {
  category: 'schema' | 'invariant' | 'contradiction' | 'reference';
  severity: 'error' | 'warning';
  message: string;
  entityType: 'loop' | 'graph' | 'knowledge_state' | 'equivalence_class';
  entityId: string;
  context: Record<string, unknown>;
  repairs: RepairSuggestion[];
}

export interface ConsistencyReport {
  valid: boolean;
  issues: ConsistencyIssue[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    byCategory: Record<string, number>;
    byEntityType: Record<string, number>;
  };
  checkedAt: string;
  duration: number; // milliseconds
}

export interface CheckOptions {
  checkInvariants?: boolean;
  checkContradictions?: boolean;
  checkReferences?: boolean;
  maxIssues?: number;
}

const DEFAULT_OPTIONS: CheckOptions = {
  checkInvariants: true,
  checkContradictions: true,
  checkReferences: true,
  maxIssues: 1000,
};

/**
 * Main ConsistencyChecker class
 */
export class ConsistencyChecker {
  private graph?: DayGraph;
  private store?: LoopStore;
  private knowledgeStates: Map<string, KnowledgeState> = new Map();

  constructor(options?: {
    graph?: DayGraph;
    store?: LoopStore;
  }) {
    this.graph = options?.graph;
    this.store = options?.store;
  }

  setGraph(graph: DayGraph): void {
    this.graph = graph;
  }

  setStore(store: LoopStore): void {
    this.store = store;
  }

  addKnowledgeState(state: KnowledgeState): void {
    this.knowledgeStates.set(state.id, state);
  }

  /**
   * Check a single loop for consistency
   */
  checkLoop(loop: Loop, options: CheckOptions = {}): ConsistencyReport {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    const issues: ConsistencyIssue[] = [];

    // Invariant checks
    if (opts.checkInvariants && this.graph) {
      const graphData = this.graph.toJSON();
      const invariantResult = checkLoopInvariants(loop, graphData as any);
      for (const violation of invariantResult.violations) {
        issues.push(this.invariantToIssue(violation, 'loop', loop.id));
      }
    }

    // Contradiction checks
    if (opts.checkContradictions && this.graph) {
      const contradictions = detectLoopContradictions(loop, this.graph);
      for (const contradiction of contradictions.contradictions) {
        issues.push(this.contradictionToIssue(contradiction, 'loop', loop.id));
      }
    }

    // Reference checks
    if (opts.checkReferences && this.graph) {
      const refIssues = this.checkLoopReferences(loop);
      issues.push(...refIssues);
    }

    return this.buildReport(issues, startTime);
  }

  /**
   * Check a graph for consistency
   */
  checkGraph(graph: DayGraph, options: CheckOptions = {}): ConsistencyReport {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    const issues: ConsistencyIssue[] = [];

    if (opts.checkInvariants) {
      const graphData = graph.toJSON();
      const invariantResult = checkGraphInvariants(graphData as any);
      for (const violation of invariantResult.violations) {
        issues.push(this.invariantToIssue(violation, 'graph', graphData.id));
      }
    }

    // Check for structural issues
    const structuralIssues = this.checkGraphStructure(graph);
    issues.push(...structuralIssues);

    return this.buildReport(issues, startTime);
  }

  /**
   * Check all loops in the store
   */
  async checkAllLoops(options: CheckOptions = {}): Promise<ConsistencyReport> {
    if (!this.store) {
      throw new Error('Store not set. Call setStore() first.');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    const issues: ConsistencyIssue[] = [];

    const loops = await this.store.getAllLoops();
    for (const loop of loops) {
      if (issues.length >= (opts.maxIssues || 1000)) break;

      const loopReport = this.checkLoop(loop, opts);
      issues.push(...loopReport.issues);
    }

    // Check equivalence class consistency
    if (opts.checkContradictions) {
      const eqContradictions = await detectEquivalenceContradictions(this.store);
      for (const contradiction of eqContradictions) {
        issues.push(this.contradictionToIssue(
          contradiction,
          'equivalence_class',
          contradiction.entities[0]
        ));
      }
    }

    return this.buildReport(issues, startTime);
  }

  /**
   * Check knowledge states for consistency
   */
  checkKnowledgeStates(options: CheckOptions = {}): ConsistencyReport {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    const issues: ConsistencyIssue[] = [];

    const states = Array.from(this.knowledgeStates.values());

    // Check each state's invariants
    if (opts.checkInvariants) {
      for (const state of states) {
        const parent = state.parent_id
          ? this.knowledgeStates.get(state.parent_id)
          : undefined;

        const result = checkKnowledgeInvariants(state as any, parent as any);
        for (const violation of result.violations) {
          issues.push(this.invariantToIssue(violation, 'knowledge_state', state.id));
        }
      }
    }

    // Check for contradictions
    if (opts.checkContradictions) {
      const contradictions = detectKnowledgeContradictions(states as any);
      for (const contradiction of contradictions) {
        issues.push(this.contradictionToIssue(
          contradiction,
          'knowledge_state',
          contradiction.entities[0]
        ));
      }
    }

    return this.buildReport(issues, startTime);
  }

  /**
   * Full system consistency check
   */
  async checkAll(options: CheckOptions = {}): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const allIssues: ConsistencyIssue[] = [];

    // Check graph
    if (this.graph) {
      const graphReport = this.checkGraph(this.graph, options);
      allIssues.push(...graphReport.issues);
    }

    // Check all loops
    if (this.store) {
      const loopReport = await this.checkAllLoops(options);
      allIssues.push(...loopReport.issues);
    }

    // Check knowledge states
    if (this.knowledgeStates.size > 0) {
      const ksReport = this.checkKnowledgeStates(options);
      allIssues.push(...ksReport.issues);
    }

    return this.buildReport(allIssues, startTime);
  }

  // Private helper methods

  private checkLoopReferences(loop: Loop): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    if (!this.graph) return issues;

    // Check decision node references
    for (const decision of loop.decisions) {
      const node = this.graph.getNode(decision.node_id);
      if (!node) {
        issues.push({
          category: 'reference',
          severity: 'error',
          message: `Decision references non-existent node: ${decision.node_id}`,
          entityType: 'loop',
          entityId: loop.id,
          context: {
            decision_id: decision.id,
            node_id: decision.node_id,
          },
          repairs: [
            {
              issue: `Node ${decision.node_id} does not exist`,
              action: `Add the missing node to the graph or update the decision to reference an existing node`,
              automated: false,
              priority: 'critical',
            },
          ],
        });
      } else if (node.type !== 'decision') {
        issues.push({
          category: 'reference',
          severity: 'warning',
          message: `Decision references non-decision node: ${decision.node_id} (type: ${node.type})`,
          entityType: 'loop',
          entityId: loop.id,
          context: {
            decision_id: decision.id,
            node_id: decision.node_id,
            node_type: node.type,
          },
          repairs: [
            {
              issue: `Decision references a ${node.type} node instead of a decision node`,
              action: `Change the node type to 'decision' or update the loop to remove this decision`,
              automated: false,
              priority: 'medium',
            },
          ],
        });
      }
    }

    // Check path node references
    if (loop.path) {
      for (const nodeId of loop.path) {
        const node = this.graph.getNode(nodeId);
        if (!node) {
          issues.push({
            category: 'reference',
            severity: 'error',
            message: `Path references non-existent node: ${nodeId}`,
            entityType: 'loop',
            entityId: loop.id,
            context: { node_id: nodeId },
            repairs: [
              {
                issue: `Node ${nodeId} in path does not exist`,
                action: `Add the missing node to the graph or remove it from the loop path`,
                automated: false,
                priority: 'critical',
              },
            ],
          });
        }
      }
    }

    return issues;
  }

  private checkGraphStructure(graph: DayGraph): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const graphData = graph.toJSON();

    // Check for cycles (should be DAG)
    const cycles = this.detectCycles(graph);
    for (const cycle of cycles) {
      issues.push({
        category: 'invariant',
        severity: 'error',
        message: `Cycle detected in graph: ${cycle.join(' -> ')}`,
        entityType: 'graph',
        entityId: graphData.id,
        context: { cycle },
        repairs: [
          {
            issue: `Graph contains a cycle which violates DAG requirement`,
            action: `Remove one of the edges in the cycle: ${cycle.join(' -> ')}`,
            automated: false,
            priority: 'critical',
          },
        ],
      });
    }

    // Check for dead ends (nodes with no outgoing edges, except terminal nodes)
    const terminalTypes = new Set(['death', 'reset']);
    for (const node of graph.getAllNodes()) {
      if (terminalTypes.has(node.type)) continue;

      const outgoing = graph.getOutgoingEdges(node.id);
      if (outgoing.length === 0) {
        issues.push({
          category: 'invariant',
          severity: 'warning',
          message: `Non-terminal node ${node.id} has no outgoing edges`,
          entityType: 'graph',
          entityId: graphData.id,
          context: {
            node_id: node.id,
            node_type: node.type,
          },
          repairs: [
            {
              issue: `Node ${node.id} is a dead end but not a terminal node`,
              action: `Add outgoing edges or change node type to 'death' or 'reset'`,
              automated: false,
              priority: 'high',
            },
          ],
        });
      }
    }

    // Check decision nodes have choices
    for (const node of graph.getAllNodes()) {
      if (node.type === 'decision') {
        if (!node.choices || node.choices.length === 0) {
          issues.push({
            category: 'invariant',
            severity: 'warning',
            message: `Decision node ${node.id} has no choices defined`,
            entityType: 'graph',
            entityId: graphData.id,
            context: { node_id: node.id },
            repairs: [
              {
                issue: `Decision node without choices`,
                action: `Add choices array to the decision node`,
                automated: false,
                priority: 'medium',
              },
            ],
          });
        }
      }
    }

    return issues;
  }

  private detectCycles(graph: DayGraph): string[][] {
    const cycles: string[][] = [];
    const nodes = graph.getAllNodes();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const parent = new Map<string, string>();

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        const targetId = edge.target_id;

        if (!visited.has(targetId)) {
          parent.set(targetId, nodeId);
          dfs(targetId, [...path, nodeId]);
        } else if (recursionStack.has(targetId)) {
          // Found cycle
          const cycleStart = path.indexOf(targetId);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), nodeId, targetId]);
          } else {
            cycles.push([...path, nodeId, targetId]);
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return cycles;
  }

  private invariantToIssue(
    violation: InvariantViolation,
    entityType: ConsistencyIssue['entityType'],
    entityId: string
  ): ConsistencyIssue {
    return {
      category: 'invariant',
      severity: violation.severity,
      message: `[${violation.invariant}] ${violation.message}`,
      entityType,
      entityId,
      context: violation.context,
      repairs: this.generateRepairs(violation),
    };
  }

  private contradictionToIssue(
    contradiction: Contradiction,
    entityType: ConsistencyIssue['entityType'],
    entityId: string
  ): ConsistencyIssue {
    return {
      category: 'contradiction',
      severity: contradiction.severity,
      message: contradiction.message,
      entityType,
      entityId,
      context: contradiction.context,
      repairs: this.generateContradictionRepairs(contradiction),
    };
  }

  private generateRepairs(violation: InvariantViolation): RepairSuggestion[] {
    const repairs: RepairSuggestion[] = [];

    switch (violation.invariant) {
      case 'INV-L1':
        repairs.push({
          issue: 'Decisions out of chronological order',
          action: 'Reorder decisions by timestamp or correct the timestamps',
          automated: true,
          priority: 'high',
          code: `loop.decisions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())`,
        });
        break;

      case 'INV-L2':
        repairs.push({
          issue: 'Outcome before last decision',
          action: 'Update outcome timestamp to be after the last decision',
          automated: true,
          priority: 'high',
        });
        break;

      case 'INV-L3':
        repairs.push({
          issue: 'Loop end before loop start',
          action: 'Swap start and end times or correct the timestamps',
          automated: false,
          priority: 'critical',
        });
        break;

      case 'INV-L4':
        repairs.push({
          issue: 'Decision node not in path',
          action: 'Add the decision node to the path or remove the decision',
          automated: false,
          priority: 'high',
        });
        break;

      case 'INV-G1':
        repairs.push({
          issue: 'Start node does not exist',
          action: 'Create the start node or update start_node_id to reference an existing node',
          automated: false,
          priority: 'critical',
        });
        break;

      case 'INV-G2':
        repairs.push({
          issue: 'Edge references non-existent node',
          action: 'Create the missing node or remove the invalid edge',
          automated: false,
          priority: 'critical',
        });
        break;

      default:
        repairs.push({
          issue: violation.message,
          action: 'Review and fix the data manually',
          automated: false,
          priority: 'medium',
        });
    }

    return repairs;
  }

  private generateContradictionRepairs(contradiction: Contradiction): RepairSuggestion[] {
    const repairs: RepairSuggestion[] = [];

    switch (contradiction.type) {
      case 'knowledge':
        repairs.push({
          issue: 'Knowledge state contradiction',
          action: 'Resolve conflicting facts by updating certainty values or removing duplicates',
          automated: false,
          priority: contradiction.severity === 'error' ? 'critical' : 'medium',
        });
        break;

      case 'outcome':
        repairs.push({
          issue: 'Outcome unreachable',
          action: 'Update the path to reach the terminal node, or change the terminal node',
          automated: false,
          priority: 'critical',
        });
        break;

      case 'equivalence':
        repairs.push({
          issue: 'Equivalence class inconsistency',
          action: 'Review equivalence criteria or split the class into separate groups',
          automated: false,
          priority: 'high',
        });
        break;

      case 'path':
        repairs.push({
          issue: 'Disconnected path',
          action: 'Add missing edges to connect the path nodes',
          automated: false,
          priority: 'critical',
        });
        break;

      case 'temporal':
        repairs.push({
          issue: 'Time flows backward',
          action: 'Reorder path nodes or adjust node time slots',
          automated: false,
          priority: 'high',
        });
        break;
    }

    return repairs;
  }

  private buildReport(issues: ConsistencyIssue[], startTime: number): ConsistencyReport {
    const byCategory: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    let errors = 0;
    let warnings = 0;

    for (const issue of issues) {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      byEntityType[issue.entityType] = (byEntityType[issue.entityType] || 0) + 1;

      if (issue.severity === 'error') {
        errors++;
      } else {
        warnings++;
      }
    }

    return {
      valid: errors === 0,
      issues,
      summary: {
        totalIssues: issues.length,
        errors,
        warnings,
        byCategory,
        byEntityType,
      },
      checkedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Quick consistency check for a loop before storage
 * Returns true if loop is safe to store
 */
export function quickLoopCheck(loop: Loop, graph: DayGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check outcome terminal node exists
  const terminal = graph.getNode(loop.outcome.terminal_node_id);
  if (!terminal) {
    errors.push(`Terminal node ${loop.outcome.terminal_node_id} does not exist`);
  }

  // Check decisions reference existing nodes
  for (const decision of loop.decisions) {
    const node = graph.getNode(decision.node_id);
    if (!node) {
      errors.push(`Decision node ${decision.node_id} does not exist`);
    }
  }

  // Check path is valid (if provided)
  if (loop.path) {
    for (const nodeId of loop.path) {
      if (!graph.getNode(nodeId)) {
        errors.push(`Path node ${nodeId} does not exist`);
      }
    }
  }

  // Check timestamps
  if (loop.ended_at) {
    if (new Date(loop.ended_at) < new Date(loop.started_at)) {
      errors.push('Loop end time is before start time');
    }
  }

  return { valid: errors.length === 0, errors };
}
