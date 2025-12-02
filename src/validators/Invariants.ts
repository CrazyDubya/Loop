/**
 * Business logic invariants that go beyond schema validation
 * These ensure semantic consistency, not just structural validity
 */

export interface InvariantViolation {
  invariant: string;
  message: string;
  context: Record<string, unknown>;
  severity: 'error' | 'warning';
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
}

// Type definitions for validated data
interface Decision {
  id: string;
  node_id: string;
  timestamp: string;
  choice_index: number;
}

interface Outcome {
  id: string;
  type: string;
  timestamp: string;
  terminal_node_id: string;
}

interface Loop {
  id: string;
  sequence_number: number;
  started_at: string;
  ended_at?: string | null;
  decisions: Decision[];
  outcome: Outcome;
  path?: string[];
  sub_loops?: SubLoop[];
  knowledge_state_start_id: string;
  knowledge_state_end_id?: string | null;
}

interface SubLoop {
  id: string;
  depth: number;
  start_time: string;
  end_time?: string;
  parent_sub_loop_id?: string | null;
}

interface DayGraph {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  start_node_id: string;
  time_bounds: { start: string; end: string };
}

interface GraphNode {
  id: string;
  type: string;
  time_slot: string;
}

interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
}

interface KnowledgeState {
  id: string;
  version: number;
  parent_id?: string | null;
  facts: Fact[];
}

interface Fact {
  id: string;
  certainty: number;
  contradicted_by?: string[];
}

/**
 * Check all invariants for a Loop
 */
export function checkLoopInvariants(loop: Loop, graph?: DayGraph): InvariantCheckResult {
  const violations: InvariantViolation[] = [];

  // INV-L1: Decisions must be in chronological order
  for (let i = 1; i < loop.decisions.length; i++) {
    const prev = new Date(loop.decisions[i - 1].timestamp);
    const curr = new Date(loop.decisions[i].timestamp);
    if (curr < prev) {
      violations.push({
        invariant: 'INV-L1',
        message: 'Decisions must be in chronological order',
        context: {
          decision_index: i,
          previous_time: loop.decisions[i - 1].timestamp,
          current_time: loop.decisions[i].timestamp,
        },
        severity: 'error',
      });
    }
  }

  // INV-L2: Outcome timestamp must be after last decision
  if (loop.decisions.length > 0) {
    const lastDecision = new Date(loop.decisions[loop.decisions.length - 1].timestamp);
    const outcomeTime = new Date(loop.outcome.timestamp);
    if (outcomeTime < lastDecision) {
      violations.push({
        invariant: 'INV-L2',
        message: 'Outcome must occur after last decision',
        context: {
          last_decision_time: loop.decisions[loop.decisions.length - 1].timestamp,
          outcome_time: loop.outcome.timestamp,
        },
        severity: 'error',
      });
    }
  }

  // INV-L3: Loop start must be before loop end
  if (loop.ended_at) {
    const start = new Date(loop.started_at);
    const end = new Date(loop.ended_at);
    if (end < start) {
      violations.push({
        invariant: 'INV-L3',
        message: 'Loop end must be after loop start',
        context: {
          started_at: loop.started_at,
          ended_at: loop.ended_at,
        },
        severity: 'error',
      });
    }
  }

  // INV-L4: Path must match decision node sequence (if both provided)
  if (loop.path && loop.path.length > 0 && loop.decisions.length > 0) {
    for (const decision of loop.decisions) {
      if (!loop.path.includes(decision.node_id)) {
        violations.push({
          invariant: 'INV-L4',
          message: 'Decision node must be in path',
          context: {
            decision_id: decision.id,
            node_id: decision.node_id,
            path: loop.path,
          },
          severity: 'error',
        });
      }
    }
  }

  // INV-L5: Sub-loop depth must not exceed 3
  if (loop.sub_loops) {
    for (const subLoop of loop.sub_loops) {
      if (subLoop.depth > 3) {
        violations.push({
          invariant: 'INV-L5',
          message: 'Sub-loop depth cannot exceed 3',
          context: {
            sub_loop_id: subLoop.id,
            depth: subLoop.depth,
          },
          severity: 'error',
        });
      }
    }
  }

  // INV-L6: Sub-loop times must be within parent loop bounds
  if (loop.sub_loops && loop.ended_at) {
    const loopStart = new Date(loop.started_at);
    const loopEnd = new Date(loop.ended_at);
    for (const subLoop of loop.sub_loops) {
      const subStart = new Date(subLoop.start_time);
      if (subStart < loopStart || subStart > loopEnd) {
        violations.push({
          invariant: 'INV-L6',
          message: 'Sub-loop must be within parent loop time bounds',
          context: {
            sub_loop_id: subLoop.id,
            sub_loop_start: subLoop.start_time,
            loop_start: loop.started_at,
            loop_end: loop.ended_at,
          },
          severity: 'error',
        });
      }
    }
  }

  // Graph-dependent invariants
  if (graph) {
    // INV-L7: All decision nodes must exist in graph
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    for (const decision of loop.decisions) {
      if (!nodeIds.has(decision.node_id)) {
        violations.push({
          invariant: 'INV-L7',
          message: 'Decision references non-existent graph node',
          context: {
            decision_id: decision.id,
            node_id: decision.node_id,
          },
          severity: 'error',
        });
      }
    }

    // INV-L8: Terminal node must exist in graph
    if (!nodeIds.has(loop.outcome.terminal_node_id)) {
      violations.push({
        invariant: 'INV-L8',
        message: 'Outcome terminal node does not exist in graph',
        context: {
          terminal_node_id: loop.outcome.terminal_node_id,
        },
        severity: 'error',
      });
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Check invariants for a DayGraph
 */
export function checkGraphInvariants(graph: DayGraph): InvariantCheckResult {
  const violations: InvariantViolation[] = [];
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  // INV-G1: Start node must exist
  if (!nodeIds.has(graph.start_node_id)) {
    violations.push({
      invariant: 'INV-G1',
      message: 'Start node does not exist in graph',
      context: { start_node_id: graph.start_node_id },
      severity: 'error',
    });
  }

  // INV-G2: All edges must reference existing nodes
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source_id)) {
      violations.push({
        invariant: 'INV-G2',
        message: 'Edge source node does not exist',
        context: { edge_id: edge.id, source_id: edge.source_id },
        severity: 'error',
      });
    }
    if (!nodeIds.has(edge.target_id)) {
      violations.push({
        invariant: 'INV-G2',
        message: 'Edge target node does not exist',
        context: { edge_id: edge.id, target_id: edge.target_id },
        severity: 'error',
      });
    }
  }

  // INV-G3: No self-loops
  for (const edge of graph.edges) {
    if (edge.source_id === edge.target_id) {
      violations.push({
        invariant: 'INV-G3',
        message: 'Self-loop detected',
        context: { edge_id: edge.id, node_id: edge.source_id },
        severity: 'error',
      });
    }
  }

  // INV-G4: Time slots should be within bounds
  const startMinutes = timeToMinutes(graph.time_bounds.start);
  const endMinutes = timeToMinutes(graph.time_bounds.end);
  for (const node of graph.nodes) {
    const nodeMinutes = timeToMinutes(node.time_slot);
    if (nodeMinutes < startMinutes || nodeMinutes > endMinutes) {
      violations.push({
        invariant: 'INV-G4',
        message: 'Node time slot outside graph bounds',
        context: {
          node_id: node.id,
          time_slot: node.time_slot,
          bounds: graph.time_bounds,
        },
        severity: 'warning',
      });
    }
  }

  // INV-G5: Check for unreachable nodes (warning only)
  const reachable = findReachableNodes(graph);
  for (const node of graph.nodes) {
    if (!reachable.has(node.id)) {
      violations.push({
        invariant: 'INV-G5',
        message: 'Node is unreachable from start',
        context: { node_id: node.id },
        severity: 'warning',
      });
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Check invariants for KnowledgeState
 */
export function checkKnowledgeInvariants(
  current: KnowledgeState,
  parent?: KnowledgeState
): InvariantCheckResult {
  const violations: InvariantViolation[] = [];

  // INV-K1: Version must be greater than parent version
  if (parent && current.version <= parent.version) {
    violations.push({
      invariant: 'INV-K1',
      message: 'Knowledge version must be greater than parent version',
      context: {
        current_version: current.version,
        parent_version: parent.version,
      },
      severity: 'error',
    });
  }

  // INV-K2: Parent ID must match if parent provided
  if (parent && current.parent_id !== parent.id) {
    violations.push({
      invariant: 'INV-K2',
      message: 'Parent ID does not match provided parent',
      context: {
        stated_parent_id: current.parent_id,
        actual_parent_id: parent.id,
      },
      severity: 'error',
    });
  }

  // INV-K3: Certainty values must be valid
  for (const fact of current.facts) {
    if (fact.certainty < 0 || fact.certainty > 1) {
      violations.push({
        invariant: 'INV-K3',
        message: 'Fact certainty must be between 0 and 1',
        context: {
          fact_id: fact.id,
          certainty: fact.certainty,
        },
        severity: 'error',
      });
    }
  }

  // INV-K4: Contradicted-by references must exist
  const factIds = new Set(current.facts.map(f => f.id));
  for (const fact of current.facts) {
    if (fact.contradicted_by) {
      for (const contrId of fact.contradicted_by) {
        if (!factIds.has(contrId)) {
          violations.push({
            invariant: 'INV-K4',
            message: 'Contradicted-by references non-existent fact',
            context: {
              fact_id: fact.id,
              referenced_id: contrId,
            },
            severity: 'warning',
          });
        }
      }
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

// Helper functions

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function findReachableNodes(graph: DayGraph): Set<string> {
  const reachable = new Set<string>();
  const queue = [graph.start_node_id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    for (const edge of graph.edges) {
      if (edge.source_id === current && !reachable.has(edge.target_id)) {
        queue.push(edge.target_id);
      }
    }
  }

  return reachable;
}
