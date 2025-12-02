/**
 * Graph type definitions matching the JSON schema
 */

export type NodeType =
  | 'event'
  | 'decision'
  | 'location'
  | 'encounter'
  | 'discovery'
  | 'death'
  | 'reset';

export type EdgeType =
  | 'default'
  | 'choice'
  | 'conditional'
  | 'timed'
  | 'random';

export interface NodeChoice {
  index: number;
  label: string;
  target_edge_id: string;
  requires_knowledge?: string[];
  probability_weight?: number;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  time_slot: string; // HH:MM format
  label: string;
  description?: string;
  location?: string;
  critical?: boolean;
  time_flexible?: boolean;
  choices?: NodeChoice[];
  knowledge_available?: string[];
  characters_present?: string[];
  tags?: string[];
}

export interface EdgeConditions {
  requires_knowledge?: string[];
  requires_item?: string[];
  time_window?: {
    after?: string;
    before?: string;
  };
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type?: EdgeType;
  weight?: number;
  conditions?: EdgeConditions;
  duration_minutes?: number;
  label?: string;
}

export interface TimeBounds {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface DayGraphData {
  id: string;
  name: string;
  version?: number;
  time_bounds: TimeBounds;
  start_node_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Path finding result
 */
export interface PathResult {
  found: boolean;
  path: string[];      // Node IDs in order
  edges: string[];     // Edge IDs traversed
  totalWeight: number;
  totalDuration: number; // minutes
}

/**
 * Reachability analysis result
 */
export interface ReachabilityResult {
  reachable: Set<string>;
  unreachable: Set<string>;
  deadEnds: Set<string>;  // Nodes with no outgoing edges
}

/**
 * Validation result for graph structure
 */
export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
