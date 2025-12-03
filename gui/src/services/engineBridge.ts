/**
 * Engine Bridge Service
 *
 * Provides integration with the core Loop Engine TypeScript library.
 * This service abstracts engine operations for use in the GUI.
 */

import type {
  DayGraphData,
  GraphNode,
  GraphEdge,
  Loop,
  Epoch,
  EquivalenceClass,
  ValidationResult,
  ValidationIssue,
  NarrativeTone,
  StyleConfig,
  DEFAULT_STYLE_CONFIG,
} from '@/types';

// ============================================
// Validation Service
// ============================================

export interface GraphValidationOptions {
  checkReachability?: boolean;
  checkDeadEnds?: boolean;
  checkCycles?: boolean;
  checkTimeConsistency?: boolean;
}

export const validationService = {
  /**
   * Validate a day graph structure
   */
  validateGraph(graph: DayGraphData, options: GraphValidationOptions = {}): ValidationResult {
    const issues: ValidationIssue[] = [];
    const {
      checkReachability = true,
      checkDeadEnds = true,
      checkCycles = false,
      checkTimeConsistency = true,
    } = options;

    // Check for empty graph
    if (graph.nodes.length === 0) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        message: 'Graph has no nodes',
        suggestion: 'Add at least one node to begin building your day graph',
      });
      return { valid: true, issues, checkedAt: new Date().toISOString() };
    }

    // Check start node exists
    if (!graph.start_node_id) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        message: 'No start node defined',
        suggestion: 'Set a start node for the graph',
      });
    } else if (!graph.nodes.find((n) => n.id === graph.start_node_id)) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        message: 'Start node does not exist in graph',
        nodeId: graph.start_node_id,
        suggestion: 'Select an existing node as the start node',
      });
    }

    // Check for orphaned nodes (no incoming or outgoing edges)
    if (checkDeadEnds) {
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      const hasIncoming = new Set<string>();
      const hasOutgoing = new Set<string>();

      for (const edge of graph.edges) {
        if (nodeIds.has(edge.source_id)) hasOutgoing.add(edge.source_id);
        if (nodeIds.has(edge.target_id)) hasIncoming.add(edge.target_id);
      }

      for (const node of graph.nodes) {
        // Start node doesn't need incoming edges
        if (node.id === graph.start_node_id) continue;

        if (!hasIncoming.has(node.id)) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            message: `Node "${node.label}" has no incoming edges`,
            nodeId: node.id,
            suggestion: 'Connect this node from another node, or remove it',
          });
        }
      }

      // Check for dead ends (nodes with no outgoing edges, except death/reset nodes)
      for (const node of graph.nodes) {
        if (node.type === 'death' || node.type === 'reset') continue;

        if (!hasOutgoing.has(node.id)) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            message: `Node "${node.label}" has no outgoing edges`,
            nodeId: node.id,
            suggestion: 'Add an outgoing edge, or mark as death/reset node',
          });
        }
      }
    }

    // Check for dangling edges
    const nodeIdSet = new Set(graph.nodes.map((n) => n.id));
    for (const edge of graph.edges) {
      if (!nodeIdSet.has(edge.source_id)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          message: `Edge references non-existent source node: ${edge.source_id}`,
          path: `edges.${edge.id}`,
        });
      }
      if (!nodeIdSet.has(edge.target_id)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          message: `Edge references non-existent target node: ${edge.target_id}`,
          path: `edges.${edge.id}`,
        });
      }
    }

    // Check time consistency
    if (checkTimeConsistency) {
      for (const edge of graph.edges) {
        const sourceNode = graph.nodes.find((n) => n.id === edge.source_id);
        const targetNode = graph.nodes.find((n) => n.id === edge.target_id);

        if (sourceNode && targetNode && !sourceNode.time_flexible && !targetNode.time_flexible) {
          const sourceTime = parseTime(sourceNode.time_slot);
          const targetTime = parseTime(targetNode.time_slot);

          if (targetTime < sourceTime) {
            issues.push({
              id: crypto.randomUUID(),
              severity: 'warning',
              message: `Time inconsistency: "${sourceNode.label}" (${sourceNode.time_slot}) -> "${targetNode.label}" (${targetNode.time_slot})`,
              path: `edges.${edge.id}`,
              suggestion: 'Adjust time slots or mark nodes as time_flexible',
            });
          }
        }
      }
    }

    // Check decision nodes have choices
    for (const node of graph.nodes) {
      if (node.type === 'decision') {
        const outgoingEdges = graph.edges.filter((e) => e.source_id === node.id);
        if (outgoingEdges.length < 2) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            message: `Decision node "${node.label}" has fewer than 2 outgoing edges`,
            nodeId: node.id,
            suggestion: 'Decision nodes should have multiple choices',
          });
        }
      }
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      checkedAt: new Date().toISOString(),
    };
  },

  /**
   * Validate a loop
   */
  validateLoop(loop: Loop, graph: DayGraphData): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check path validity
    if (loop.path && loop.path.length > 0) {
      const nodeIds = new Set(graph.nodes.map((n) => n.id));

      for (const nodeId of loop.path) {
        if (!nodeIds.has(nodeId)) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'error',
            message: `Loop path references non-existent node: ${nodeId}`,
            loopId: loop.id,
            nodeId,
          });
        }
      }

      // Check path connectivity
      for (let i = 0; i < loop.path.length - 1; i++) {
        const hasEdge = graph.edges.some(
          (e) => e.source_id === loop.path![i] && e.target_id === loop.path![i + 1]
        );
        if (!hasEdge) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'error',
            message: `No edge connects path nodes: ${loop.path[i]} -> ${loop.path[i + 1]}`,
            loopId: loop.id,
          });
        }
      }
    }

    // Check decisions match path
    for (const decision of loop.decisions) {
      const node = graph.nodes.find((n) => n.id === decision.node_id);
      if (!node) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          message: `Decision references non-existent node: ${decision.node_id}`,
          loopId: loop.id,
        });
      } else if (node.type !== 'decision') {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          message: `Decision recorded at non-decision node: ${node.label}`,
          loopId: loop.id,
          nodeId: node.id,
        });
      }
    }

    // Check outcome terminal node
    if (loop.outcome.terminal_node_id) {
      const terminalNode = graph.nodes.find((n) => n.id === loop.outcome.terminal_node_id);
      if (!terminalNode) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          message: `Outcome terminal node does not exist: ${loop.outcome.terminal_node_id}`,
          loopId: loop.id,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      checkedAt: new Date().toISOString(),
    };
  },
};

// ============================================
// Narrative Service
// ============================================

export const narrativeService = {
  /**
   * Generate a narrative preview for a loop
   */
  generatePreview(loop: Loop, graph: DayGraphData, style: Partial<StyleConfig> = {}): string {
    const config = { ...DEFAULT_STYLE_CONFIG, ...style };
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

    const parts: string[] = [];

    // Opening based on emotional state
    parts.push(getEmotionalOpening(loop.emotional_state_start, config.tone));

    // Path narrative
    if (loop.path && loop.path.length > 0) {
      const pathNodes = loop.path.map((id) => nodeMap.get(id)).filter(Boolean) as GraphNode[];

      for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        const decision = loop.decisions.find((d) => d.node_id === node.id);

        if (node.type === 'decision' && decision) {
          parts.push(getDecisionNarrative(node, decision, config.tone));
        } else if (i === 0 || config.detailLevel !== 'minimal') {
          parts.push(getNodeNarrative(node, config.tone));
        }
      }
    }

    // Outcome
    parts.push(getOutcomeNarrative(loop.outcome, nodeMap.get(loop.outcome.terminal_node_id), config.tone));

    // Emotional ending if different from start
    if (loop.emotional_state_end && loop.emotional_state_end !== loop.emotional_state_start) {
      parts.push(getEmotionalTransition(loop.emotional_state_start, loop.emotional_state_end, config.tone));
    }

    return parts.filter(Boolean).join(' ');
  },

  /**
   * Generate a montage for an equivalence class
   */
  generateMontage(equivClass: EquivalenceClass, sampleLoops: Loop[], config: Partial<StyleConfig> = {}): string {
    const style = { ...DEFAULT_STYLE_CONFIG, ...config };
    const count = equivClass.member_count;

    const openings: Record<NarrativeTone, string> = {
      hopeful: `Through ${count} iterations, a pattern emerged.`,
      desperate: `${count} times. ${count} identical failures.`,
      clinical: `Class contains ${count} loops with identical outcomes.`,
      melancholic: `${count} echoes of the same ending.`,
      dark_humor: `Groundhog day count: ${count}. Same result, naturally.`,
      philosophical: `The wheel turned ${count} times along this particular path.`,
      terse: `${count} loops. Same end.`,
      poetic: `${count} times the dance repeated, ${count} times the same silence fell.`,
    };

    return `${openings[style.tone]} ${equivClass.outcome_summary}`;
  },
};

// ============================================
// Path Finding Service
// ============================================

export const pathService = {
  /**
   * Find all paths from start to a target node
   */
  findPaths(graph: DayGraphData, targetNodeId: string, maxPaths = 10): string[][] {
    const paths: string[][] = [];
    const adjacency = buildAdjacencyList(graph);

    const dfs = (current: string, path: string[], visited: Set<string>) => {
      if (paths.length >= maxPaths) return;
      if (current === targetNodeId) {
        paths.push([...path]);
        return;
      }

      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);
          dfs(neighbor, path, visited);
          path.pop();
          visited.delete(neighbor);
        }
      }
    };

    if (graph.start_node_id) {
      dfs(graph.start_node_id, [graph.start_node_id], new Set([graph.start_node_id]));
    }

    return paths;
  },

  /**
   * Check if a node is reachable from the start
   */
  isReachable(graph: DayGraphData, nodeId: string): boolean {
    if (!graph.start_node_id) return false;
    if (nodeId === graph.start_node_id) return true;

    const adjacency = buildAdjacencyList(graph);
    const visited = new Set<string>();
    const queue = [graph.start_node_id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === nodeId) return true;

      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return false;
  },
};

// ============================================
// Helper Functions
// ============================================

function parseTime(timeSlot: string): number {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  return hours * 60 + minutes;
}

function buildAdjacencyList(graph: DayGraphData): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const neighbors = adjacency.get(edge.source_id) ?? [];
    neighbors.push(edge.target_id);
    adjacency.set(edge.source_id, neighbors);
  }

  return adjacency;
}

function getEmotionalOpening(emotion: string, tone: NarrativeTone): string {
  const openings: Record<NarrativeTone, Record<string, string>> = {
    clinical: {
      hopeful: 'Subject began the iteration in a positive state.',
      desperate: 'Subject displayed signs of acute distress.',
      numb: 'Subject exhibited emotional flatness.',
      default: 'Iteration commenced.',
    },
    hopeful: {
      hopeful: 'With renewed hope, the day began again.',
      desperate: 'Even in desperation, there was a spark of possibility.',
      default: 'Once more, the day began.',
    },
    desperate: {
      hopeful: 'Clinging to fragile hope, they woke.',
      desperate: 'Again. Again. Always again.',
      default: 'The nightmare continued.',
    },
    melancholic: {
      hopeful: 'A faint hope stirred as consciousness returned.',
      numb: 'Emptiness greeted the new iteration.',
      default: 'The familiar weight of repetition settled in.',
    },
    dark_humor: {
      hopeful: 'Oh good, optimism. That always helps.',
      desperate: 'Panic mode: engaged. As usual.',
      default: 'Here we go again.',
    },
    philosophical: {
      hopeful: 'Hope, that most persistent of human qualities, returned.',
      desperate: 'In desperation, truth sometimes reveals itself.',
      default: 'The cycle renewed.',
    },
    terse: {
      default: 'Day reset.',
    },
    poetic: {
      hopeful: 'Dawn painted hope across the repeated sky.',
      desperate: 'Desperation bloomed like dark flowers.',
      default: 'The song began anew.',
    },
  };

  const toneOpenings = openings[tone] ?? openings.clinical;
  return toneOpenings[emotion] ?? toneOpenings.default ?? '';
}

function getNodeNarrative(node: GraphNode, tone: NarrativeTone): string {
  if (!node.description) return '';

  switch (tone) {
    case 'terse':
      return node.label + '.';
    case 'poetic':
      return node.description;
    default:
      return node.description;
  }
}

function getDecisionNarrative(node: GraphNode, decision: any, tone: NarrativeTone): string {
  const choice = decision.choice_label ?? `option ${decision.choice_index + 1}`;

  const templates: Record<NarrativeTone, string> = {
    clinical: `At ${node.label}, selected ${choice}.`,
    hopeful: `At ${node.label}, they chose ${choice}, hoping for better.`,
    desperate: `At ${node.label}, they frantically chose ${choice}.`,
    melancholic: `At ${node.label}, they wearily turned toward ${choice}.`,
    dark_humor: `At ${node.label}, they went with ${choice}. Why not?`,
    philosophical: `At ${node.label}, the choice was ${choice}.`,
    terse: `${node.label}: ${choice}.`,
    poetic: `At ${node.label}, their heart turned toward ${choice}.`,
  };

  return templates[tone];
}

function getOutcomeNarrative(outcome: any, terminalNode: GraphNode | undefined, tone: NarrativeTone): string {
  const cause = outcome.cause ?? outcome.type;

  const templates: Record<NarrativeTone, Record<string, string>> = {
    clinical: {
      death: `Termination: ${cause}.`,
      success: 'Objective achieved.',
      default: `Iteration ended: ${cause}.`,
    },
    hopeful: {
      death: `Despite everything, the end came. But there would be another chance.`,
      success: 'Finally, success!',
      default: 'The loop closed, but hope remained.',
    },
    desperate: {
      death: `Dead again. ${cause}.`,
      success: 'Against all odds... it worked?',
      default: 'Another failure.',
    },
    melancholic: {
      death: `And so it ended, as it always did.`,
      success: 'At last, a different ending.',
      default: 'The loop faded to its familiar close.',
    },
    dark_humor: {
      death: `Death by ${cause}. Classic.`,
      success: 'Wait, that actually worked?',
      default: 'Same old, same old.',
    },
    philosophical: {
      death: `Death came, as it must.`,
      success: 'The cycle broke.',
      default: 'The wheel completed its turn.',
    },
    terse: {
      death: `Died. ${cause}.`,
      success: 'Success.',
      default: `End: ${cause}.`,
    },
    poetic: {
      death: `And silence fell, as ${cause} claimed another ending.`,
      success: 'Light broke through the endless loop.',
      default: 'The dance concluded its familiar steps.',
    },
  };

  const toneTemplates = templates[tone];
  return toneTemplates[outcome.type] ?? toneTemplates.default ?? '';
}

function getEmotionalTransition(from: string, to: string, tone: NarrativeTone): string {
  if (tone === 'terse') return '';

  return `The iteration left them ${to}.`;
}

export default {
  validation: validationService,
  narrative: narrativeService,
  path: pathService,
};
