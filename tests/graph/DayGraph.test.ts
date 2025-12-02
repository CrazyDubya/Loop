import { DayGraph, DayGraphData, GraphNode, GraphEdge } from '../../src/graph';

describe('DayGraph', () => {
  // Helper to create a simple test graph
  function createTestGraph(): DayGraphData {
    return {
      id: 'test-graph-1',
      name: 'Test Day',
      time_bounds: { start: '06:00', end: '22:00' },
      start_node_id: 'wake_up',
      nodes: [
        { id: 'wake_up', type: 'event', time_slot: '06:00', label: 'Wake Up' },
        { id: 'breakfast', type: 'location', time_slot: '07:00', label: 'Breakfast' },
        { id: 'decision_1', type: 'decision', time_slot: '08:00', label: 'Go to work?', critical: true },
        { id: 'work', type: 'location', time_slot: '09:00', label: 'At Work' },
        { id: 'park', type: 'location', time_slot: '09:00', label: 'At Park' },
        { id: 'lunch', type: 'event', time_slot: '12:00', label: 'Lunch' },
        { id: 'evening', type: 'event', time_slot: '18:00', label: 'Evening' },
        { id: 'death_1', type: 'death', time_slot: '20:00', label: 'Car Accident' },
        { id: 'sleep', type: 'reset', time_slot: '22:00', label: 'Sleep' },
      ],
      edges: [
        { id: 'e1', source_id: 'wake_up', target_id: 'breakfast' },
        { id: 'e2', source_id: 'breakfast', target_id: 'decision_1' },
        { id: 'e3', source_id: 'decision_1', target_id: 'work', type: 'choice', label: 'Go to work' },
        { id: 'e4', source_id: 'decision_1', target_id: 'park', type: 'choice', label: 'Skip work' },
        { id: 'e5', source_id: 'work', target_id: 'lunch' },
        { id: 'e6', source_id: 'park', target_id: 'lunch' },
        { id: 'e7', source_id: 'lunch', target_id: 'evening' },
        { id: 'e8', source_id: 'evening', target_id: 'death_1', type: 'conditional' },
        { id: 'e9', source_id: 'evening', target_id: 'sleep' },
      ],
    };
  }

  describe('construction', () => {
    it('should create a graph from valid data', () => {
      const graph = new DayGraph(createTestGraph());
      expect(graph.id).toBe('test-graph-1');
      expect(graph.name).toBe('Test Day');
      expect(graph.nodeCount).toBe(9);
      expect(graph.edgeCount).toBe(9);
    });

    it('should set default version to 1', () => {
      const data = createTestGraph();
      delete data.version;
      const graph = new DayGraph(data);
      expect(graph.version).toBe(1);
    });
  });

  describe('node operations', () => {
    let graph: DayGraph;

    beforeEach(() => {
      graph = new DayGraph(createTestGraph());
    });

    it('should get a node by ID', () => {
      const node = graph.getNode('wake_up');
      expect(node).toBeDefined();
      expect(node?.label).toBe('Wake Up');
    });

    it('should return undefined for non-existent node', () => {
      expect(graph.getNode('nonexistent')).toBeUndefined();
    });

    it('should check if node exists', () => {
      expect(graph.hasNode('wake_up')).toBe(true);
      expect(graph.hasNode('nonexistent')).toBe(false);
    });

    it('should get all nodes', () => {
      const nodes = graph.getAllNodes();
      expect(nodes).toHaveLength(9);
    });

    it('should get nodes by type', () => {
      const deaths = graph.getNodesByType('death');
      expect(deaths).toHaveLength(1);
      expect(deaths[0].id).toBe('death_1');

      const locations = graph.getNodesByType('location');
      expect(locations).toHaveLength(3);
    });

    it('should get nodes at a specific time', () => {
      const nodes = graph.getNodesAtTime('09:00');
      expect(nodes).toHaveLength(2);
      expect(nodes.map(n => n.id).sort()).toEqual(['park', 'work']);
    });

    it('should get nodes in a time range', () => {
      const nodes = graph.getNodesInTimeRange('08:00', '12:00');
      expect(nodes).toHaveLength(4);
    });

    it('should get critical nodes', () => {
      const critical = graph.getCriticalNodes();
      expect(critical).toHaveLength(1);
      expect(critical[0].id).toBe('decision_1');
    });

    it('should add a new node', () => {
      const newNode: GraphNode = {
        id: 'new_node',
        type: 'event',
        time_slot: '15:00',
        label: 'New Event',
      };
      graph.addNode(newNode);
      expect(graph.nodeCount).toBe(10);
      expect(graph.hasNode('new_node')).toBe(true);
    });

    it('should throw on duplicate node ID', () => {
      const dupe: GraphNode = {
        id: 'wake_up',
        type: 'event',
        time_slot: '06:00',
        label: 'Duplicate',
      };
      expect(() => graph.addNode(dupe)).toThrow(/already exists/);
    });

    it('should remove a node and its edges', () => {
      const initialEdges = graph.edgeCount;
      const removed = graph.removeNode('decision_1');
      expect(removed).toBe(true);
      expect(graph.hasNode('decision_1')).toBe(false);
      // Should have removed edges e2, e3, e4
      expect(graph.edgeCount).toBe(initialEdges - 3);
    });

    it('should update a node', () => {
      const updated = graph.updateNode('wake_up', { label: 'Updated Label' });
      expect(updated).toBe(true);
      expect(graph.getNode('wake_up')?.label).toBe('Updated Label');
    });

    it('should increment version on modification', () => {
      const v1 = graph.version;
      graph.addNode({ id: 'v_test', type: 'event', time_slot: '10:00', label: 'Test' });
      expect(graph.version).toBe(v1 + 1);
    });
  });

  describe('edge operations', () => {
    let graph: DayGraph;

    beforeEach(() => {
      graph = new DayGraph(createTestGraph());
    });

    it('should get an edge by ID', () => {
      const edge = graph.getEdge('e1');
      expect(edge).toBeDefined();
      expect(edge?.source_id).toBe('wake_up');
      expect(edge?.target_id).toBe('breakfast');
    });

    it('should get outgoing edges', () => {
      const edges = graph.getOutgoingEdges('decision_1');
      expect(edges).toHaveLength(2);
    });

    it('should get incoming edges', () => {
      const edges = graph.getIncomingEdges('lunch');
      expect(edges).toHaveLength(2);
    });

    it('should get neighbors', () => {
      const neighbors = graph.getNeighbors('decision_1');
      expect(neighbors.sort()).toEqual(['park', 'work']);
    });

    it('should get predecessors', () => {
      const preds = graph.getPredecessors('lunch');
      expect(preds.sort()).toEqual(['park', 'work']);
    });

    it('should add a new edge', () => {
      graph.addNode({ id: 'late_night', type: 'event', time_slot: '23:00', label: 'Late Night' });
      graph.addEdge({ id: 'e_new', source_id: 'sleep', target_id: 'late_night' });
      expect(graph.edgeCount).toBe(10);
    });

    it('should throw on duplicate edge ID', () => {
      expect(() => graph.addEdge({ id: 'e1', source_id: 'wake_up', target_id: 'breakfast' }))
        .toThrow(/already exists/);
    });

    it('should throw on non-existent source node', () => {
      expect(() => graph.addEdge({ id: 'bad', source_id: 'nonexistent', target_id: 'breakfast' }))
        .toThrow(/does not exist/);
    });

    it('should throw on self-loop', () => {
      expect(() => graph.addEdge({ id: 'self', source_id: 'wake_up', target_id: 'wake_up' }))
        .toThrow(/Self-loops are not allowed/);
    });

    it('should remove an edge', () => {
      const removed = graph.removeEdge('e1');
      expect(removed).toBe(true);
      expect(graph.hasEdge('e1')).toBe(false);
      expect(graph.edgeCount).toBe(8);
    });
  });

  describe('path finding', () => {
    let graph: DayGraph;

    beforeEach(() => {
      graph = new DayGraph(createTestGraph());
    });

    it('should find a path between connected nodes', () => {
      const result = graph.findPath('wake_up', 'lunch');
      expect(result.found).toBe(true);
      expect(result.path[0]).toBe('wake_up');
      expect(result.path[result.path.length - 1]).toBe('lunch');
    });

    it('should return empty for unreachable nodes', () => {
      // Add an isolated node
      graph.addNode({ id: 'isolated', type: 'event', time_slot: '10:00', label: 'Isolated' });
      const result = graph.findPath('wake_up', 'isolated');
      expect(result.found).toBe(false);
      expect(result.path).toHaveLength(0);
    });

    it('should handle same source and target', () => {
      const result = graph.findPath('wake_up', 'wake_up');
      expect(result.found).toBe(true);
      expect(result.path).toEqual(['wake_up']);
    });

    it('should find all paths', () => {
      // From wake_up to lunch there are 2 paths (via work or via park)
      const paths = graph.findAllPaths('wake_up', 'lunch');
      expect(paths.length).toBe(2);
    });

    it('should find path through specific nodes', () => {
      const result = graph.findPathThrough(['wake_up', 'decision_1', 'work', 'lunch']);
      expect(result).not.toBeNull();
      expect(result!.found).toBe(true);
      expect(result!.path).toContain('wake_up');
      expect(result!.path).toContain('decision_1');
      expect(result!.path).toContain('work');
      expect(result!.path).toContain('lunch');
    });

    it('should return null for impossible path through', () => {
      const result = graph.findPathThrough(['lunch', 'wake_up']); // Can't go backwards
      expect(result).toBeNull();
    });
  });

  describe('reachability', () => {
    let graph: DayGraph;

    beforeEach(() => {
      graph = new DayGraph(createTestGraph());
    });

    it('should find all reachable nodes from start', () => {
      const reachable = graph.getReachableFrom('wake_up');
      expect(reachable.size).toBe(9); // All nodes
    });

    it('should identify unreachable nodes', () => {
      graph.addNode({ id: 'orphan', type: 'event', time_slot: '10:00', label: 'Orphan' });
      const analysis = graph.analyzeReachability();
      expect(analysis.unreachable.has('orphan')).toBe(true);
    });

    it('should identify dead ends', () => {
      const analysis = graph.analyzeReachability();
      expect(analysis.deadEnds.has('death_1')).toBe(true);
      expect(analysis.deadEnds.has('sleep')).toBe(true);
    });

    it('should check if one node can reach another', () => {
      expect(graph.canReach('wake_up', 'lunch')).toBe(true);
      expect(graph.canReach('lunch', 'wake_up')).toBe(false);
    });

    it('should find all nodes that can reach a target', () => {
      const canReachLunch = graph.getReachableTo('lunch');
      expect(canReachLunch.has('wake_up')).toBe(true);
      expect(canReachLunch.has('breakfast')).toBe(true);
      expect(canReachLunch.has('decision_1')).toBe(true);
      expect(canReachLunch.has('work')).toBe(true);
      expect(canReachLunch.has('park')).toBe(true);
      expect(canReachLunch.has('lunch')).toBe(true);
      expect(canReachLunch.has('evening')).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate a correct graph', () => {
      const graph = new DayGraph(createTestGraph());
      const result = graph.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on missing start node', () => {
      const data = createTestGraph();
      data.start_node_id = 'nonexistent';
      // Need to bypass constructor validation
      const graph = new DayGraph({
        ...data,
        start_node_id: 'wake_up',
      });
      (graph as any)._startNodeId = 'nonexistent';

      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true);
    });

    it('should warn on unreachable nodes', () => {
      const graph = new DayGraph(createTestGraph());
      graph.addNode({ id: 'orphan', type: 'event', time_slot: '10:00', label: 'Orphan' });

      const result = graph.validate();
      expect(result.warnings.some(w => w.includes('orphan'))).toBe(true);
    });

    it('should warn on time slots outside bounds', () => {
      const graph = new DayGraph(createTestGraph());
      graph.addNode({ id: 'late', type: 'event', time_slot: '23:30', label: 'Too Late' });
      graph.addEdge({ id: 'to_late', source_id: 'sleep', target_id: 'late' });

      const result = graph.validate();
      expect(result.warnings.some(w => w.includes('23:30'))).toBe(true);
    });
  });

  describe('serialization', () => {
    let graph: DayGraph;

    beforeEach(() => {
      graph = new DayGraph(createTestGraph());
    });

    it('should export to JSON', () => {
      const json = graph.toJSON();
      expect(json.id).toBe('test-graph-1');
      expect(json.nodes).toHaveLength(9);
      expect(json.edges).toHaveLength(9);
    });

    it('should round-trip through JSON', () => {
      const json = graph.toJSON();
      const restored = DayGraph.fromJSON(json);
      expect(restored.nodeCount).toBe(graph.nodeCount);
      expect(restored.edgeCount).toBe(graph.edgeCount);
    });

    it('should export to DOT format', () => {
      const dot = graph.toDOT();
      expect(dot).toContain('digraph DayGraph');
      expect(dot).toContain('wake_up');
      expect(dot).toContain('->');
    });

    it('should export to Mermaid format', () => {
      const mermaid = graph.toMermaid();
      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('wake_up');
      expect(mermaid).toContain('-->');
    });
  });

  describe('complex scenarios', () => {
    it('should handle a diamond pattern', () => {
      const diamond: DayGraphData = {
        id: 'diamond',
        name: 'Diamond',
        time_bounds: { start: '00:00', end: '23:59' },
        start_node_id: 'A',
        nodes: [
          { id: 'A', type: 'event', time_slot: '00:00', label: 'Start' },
          { id: 'B', type: 'event', time_slot: '01:00', label: 'Left' },
          { id: 'C', type: 'event', time_slot: '01:00', label: 'Right' },
          { id: 'D', type: 'event', time_slot: '02:00', label: 'End' },
        ],
        edges: [
          { id: 'ab', source_id: 'A', target_id: 'B' },
          { id: 'ac', source_id: 'A', target_id: 'C' },
          { id: 'bd', source_id: 'B', target_id: 'D' },
          { id: 'cd', source_id: 'C', target_id: 'D' },
        ],
      };

      const graph = new DayGraph(diamond);
      const paths = graph.findAllPaths('A', 'D');
      expect(paths).toHaveLength(2);
    });

    it('should handle deep chains', () => {
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `n${i}`,
          type: 'event',
          time_slot: `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
          label: `Node ${i}`,
        });

        if (i > 0) {
          edges.push({
            id: `e${i}`,
            source_id: `n${i - 1}`,
            target_id: `n${i}`,
          });
        }
      }

      const chain: DayGraphData = {
        id: 'chain',
        name: 'Long Chain',
        time_bounds: { start: '00:00', end: '23:59' },
        start_node_id: 'n0',
        nodes,
        edges,
      };

      const graph = new DayGraph(chain);
      const path = graph.findPath('n0', 'n99');
      expect(path.found).toBe(true);
      expect(path.path).toHaveLength(100);
    });
  });
});
