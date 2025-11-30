import {
  DayGraphData,
  GraphNode,
  GraphEdge,
  NodeType,
  PathResult,
  ReachabilityResult,
  GraphValidationResult,
  TimeBounds,
} from './types';

/**
 * DayGraph: The world structure for a single day/cycle
 *
 * Implements the graph that all loops traverse. Provides:
 * - Node and edge management
 * - Path finding
 * - Reachability analysis
 * - Time-based queries
 * - Serialization
 */
export class DayGraph {
  private _id: string;
  private _name: string;
  private _version: number;
  private _timeBounds: TimeBounds;
  private _startNodeId: string;

  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  // Adjacency lists for fast traversal
  private outgoing: Map<string, Set<string>> = new Map(); // node -> edge IDs
  private incoming: Map<string, Set<string>> = new Map(); // node -> edge IDs

  // Edge lookup by endpoints
  private edgesBySource: Map<string, Set<string>> = new Map();
  private edgesByTarget: Map<string, Set<string>> = new Map();

  constructor(data: DayGraphData) {
    this._id = data.id;
    this._name = data.name;
    this._version = data.version ?? 1;
    this._timeBounds = { ...data.time_bounds };
    this._startNodeId = data.start_node_id;

    // Load nodes
    for (const node of data.nodes) {
      this.addNode(node, false);
    }

    // Load edges
    for (const edge of data.edges) {
      this.addEdge(edge, false);
    }
  }

  // ============================================
  // Properties
  // ============================================

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get version(): number { return this._version; }
  get timeBounds(): TimeBounds { return { ...this._timeBounds }; }
  get startNodeId(): string { return this._startNodeId; }
  get nodeCount(): number { return this.nodes.size; }
  get edgeCount(): number { return this.edges.size; }

  // ============================================
  // Node Operations
  // ============================================

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode, incrementVersion = true): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with ID '${node.id}' already exists`);
    }

    this.nodes.set(node.id, { ...node });
    this.outgoing.set(node.id, new Set());
    this.incoming.set(node.id, new Set());
    this.edgesBySource.set(node.id, new Set());
    this.edgesByTarget.set(node.id, new Set());

    if (incrementVersion) this._version++;
  }

  /**
   * Remove a node and all connected edges
   */
  removeNode(nodeId: string, incrementVersion = true): boolean {
    if (!this.nodes.has(nodeId)) {
      return false;
    }

    // Remove all edges connected to this node
    const edgesToRemove = new Set<string>();
    this.outgoing.get(nodeId)?.forEach(e => edgesToRemove.add(e));
    this.incoming.get(nodeId)?.forEach(e => edgesToRemove.add(e));

    for (const edgeId of edgesToRemove) {
      this.removeEdge(edgeId, false);
    }

    // Remove node
    this.nodes.delete(nodeId);
    this.outgoing.delete(nodeId);
    this.incoming.delete(nodeId);
    this.edgesBySource.delete(nodeId);
    this.edgesByTarget.delete(nodeId);

    if (incrementVersion) this._version++;
    return true;
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId: string): GraphNode | undefined {
    const node = this.nodes.get(nodeId);
    return node ? { ...node } : undefined;
  }

  /**
   * Check if a node exists
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).map(n => ({ ...n }));
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: NodeType): GraphNode[] {
    return this.getAllNodes().filter(n => n.type === type);
  }

  /**
   * Get nodes at a specific time slot
   */
  getNodesAtTime(timeSlot: string): GraphNode[] {
    return this.getAllNodes().filter(n => n.time_slot === timeSlot);
  }

  /**
   * Get nodes within a time range
   */
  getNodesInTimeRange(start: string, end: string): GraphNode[] {
    const startMin = this.timeToMinutes(start);
    const endMin = this.timeToMinutes(end);

    return this.getAllNodes().filter(n => {
      const nodeMin = this.timeToMinutes(n.time_slot);
      return nodeMin >= startMin && nodeMin <= endMin;
    });
  }

  /**
   * Get critical nodes (branch points, revelations)
   */
  getCriticalNodes(): GraphNode[] {
    return this.getAllNodes().filter(n => n.critical === true);
  }

  /**
   * Update a node
   */
  updateNode(nodeId: string, updates: Partial<Omit<GraphNode, 'id'>>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    Object.assign(node, updates);
    this._version++;
    return true;
  }

  // ============================================
  // Edge Operations
  // ============================================

  /**
   * Add an edge to the graph
   */
  addEdge(edge: GraphEdge, incrementVersion = true): void {
    if (this.edges.has(edge.id)) {
      throw new Error(`Edge with ID '${edge.id}' already exists`);
    }

    if (!this.nodes.has(edge.source_id)) {
      throw new Error(`Source node '${edge.source_id}' does not exist`);
    }

    if (!this.nodes.has(edge.target_id)) {
      throw new Error(`Target node '${edge.target_id}' does not exist`);
    }

    if (edge.source_id === edge.target_id) {
      throw new Error(`Self-loops are not allowed (node: ${edge.source_id})`);
    }

    this.edges.set(edge.id, { ...edge });

    // Update adjacency
    this.outgoing.get(edge.source_id)?.add(edge.id);
    this.incoming.get(edge.target_id)?.add(edge.id);
    this.edgesBySource.get(edge.source_id)?.add(edge.id);
    this.edgesByTarget.get(edge.target_id)?.add(edge.id);

    if (incrementVersion) this._version++;
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId: string, incrementVersion = true): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    this.outgoing.get(edge.source_id)?.delete(edgeId);
    this.incoming.get(edge.target_id)?.delete(edgeId);
    this.edgesBySource.get(edge.source_id)?.delete(edgeId);
    this.edgesByTarget.get(edge.target_id)?.delete(edgeId);

    this.edges.delete(edgeId);

    if (incrementVersion) this._version++;
    return true;
  }

  /**
   * Get an edge by ID
   */
  getEdge(edgeId: string): GraphEdge | undefined {
    const edge = this.edges.get(edgeId);
    return edge ? { ...edge } : undefined;
  }

  /**
   * Check if an edge exists
   */
  hasEdge(edgeId: string): boolean {
    return this.edges.has(edgeId);
  }

  /**
   * Get all edges
   */
  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values()).map(e => ({ ...e }));
  }

  /**
   * Get edges from a node
   */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.outgoing.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => ({ ...this.edges.get(id)! }));
  }

  /**
   * Get edges to a node
   */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.incoming.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => ({ ...this.edges.get(id)! }));
  }

  /**
   * Get neighbors (nodes reachable in one step)
   */
  getNeighbors(nodeId: string): string[] {
    const edges = this.getOutgoingEdges(nodeId);
    return edges.map(e => e.target_id);
  }

  /**
   * Get predecessors (nodes that can reach this node in one step)
   */
  getPredecessors(nodeId: string): string[] {
    const edges = this.getIncomingEdges(nodeId);
    return edges.map(e => e.source_id);
  }

  // ============================================
  // Path Finding
  // ============================================

  /**
   * Find any path between two nodes (BFS)
   */
  findPath(fromId: string, toId: string): PathResult {
    if (!this.hasNode(fromId) || !this.hasNode(toId)) {
      return { found: false, path: [], edges: [], totalWeight: 0, totalDuration: 0 };
    }

    if (fromId === toId) {
      return { found: true, path: [fromId], edges: [], totalWeight: 0, totalDuration: 0 };
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[]; edges: string[] }> = [
      { nodeId: fromId, path: [fromId], edges: [] }
    ];

    while (queue.length > 0) {
      const { nodeId, path, edges } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      for (const edge of this.getOutgoingEdges(nodeId)) {
        const nextId = edge.target_id;

        if (nextId === toId) {
          const finalPath = [...path, nextId];
          const finalEdges = [...edges, edge.id];
          return {
            found: true,
            path: finalPath,
            edges: finalEdges,
            totalWeight: this.calculatePathWeight(finalEdges),
            totalDuration: this.calculatePathDuration(finalEdges),
          };
        }

        if (!visited.has(nextId)) {
          queue.push({
            nodeId: nextId,
            path: [...path, nextId],
            edges: [...edges, edge.id],
          });
        }
      }
    }

    return { found: false, path: [], edges: [], totalWeight: 0, totalDuration: 0 };
  }

  /**
   * Find shortest path by edge count (BFS)
   */
  findShortestPath(fromId: string, toId: string): PathResult {
    // BFS already finds shortest path by edge count
    return this.findPath(fromId, toId);
  }

  /**
   * Find all paths between two nodes (up to maxPaths)
   */
  findAllPaths(fromId: string, toId: string, maxPaths = 100): PathResult[] {
    if (!this.hasNode(fromId) || !this.hasNode(toId)) {
      return [];
    }

    const results: PathResult[] = [];
    const stack: Array<{ nodeId: string; path: string[]; edges: string[]; visited: Set<string> }> = [
      { nodeId: fromId, path: [fromId], edges: [], visited: new Set([fromId]) }
    ];

    while (stack.length > 0 && results.length < maxPaths) {
      const { nodeId, path, edges, visited } = stack.pop()!;

      if (nodeId === toId) {
        results.push({
          found: true,
          path,
          edges,
          totalWeight: this.calculatePathWeight(edges),
          totalDuration: this.calculatePathDuration(edges),
        });
        continue;
      }

      for (const edge of this.getOutgoingEdges(nodeId)) {
        const nextId = edge.target_id;

        if (!visited.has(nextId)) {
          const newVisited = new Set(visited);
          newVisited.add(nextId);

          stack.push({
            nodeId: nextId,
            path: [...path, nextId],
            edges: [...edges, edge.id],
            visited: newVisited,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find paths that pass through specific nodes in order
   */
  findPathThrough(nodeSequence: string[]): PathResult | null {
    if (nodeSequence.length === 0) return null;
    if (nodeSequence.length === 1) {
      return this.hasNode(nodeSequence[0])
        ? { found: true, path: nodeSequence, edges: [], totalWeight: 0, totalDuration: 0 }
        : null;
    }

    const fullPath: string[] = [];
    const fullEdges: string[] = [];

    for (let i = 0; i < nodeSequence.length - 1; i++) {
      const segment = this.findPath(nodeSequence[i], nodeSequence[i + 1]);
      if (!segment.found) return null;

      // Avoid duplicating the connecting node
      if (i === 0) {
        fullPath.push(...segment.path);
      } else {
        fullPath.push(...segment.path.slice(1));
      }
      fullEdges.push(...segment.edges);
    }

    return {
      found: true,
      path: fullPath,
      edges: fullEdges,
      totalWeight: this.calculatePathWeight(fullEdges),
      totalDuration: this.calculatePathDuration(fullEdges),
    };
  }

  // ============================================
  // Reachability Analysis
  // ============================================

  /**
   * Analyze reachability from start node
   */
  analyzeReachability(): ReachabilityResult {
    const reachable = this.getReachableFrom(this._startNodeId);
    const allNodes = new Set(this.nodes.keys());
    const unreachable = new Set<string>();
    const deadEnds = new Set<string>();

    for (const nodeId of allNodes) {
      if (!reachable.has(nodeId)) {
        unreachable.add(nodeId);
      }

      if (this.getOutgoingEdges(nodeId).length === 0) {
        deadEnds.add(nodeId);
      }
    }

    return { reachable, unreachable, deadEnds };
  }

  /**
   * Get all nodes reachable from a given node
   */
  getReachableFrom(nodeId: string): Set<string> {
    const reachable = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      for (const neighbor of this.getNeighbors(current)) {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return reachable;
  }

  /**
   * Check if one node can reach another
   */
  canReach(fromId: string, toId: string): boolean {
    return this.getReachableFrom(fromId).has(toId);
  }

  /**
   * Get all nodes that can reach a given node
   */
  getReachableTo(nodeId: string): Set<string> {
    const canReach = new Set<string>();

    for (const node of this.nodes.keys()) {
      if (this.canReach(node, nodeId)) {
        canReach.add(node);
      }
    }

    return canReach;
  }

  // ============================================
  // Validation
  // ============================================

  /**
   * Validate the graph structure
   */
  validate(): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check start node exists
    if (!this.hasNode(this._startNodeId)) {
      errors.push(`Start node '${this._startNodeId}' does not exist`);
    }

    // Check for orphan edges (should be impossible with our add/remove logic)
    for (const edge of this.edges.values()) {
      if (!this.hasNode(edge.source_id)) {
        errors.push(`Edge '${edge.id}' references non-existent source '${edge.source_id}'`);
      }
      if (!this.hasNode(edge.target_id)) {
        errors.push(`Edge '${edge.id}' references non-existent target '${edge.target_id}'`);
      }
    }

    // Analyze reachability
    const { unreachable, deadEnds } = this.analyzeReachability();

    for (const nodeId of unreachable) {
      warnings.push(`Node '${nodeId}' is unreachable from start`);
    }

    // Dead ends that aren't terminal nodes
    for (const nodeId of deadEnds) {
      const node = this.getNode(nodeId);
      if (node && node.type !== 'death' && node.type !== 'reset') {
        warnings.push(`Node '${nodeId}' (type: ${node.type}) is a dead end with no outgoing edges`);
      }
    }

    // Check time slot validity
    const startMin = this.timeToMinutes(this._timeBounds.start);
    const endMin = this.timeToMinutes(this._timeBounds.end);

    for (const node of this.nodes.values()) {
      const nodeMin = this.timeToMinutes(node.time_slot);
      if (nodeMin < startMin || nodeMin > endMin) {
        warnings.push(`Node '${node.id}' time slot ${node.time_slot} is outside bounds ${this._timeBounds.start}-${this._timeBounds.end}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Export to JSON-serializable data
   */
  toJSON(): DayGraphData {
    return {
      id: this._id,
      name: this._name,
      version: this._version,
      time_bounds: { ...this._timeBounds },
      start_node_id: this._startNodeId,
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: DayGraphData): DayGraph {
    return new DayGraph(data);
  }

  /**
   * Export to DOT format (for Graphviz)
   */
  toDOT(): string {
    const lines: string[] = ['digraph DayGraph {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box];');
    lines.push('');

    // Node definitions
    for (const node of this.nodes.values()) {
      const attrs: string[] = [];
      attrs.push(`label="${node.label}\\n${node.time_slot}"`);

      if (node.critical) {
        attrs.push('style=bold');
        attrs.push('color=red');
      }

      if (node.type === 'death' || node.type === 'reset') {
        attrs.push('shape=octagon');
      } else if (node.type === 'decision') {
        attrs.push('shape=diamond');
      }

      if (node.id === this._startNodeId) {
        attrs.push('peripheries=2');
      }

      lines.push(`  "${node.id}" [${attrs.join(', ')}];`);
    }

    lines.push('');

    // Edge definitions
    for (const edge of this.edges.values()) {
      const attrs: string[] = [];

      if (edge.label) {
        attrs.push(`label="${edge.label}"`);
      }

      if (edge.type === 'conditional') {
        attrs.push('style=dashed');
      }

      const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
      lines.push(`  "${edge.source_id}" -> "${edge.target_id}"${attrStr};`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Export to Mermaid format (for markdown docs)
   */
  toMermaid(): string {
    const lines: string[] = ['graph TD'];

    // Node definitions with styling
    for (const node of this.nodes.values()) {
      const label = `${node.label}<br/>${node.time_slot}`;

      let nodeStr: string;
      if (node.type === 'decision') {
        nodeStr = `  ${node.id}{{"${label}"}}`;
      } else if (node.type === 'death' || node.type === 'reset') {
        nodeStr = `  ${node.id}(("${label}"))`;
      } else {
        nodeStr = `  ${node.id}["${label}"]`;
      }

      lines.push(nodeStr);
    }

    lines.push('');

    // Edges
    for (const edge of this.edges.values()) {
      const arrow = edge.type === 'conditional' ? '-.->' : '-->';
      const labelPart = edge.label ? `|${edge.label}|` : '';
      lines.push(`  ${edge.source_id} ${arrow}${labelPart} ${edge.target_id}`);
    }

    // Styling
    lines.push('');
    lines.push(`  style ${this._startNodeId} stroke-width:3px`);

    for (const node of this.nodes.values()) {
      if (node.critical) {
        lines.push(`  style ${node.id} stroke:#f00,stroke-width:2px`);
      }
    }

    return lines.join('\n');
  }

  // ============================================
  // Helpers
  // ============================================

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculatePathWeight(edgeIds: string[]): number {
    return edgeIds.reduce((sum, id) => {
      const edge = this.edges.get(id);
      return sum + (edge?.weight ?? 1);
    }, 0);
  }

  private calculatePathDuration(edgeIds: string[]): number {
    return edgeIds.reduce((sum, id) => {
      const edge = this.edges.get(id);
      return sum + (edge?.duration_minutes ?? 0);
    }, 0);
  }
}
