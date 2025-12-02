/**
 * CLI Commands Implementation
 *
 * All commands for the loop-cli tool
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CLIConfig,
  DEFAULT_CONFIG,
  ProjectConfig,
  CommandResult,
  OutputFormat,
} from './types';
import {
  DayGraph,
  DayGraphData,
  Loop,
  MemoryLoopStore,
  LoopFactory,
  EquivalenceEngine,
  ConsistencyChecker,
  quickLoopCheck,
  narrateLoop,
  summarizeLoop,
  generateMontage,
  summarizeEpoch,
  EpochContext,
  StyleConfig,
  DEFAULT_STYLE,
  NarrativeTone,
  Perspective,
  EquivalenceClass,
} from '../index';

/**
 * Initialize a new Loop project
 */
export function initProject(
  projectName: string,
  projectDir: string = '.'
): CommandResult {
  const dataDir = path.join(projectDir, '.loop');

  // Check if already initialized
  if (fs.existsSync(dataDir)) {
    return {
      success: false,
      message: `Project already initialized at ${dataDir}`,
      errors: ['Directory .loop already exists'],
    };
  }

  try {
    // Create directories
    fs.mkdirSync(dataDir, { recursive: true });

    // Create config
    const config: ProjectConfig = {
      name: projectName,
      version: '1.0.0',
      graphId: `graph-${Date.now()}`,
      defaultTone: 'clinical',
      defaultPerspective: 'third_person_limited',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(dataDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create empty graph
    const graphData: DayGraphData = {
      id: config.graphId,
      name: `${projectName} Day Graph`,
      time_bounds: { start: '06:00', end: '22:00' },
      start_node_id: 'start',
      nodes: [
        {
          id: 'start',
          type: 'event',
          time_slot: '06:00',
          label: 'Day Begins',
          description: 'The day starts here.',
        },
      ],
      edges: [],
    };

    fs.writeFileSync(
      path.join(dataDir, 'graph.json'),
      JSON.stringify(graphData, null, 2)
    );

    // Create empty loops array
    fs.writeFileSync(
      path.join(dataDir, 'loops.json'),
      JSON.stringify({ loops: [], equivalenceClasses: [] }, null, 2)
    );

    return {
      success: true,
      message: `Project "${projectName}" initialized at ${dataDir}`,
      data: { config, graphData },
    };
  } catch (err) {
    return {
      success: false,
      message: 'Failed to initialize project',
      errors: [String(err)],
    };
  }
}

/**
 * Load project configuration
 */
export function loadProject(projectDir: string = '.'): CommandResult {
  const dataDir = path.join(projectDir, '.loop');

  if (!fs.existsSync(dataDir)) {
    return {
      success: false,
      message: 'No project found. Run "loop init" first.',
      errors: ['Directory .loop not found'],
    };
  }

  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'config.json'), 'utf-8')
    ) as ProjectConfig;

    const graphData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'graph.json'), 'utf-8')
    ) as DayGraphData;

    const loopsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'loops.json'), 'utf-8')
    );

    return {
      success: true,
      message: `Loaded project "${config.name}"`,
      data: { config, graphData, loopsData },
    };
  } catch (err) {
    return {
      success: false,
      message: 'Failed to load project',
      errors: [String(err)],
    };
  }
}

/**
 * Add a node to the graph
 */
export function addNode(
  projectDir: string,
  nodeId: string,
  nodeType: string,
  timeSlot: string,
  label: string,
  options: { description?: string; critical?: boolean } = {}
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };

  // Check if node exists
  if (graphData.nodes.some(n => n.id === nodeId)) {
    return {
      success: false,
      message: `Node "${nodeId}" already exists`,
      errors: ['Duplicate node ID'],
    };
  }

  // Add node
  graphData.nodes.push({
    id: nodeId,
    type: nodeType as any,
    time_slot: timeSlot,
    label,
    description: options.description,
    critical: options.critical,
  });

  // Save
  const dataDir = path.join(projectDir, '.loop');
  fs.writeFileSync(
    path.join(dataDir, 'graph.json'),
    JSON.stringify(graphData, null, 2)
  );

  return {
    success: true,
    message: `Added node "${nodeId}" (${nodeType}) at ${timeSlot}`,
    data: { node: graphData.nodes[graphData.nodes.length - 1] },
  };
}

/**
 * Add an edge to the graph
 */
export function addEdge(
  projectDir: string,
  edgeId: string,
  sourceId: string,
  targetId: string,
  options: { type?: string; weight?: number } = {}
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };

  // Check if edge exists
  if (graphData.edges.some(e => e.id === edgeId)) {
    return {
      success: false,
      message: `Edge "${edgeId}" already exists`,
      errors: ['Duplicate edge ID'],
    };
  }

  // Check if source and target exist
  if (!graphData.nodes.some(n => n.id === sourceId)) {
    return {
      success: false,
      message: `Source node "${sourceId}" not found`,
      errors: ['Source node does not exist'],
    };
  }

  if (!graphData.nodes.some(n => n.id === targetId)) {
    return {
      success: false,
      message: `Target node "${targetId}" not found`,
      errors: ['Target node does not exist'],
    };
  }

  // Add edge
  graphData.edges.push({
    id: edgeId,
    source_id: sourceId,
    target_id: targetId,
    type: options.type as any,
    weight: options.weight,
  });

  // Save
  const dataDir = path.join(projectDir, '.loop');
  fs.writeFileSync(
    path.join(dataDir, 'graph.json'),
    JSON.stringify(graphData, null, 2)
  );

  return {
    success: true,
    message: `Added edge "${edgeId}": ${sourceId} -> ${targetId}`,
    data: { edge: graphData.edges[graphData.edges.length - 1] },
  };
}

/**
 * Visualize the graph (DOT or Mermaid output)
 */
export function visualizeGraph(
  projectDir: string,
  format: 'dot' | 'mermaid' = 'mermaid'
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };
  const graph = new DayGraph(graphData);

  let output: string;
  if (format === 'dot') {
    output = graph.toDOT();
  } else {
    output = graph.toMermaid();
  }

  return {
    success: true,
    message: `Graph visualization (${format})`,
    data: { format, output },
  };
}

/**
 * List all nodes in the graph
 */
export function listNodes(projectDir: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };

  const nodes = graphData.nodes.map(n => ({
    id: n.id,
    type: n.type,
    time: n.time_slot,
    label: n.label,
  }));

  return {
    success: true,
    message: `${nodes.length} nodes`,
    data: { nodes },
  };
}

/**
 * List all edges in the graph
 */
export function listEdges(projectDir: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };

  const edges = graphData.edges.map(e => ({
    id: e.id,
    from: e.source_id,
    to: e.target_id,
    type: e.type || 'default',
  }));

  return {
    success: true,
    message: `${edges.length} edges`,
    data: { edges },
  };
}

/**
 * Validate the graph
 */
export function validateGraph(projectDir: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData } = loadResult.data as { graphData: DayGraphData };
  const graph = new DayGraph(graphData);
  const checker = new ConsistencyChecker();

  const report = checker.checkGraph(graph);

  return {
    success: report.valid,
    message: report.valid
      ? 'Graph is valid'
      : `Graph has ${report.summary.errors} error(s) and ${report.summary.warnings} warning(s)`,
    data: {
      valid: report.valid,
      issues: report.issues,
      summary: report.summary,
    },
  };
}

/**
 * List all loops
 */
export function listLoops(
  projectDir: string,
  options: { limit?: number; status?: string; outcomeType?: string } = {}
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { loopsData } = loadResult.data as { loopsData: { loops: Loop[] } };
  let loops = loopsData.loops;

  // Apply filters
  if (options.status) {
    loops = loops.filter(l => l.status === options.status);
  }

  if (options.outcomeType) {
    loops = loops.filter(l => l.outcome.type === options.outcomeType);
  }

  if (options.limit) {
    loops = loops.slice(0, options.limit);
  }

  const summary = loops.map(l => ({
    id: l.id.slice(0, 8),
    seq: l.sequence_number,
    status: l.status,
    outcome: l.outcome.type,
    decisions: l.decisions.length,
  }));

  return {
    success: true,
    message: `${loops.length} loop(s)`,
    data: { loops: summary, total: loopsData.loops.length },
  };
}

/**
 * Show details of a single loop
 */
export function showLoop(projectDir: string, loopId: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { loopsData } = loadResult.data as { loopsData: { loops: Loop[] } };
  const loop = loopsData.loops.find(
    l => l.id === loopId || l.id.startsWith(loopId)
  );

  if (!loop) {
    return {
      success: false,
      message: `Loop "${loopId}" not found`,
      errors: ['Loop not found'],
    };
  }

  return {
    success: true,
    message: `Loop ${loop.sequence_number}`,
    data: { loop },
  };
}

/**
 * Narrate a loop
 */
export function narrateLoopCommand(
  projectDir: string,
  loopId: string,
  options: { tone?: string; perspective?: string } = {}
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { loopsData, config } = loadResult.data as {
    loopsData: { loops: Loop[] };
    config: ProjectConfig;
  };

  const loop = loopsData.loops.find(
    l => l.id === loopId || l.id.startsWith(loopId)
  );

  if (!loop) {
    return {
      success: false,
      message: `Loop "${loopId}" not found`,
      errors: ['Loop not found'],
    };
  }

  const style: Partial<StyleConfig> = {
    tone: (options.tone || config.defaultTone) as NarrativeTone,
    perspective: (options.perspective || config.defaultPerspective) as Perspective,
  };

  const result = narrateLoop(loop, style);

  return {
    success: result.success,
    message: result.success ? 'Narration generated' : 'Narration failed',
    data: {
      prose: result.prose,
      wordCount: result.wordCount,
      warnings: result.warnings,
    },
  };
}

/**
 * Summarize a loop
 */
export function summarizeLoopCommand(
  projectDir: string,
  loopId: string
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { loopsData } = loadResult.data as { loopsData: { loops: Loop[] } };
  const loop = loopsData.loops.find(
    l => l.id === loopId || l.id.startsWith(loopId)
  );

  if (!loop) {
    return {
      success: false,
      message: `Loop "${loopId}" not found`,
      errors: ['Loop not found'],
    };
  }

  const summary = summarizeLoop(loop);

  return {
    success: true,
    message: 'Summary generated',
    data: { summary },
  };
}

/**
 * Validate all loops
 */
export function validateLoops(projectDir: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { graphData, loopsData } = loadResult.data as {
    graphData: DayGraphData;
    loopsData: { loops: Loop[] };
  };

  const graph = new DayGraph(graphData);
  const issues: Array<{ loopId: string; errors: string[] }> = [];

  for (const loop of loopsData.loops) {
    const check = quickLoopCheck(loop, graph);
    if (!check.valid) {
      issues.push({
        loopId: loop.id,
        errors: check.errors,
      });
    }
  }

  return {
    success: issues.length === 0,
    message: issues.length === 0
      ? `All ${loopsData.loops.length} loops valid`
      : `${issues.length} loop(s) with issues`,
    data: { issues, totalLoops: loopsData.loops.length },
  };
}

/**
 * Get project statistics
 */
export function getStats(projectDir: string): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { config, graphData, loopsData } = loadResult.data as {
    config: ProjectConfig;
    graphData: DayGraphData;
    loopsData: { loops: Loop[]; equivalenceClasses: EquivalenceClass[] };
  };

  const loops = loopsData.loops;
  const outcomeCount: Record<string, number> = {};

  for (const loop of loops) {
    const type = loop.outcome.type;
    outcomeCount[type] = (outcomeCount[type] || 0) + 1;
  }

  const stats = {
    project: config.name,
    graph: {
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
    },
    loops: {
      total: loops.length,
      completed: loops.filter(l => l.status === 'completed').length,
      inProgress: loops.filter(l => l.status === 'in_progress').length,
      aborted: loops.filter(l => l.status === 'aborted').length,
    },
    outcomes: outcomeCount,
    equivalenceClasses: loopsData.equivalenceClasses?.length || 0,
  };

  return {
    success: true,
    message: 'Project statistics',
    data: stats,
  };
}

/**
 * Export project data
 */
export function exportProject(
  projectDir: string,
  format: 'json' | 'summary' = 'json'
): CommandResult {
  const loadResult = loadProject(projectDir);
  if (!loadResult.success) return loadResult;

  const { config, graphData, loopsData } = loadResult.data as {
    config: ProjectConfig;
    graphData: DayGraphData;
    loopsData: { loops: Loop[]; equivalenceClasses: EquivalenceClass[] };
  };

  if (format === 'json') {
    return {
      success: true,
      message: 'Project exported as JSON',
      data: {
        config,
        graph: graphData,
        loops: loopsData.loops,
        equivalenceClasses: loopsData.equivalenceClasses,
      },
    };
  }

  // Summary format
  const graph = new DayGraph(graphData);
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push('');
  lines.push('## Graph');
  lines.push(`- Nodes: ${graphData.nodes.length}`);
  lines.push(`- Edges: ${graphData.edges.length}`);
  lines.push('');
  lines.push('## Loops');
  lines.push(`- Total: ${loopsData.loops.length}`);
  lines.push('');
  lines.push('## Graph Structure');
  lines.push('```mermaid');
  lines.push(graph.toMermaid());
  lines.push('```');

  return {
    success: true,
    message: 'Project summary',
    data: { summary: lines.join('\n') },
  };
}
