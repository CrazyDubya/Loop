/**
 * ContradictionDetector - Identifies logical contradictions in loop data
 *
 * Detects:
 * - Knowledge state contradictions (incompatible facts)
 * - Outcome impossibility (outcome can't be reached from decisions)
 * - Equivalence class inconsistencies
 */

import { DayGraph, GraphNode } from '../graph';
import { Loop, LoopStore, EquivalenceClass } from '../loop';

export interface Contradiction {
  type: 'knowledge' | 'outcome' | 'equivalence' | 'path' | 'temporal';
  severity: 'error' | 'warning';
  message: string;
  entities: string[]; // IDs of involved entities
  context: Record<string, unknown>;
}

export interface ContradictionReport {
  hasContradictions: boolean;
  contradictions: Contradiction[];
  checkedAt: string;
}

export interface KnowledgeFact {
  id: string;
  key: string;
  value: unknown;
  certainty: number;
  source_loop_id?: string;
  learned_at?: string;
  contradicted_by?: string[];
}

export interface KnowledgeState {
  id: string;
  version: number;
  parent_id?: string | null;
  facts: KnowledgeFact[];
}

/**
 * Detects contradictions within and between knowledge states
 */
export function detectKnowledgeContradictions(
  states: KnowledgeState[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const state of states) {
    // Check for internal contradictions within a single state
    const factsByKey = new Map<string, KnowledgeFact[]>();

    for (const fact of state.facts) {
      const existing = factsByKey.get(fact.key) || [];
      existing.push(fact);
      factsByKey.set(fact.key, existing);
    }

    // Multiple facts with same key but different values
    for (const [key, facts] of factsByKey) {
      if (facts.length > 1) {
        const values = facts.map(f => f.value);
        const uniqueValues = new Set(values.map(v => JSON.stringify(v)));

        if (uniqueValues.size > 1) {
          contradictions.push({
            type: 'knowledge',
            severity: 'error',
            message: `Conflicting values for fact key "${key}" in knowledge state ${state.id}`,
            entities: [state.id, ...facts.map(f => f.id)],
            context: {
              key,
              values: facts.map(f => ({ fact_id: f.id, value: f.value, certainty: f.certainty })),
            },
          });
        }
      }
    }

    // Check marked contradictions are valid
    for (const fact of state.facts) {
      if (fact.contradicted_by && fact.contradicted_by.length > 0) {
        for (const contradictorId of fact.contradicted_by) {
          const contradictor = state.facts.find(f => f.id === contradictorId);
          if (!contradictor) {
            contradictions.push({
              type: 'knowledge',
              severity: 'warning',
              message: `Fact ${fact.id} claims contradiction by non-existent fact ${contradictorId}`,
              entities: [state.id, fact.id],
              context: {
                fact_id: fact.id,
                missing_contradictor: contradictorId,
              },
            });
          }
        }
      }
    }
  }

  // Check for contradictions between child and parent states
  for (const state of states) {
    if (state.parent_id) {
      const parent = states.find(s => s.id === state.parent_id);
      if (parent) {
        // Knowledge should be monotonic - facts shouldn't disappear without explicit contradiction
        const parentFactKeys = new Set(parent.facts.map(f => f.key));
        const childFactKeys = new Set(state.facts.map(f => f.key));

        for (const key of parentFactKeys) {
          if (!childFactKeys.has(key)) {
            const parentFact = parent.facts.find(f => f.key === key);
            // Check if it was explicitly contradicted
            const wasContradicted = state.facts.some(
              f => f.contradicted_by?.includes(parentFact?.id || '')
            );

            if (!wasContradicted) {
              contradictions.push({
                type: 'knowledge',
                severity: 'warning',
                message: `Fact "${key}" disappeared from parent to child without explicit contradiction`,
                entities: [parent.id, state.id],
                context: {
                  key,
                  parent_state: parent.id,
                  child_state: state.id,
                },
              });
            }
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Detects when a loop's outcome is impossible given its path and decisions
 */
export function detectOutcomeContradictions(
  loop: Loop,
  graph: DayGraph
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Check if outcome terminal node exists
  const terminalNode = graph.getNode(loop.outcome.terminal_node_id);
  if (!terminalNode) {
    contradictions.push({
      type: 'outcome',
      severity: 'error',
      message: `Loop outcome references non-existent terminal node: ${loop.outcome.terminal_node_id}`,
      entities: [loop.id, loop.outcome.id],
      context: {
        loop_id: loop.id,
        terminal_node_id: loop.outcome.terminal_node_id,
      },
    });
    return contradictions; // Can't check further
  }

  // If path is provided, verify terminal node is reachable from path
  if (loop.path && loop.path.length > 0) {
    const lastPathNode = loop.path[loop.path.length - 1];

    // Terminal should be last node in path, or reachable from it
    if (lastPathNode !== loop.outcome.terminal_node_id) {
      // Check if terminal is reachable from last path node
      const pathResult = graph.findPath(lastPathNode, loop.outcome.terminal_node_id);

      if (!pathResult.found) {
        contradictions.push({
          type: 'outcome',
          severity: 'error',
          message: `Terminal node ${loop.outcome.terminal_node_id} is not reachable from last path node ${lastPathNode}`,
          entities: [loop.id],
          context: {
            loop_id: loop.id,
            last_path_node: lastPathNode,
            terminal_node_id: loop.outcome.terminal_node_id,
          },
        });
      }
    }
  }

  // Check path connectivity - each node should be reachable from previous
  if (loop.path && loop.path.length > 1) {
    for (let i = 1; i < loop.path.length; i++) {
      const prev = loop.path[i - 1];
      const curr = loop.path[i];

      // Check if there's a direct edge or reachable path
      const edges = graph.getOutgoingEdges(prev);
      const directEdge = edges.some(e => e.target_id === curr);

      if (!directEdge) {
        // Check for any path (might be implicit)
        const pathResult = graph.findPath(prev, curr);
        if (!pathResult.found) {
          contradictions.push({
            type: 'path',
            severity: 'error',
            message: `Path is disconnected: no connection from ${prev} to ${curr}`,
            entities: [loop.id],
            context: {
              loop_id: loop.id,
              from_node: prev,
              to_node: curr,
              path_index: i,
            },
          });
        }
      }
    }
  }

  // Check outcome type matches terminal node type
  const terminalType = terminalNode.type;
  if (loop.outcome.type === 'death' && terminalType !== 'death') {
    contradictions.push({
      type: 'outcome',
      severity: 'warning',
      message: `Outcome type "death" but terminal node type is "${terminalType}"`,
      entities: [loop.id],
      context: {
        loop_id: loop.id,
        outcome_type: loop.outcome.type,
        terminal_node_type: terminalType,
      },
    });
  }

  if (loop.outcome.type === 'reset_trigger' && terminalType !== 'reset') {
    contradictions.push({
      type: 'outcome',
      severity: 'warning',
      message: `Outcome type "reset_trigger" but terminal node type is "${terminalType}"`,
      entities: [loop.id],
      context: {
        loop_id: loop.id,
        outcome_type: loop.outcome.type,
        terminal_node_type: terminalType,
      },
    });
  }

  return contradictions;
}

/**
 * Detects temporal contradictions in a loop
 */
export function detectTemporalContradictions(
  loop: Loop,
  graph: DayGraph
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  if (!loop.path || loop.path.length < 2) {
    return contradictions;
  }

  // Check time flows forward through path
  for (let i = 1; i < loop.path.length; i++) {
    const prevNode = graph.getNode(loop.path[i - 1]);
    const currNode = graph.getNode(loop.path[i]);

    if (prevNode && currNode) {
      const prevTime = timeSlotToMinutes(prevNode.time_slot);
      const currTime = timeSlotToMinutes(currNode.time_slot);

      if (currTime < prevTime) {
        contradictions.push({
          type: 'temporal',
          severity: 'error',
          message: `Time flows backward in path: ${prevNode.id} (${prevNode.time_slot}) to ${currNode.id} (${currNode.time_slot})`,
          entities: [loop.id],
          context: {
            loop_id: loop.id,
            from_node: { id: prevNode.id, time: prevNode.time_slot },
            to_node: { id: currNode.id, time: currNode.time_slot },
          },
        });
      }
    }
  }

  return contradictions;
}

/**
 * Detects inconsistencies within equivalence classes
 */
export async function detectEquivalenceContradictions(
  store: LoopStore
): Promise<Contradiction[]> {
  const contradictions: Contradiction[] = [];
  const classes = await store.getAllEquivalenceClasses();

  for (const ec of classes) {
    if (ec.member_count < 2) continue;

    // Get loops in this equivalence class
    const loops = await store.getLoopsInEquivalenceClass(ec.id);
    if (loops.length < 2) continue;

    const loopIds = loops.map(l => l.id);

    // Check outcome type consistency
    const outcomeTypes = new Set(loops.map(l => l.outcome.type));
    if (outcomeTypes.size > 1) {
      contradictions.push({
        type: 'equivalence',
        severity: 'error',
        message: `Equivalence class ${ec.id} has loops with different outcome types`,
        entities: [ec.id, ...loopIds],
        context: {
          class_id: ec.id,
          outcome_types: Array.from(outcomeTypes),
          loops: loops.map(l => ({ id: l.id, outcome_type: l.outcome.type })),
        },
      });
    }

    // Check terminal node consistency (they should end at same/similar node)
    const terminalNodes = new Set(loops.map(l => l.outcome.terminal_node_id));
    if (terminalNodes.size > 1) {
      contradictions.push({
        type: 'equivalence',
        severity: 'warning',
        message: `Equivalence class ${ec.id} has loops with different terminal nodes`,
        entities: [ec.id, ...loopIds],
        context: {
          class_id: ec.id,
          terminal_nodes: Array.from(terminalNodes),
        },
      });
    }

    // Check knowledge state consistency
    const knowledgeHashes = new Set(loops.map(l => l.knowledge_state_end_id));
    // Warning only since knowledge can legitimately vary
    if (knowledgeHashes.size > loops.length * 0.5) {
      contradictions.push({
        type: 'equivalence',
        severity: 'warning',
        message: `Equivalence class ${ec.id} has highly divergent knowledge states`,
        entities: [ec.id, ...loopIds],
        context: {
          class_id: ec.id,
          unique_knowledge_states: knowledgeHashes.size,
          total_loops: loops.length,
        },
      });
    }
  }

  return contradictions;
}

/**
 * Comprehensive contradiction check for a single loop
 */
export function detectLoopContradictions(
  loop: Loop,
  graph: DayGraph
): ContradictionReport {
  const contradictions: Contradiction[] = [
    ...detectOutcomeContradictions(loop, graph),
    ...detectTemporalContradictions(loop, graph),
  ];

  return {
    hasContradictions: contradictions.some(c => c.severity === 'error'),
    contradictions,
    checkedAt: new Date().toISOString(),
  };
}

// Helper functions

function timeSlotToMinutes(timeSlot: string): number {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}
