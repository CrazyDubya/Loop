import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  initProject,
  loadProject,
  addNode,
  addEdge,
  visualizeGraph,
  listNodes,
  listEdges,
  validateGraph,
  listLoops,
  getStats,
  exportProject,
  parseArgs,
} from '../../src/cli';

describe('CLI', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    it('should parse simple command', () => {
      const result = parseArgs(['init', 'myproject']);
      expect(result.command).toBe('init');
      expect(result.subcommand).toBe('myproject');
    });

    it('should parse command with options', () => {
      const result = parseArgs(['list', '--limit', '10', '--status', 'completed']);
      expect(result.command).toBe('list');
      expect(result.options.limit).toBe('10');
      expect(result.options.status).toBe('completed');
    });

    it('should parse boolean flags', () => {
      const result = parseArgs(['stats', '--verbose', '--quiet']);
      expect(result.command).toBe('stats');
      expect(result.options.verbose).toBe(true);
      expect(result.options.quiet).toBe(true);
    });

    it('should parse subcommand with args', () => {
      const result = parseArgs(['graph', 'add-node', 'n1', 'event', '08:00', 'Morning']);
      expect(result.command).toBe('graph');
      expect(result.subcommand).toBe('add-node');
      expect(result.args).toEqual(['n1', 'event', '08:00', 'Morning']);
    });
  });

  describe('initProject', () => {
    it('should initialize a new project', () => {
      const result = initProject('Test Project', testDir);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Project');

      // Check files were created
      const dataDir = path.join(testDir, '.loop');
      expect(fs.existsSync(dataDir)).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'graph.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'loops.json'))).toBe(true);
    });

    it('should fail if project already exists', () => {
      initProject('First', testDir);
      const result = initProject('Second', testDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already initialized');
    });

    it('should create valid config', () => {
      initProject('Test', testDir);

      const configPath = path.join(testDir, '.loop', 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(config.name).toBe('Test');
      expect(config.version).toBe('1.0.0');
      expect(config.graphId).toBeDefined();
      expect(config.createdAt).toBeDefined();
    });

    it('should create graph with start node', () => {
      initProject('Test', testDir);

      const graphPath = path.join(testDir, '.loop', 'graph.json');
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

      expect(graph.nodes.length).toBe(1);
      expect(graph.nodes[0].id).toBe('start');
      expect(graph.start_node_id).toBe('start');
    });
  });

  describe('loadProject', () => {
    it('should load existing project', () => {
      initProject('Test', testDir);
      const result = loadProject(testDir);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as any;
      expect(data.config.name).toBe('Test');
      expect(data.graphData.nodes).toBeDefined();
    });

    it('should fail for non-existent project', () => {
      const result = loadProject(testDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No project found');
    });
  });

  describe('Graph commands', () => {
    beforeEach(() => {
      initProject('Test', testDir);
    });

    describe('addNode', () => {
      it('should add a node', () => {
        const result = addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');

        expect(result.success).toBe(true);
        expect(result.message).toContain('cafe');

        // Verify node was added
        const load = loadProject(testDir);
        const graph = (load.data as any).graphData;
        expect(graph.nodes.some((n: any) => n.id === 'cafe')).toBe(true);
      });

      it('should reject duplicate node ID', () => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        const result = addNode(testDir, 'cafe', 'event', '10:00', 'Another');

        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
      });

      it('should add node with optional properties', () => {
        const result = addNode(testDir, 'bomb', 'event', '12:00', 'Explosion', {
          description: 'The bomb goes off',
          critical: true,
        });

        expect(result.success).toBe(true);

        const load = loadProject(testDir);
        const graph = (load.data as any).graphData;
        const node = graph.nodes.find((n: any) => n.id === 'bomb');
        expect(node.description).toBe('The bomb goes off');
        expect(node.critical).toBe(true);
      });
    });

    describe('addEdge', () => {
      beforeEach(() => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        addNode(testDir, 'bank', 'location', '10:00', 'Bank');
      });

      it('should add an edge', () => {
        const result = addEdge(testDir, 'e1', 'start', 'cafe');

        expect(result.success).toBe(true);
        expect(result.message).toContain('start');
        expect(result.message).toContain('cafe');
      });

      it('should reject duplicate edge ID', () => {
        addEdge(testDir, 'e1', 'start', 'cafe');
        const result = addEdge(testDir, 'e1', 'cafe', 'bank');

        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
      });

      it('should reject non-existent source', () => {
        const result = addEdge(testDir, 'e1', 'nonexistent', 'cafe');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Source node');
      });

      it('should reject non-existent target', () => {
        const result = addEdge(testDir, 'e1', 'start', 'nonexistent');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Target node');
      });
    });

    describe('listNodes', () => {
      it('should list all nodes', () => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        addNode(testDir, 'bank', 'location', '10:00', 'Bank');

        const result = listNodes(testDir);

        expect(result.success).toBe(true);
        expect(result.message).toContain('3 nodes'); // start + 2 new
        expect((result.data as any).nodes.length).toBe(3);
      });
    });

    describe('listEdges', () => {
      it('should list all edges', () => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        addEdge(testDir, 'e1', 'start', 'cafe');

        const result = listEdges(testDir);

        expect(result.success).toBe(true);
        expect(result.message).toContain('1 edge');
        expect((result.data as any).edges.length).toBe(1);
      });
    });

    describe('visualizeGraph', () => {
      it('should output Mermaid format', () => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        addEdge(testDir, 'e1', 'start', 'cafe');

        const result = visualizeGraph(testDir, 'mermaid');

        expect(result.success).toBe(true);
        expect((result.data as any).format).toBe('mermaid');
        expect((result.data as any).output).toContain('graph');
        expect((result.data as any).output).toContain('start');
      });

      it('should output DOT format', () => {
        addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
        addEdge(testDir, 'e1', 'start', 'cafe');

        const result = visualizeGraph(testDir, 'dot');

        expect(result.success).toBe(true);
        expect((result.data as any).format).toBe('dot');
        expect((result.data as any).output).toContain('digraph');
      });
    });

    describe('validateGraph', () => {
      it('should validate a valid graph', () => {
        addNode(testDir, 'end', 'death', '18:00', 'Death');
        addEdge(testDir, 'e1', 'start', 'end');

        const result = validateGraph(testDir);

        expect(result.success).toBe(true);
        expect((result.data as any).valid).toBe(true);
      });
    });
  });

  describe('Loop commands', () => {
    beforeEach(() => {
      initProject('Test', testDir);
    });

    describe('listLoops', () => {
      it('should list loops (empty)', () => {
        const result = listLoops(testDir);

        expect(result.success).toBe(true);
        expect(result.message).toContain('0 loop');
      });
    });
  });

  describe('Stats and Export', () => {
    beforeEach(() => {
      initProject('Test', testDir);
      addNode(testDir, 'cafe', 'location', '09:00', 'Coffee Shop');
      addEdge(testDir, 'e1', 'start', 'cafe');
    });

    describe('getStats', () => {
      it('should return project statistics', () => {
        const result = getStats(testDir);

        expect(result.success).toBe(true);

        const stats = result.data as any;
        expect(stats.project).toBe('Test');
        expect(stats.graph.nodes).toBe(2);
        expect(stats.graph.edges).toBe(1);
        expect(stats.loops.total).toBe(0);
      });
    });

    describe('exportProject', () => {
      it('should export as JSON', () => {
        const result = exportProject(testDir, 'json');

        expect(result.success).toBe(true);

        const data = result.data as any;
        expect(data.config).toBeDefined();
        expect(data.graph).toBeDefined();
        expect(data.loops).toBeDefined();
      });

      it('should export as summary', () => {
        const result = exportProject(testDir, 'summary');

        expect(result.success).toBe(true);

        const summary = (result.data as any).summary;
        expect(summary).toContain('# Test');
        expect(summary).toContain('Graph');
        expect(summary).toContain('mermaid');
      });
    });
  });
});
