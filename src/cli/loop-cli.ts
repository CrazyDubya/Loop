#!/usr/bin/env node
/**
 * Loop CLI - Command line interface for the Loop Engine
 *
 * Usage:
 *   loop init <name>          Initialize a new project
 *   loop graph nodes          List all nodes
 *   loop graph edges          List all edges
 *   loop graph add-node       Add a node
 *   loop graph add-edge       Add an edge
 *   loop graph visualize      Output graph visualization
 *   loop graph validate       Validate graph structure
 *   loop list                 List all loops
 *   loop show <id>            Show loop details
 *   loop narrate <id>         Generate prose for a loop
 *   loop summarize <id>       Generate summary for a loop
 *   loop validate             Validate all loops
 *   loop stats                Show project statistics
 *   loop export               Export project data
 */

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
  showLoop,
  narrateLoopCommand,
  summarizeLoopCommand,
  validateLoops,
  getStats,
  exportProject,
} from './commands';
import { CommandResult, OutputFormat } from './types';

interface ParsedArgs {
  command: string;
  subcommand?: string;
  args: string[];
  options: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: string[] = [];
  const options: Record<string, string | boolean> = {};

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i += 2;
      } else {
        options[key] = true;
        i += 1;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      options[key] = true;
      i += 1;
    } else {
      args.push(arg);
      i += 1;
    }
  }

  return {
    command: args[0] || 'help',
    subcommand: args[1],
    args: args.slice(2),
    options,
  };
}

function formatOutput(result: CommandResult, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  let output = '';

  if (result.success) {
    output += `✓ ${result.message}\n`;
  } else {
    output += `✗ ${result.message}\n`;
    if (result.errors) {
      for (const err of result.errors) {
        output += `  Error: ${err}\n`;
      }
    }
  }

  if (result.data) {
    if (format === 'table' && Array.isArray(result.data)) {
      output += formatTable(result.data as Record<string, unknown>[]);
    } else if (typeof result.data === 'object') {
      const data = result.data as Record<string, unknown>;

      // Special handling for different data types
      if (data.nodes && Array.isArray(data.nodes)) {
        output += '\n';
        output += formatTable(data.nodes as Record<string, unknown>[]);
      } else if (data.edges && Array.isArray(data.edges)) {
        output += '\n';
        output += formatTable(data.edges as Record<string, unknown>[]);
      } else if (data.loops && Array.isArray(data.loops)) {
        output += '\n';
        output += formatTable(data.loops as Record<string, unknown>[]);
      } else if (data.prose) {
        output += '\n' + data.prose + '\n';
      } else if (data.summary && typeof data.summary === 'string') {
        output += '\n' + data.summary + '\n';
      } else if (data.output && typeof data.output === 'string') {
        output += '\n' + data.output + '\n';
      } else if (data.issues && Array.isArray(data.issues)) {
        if ((data.issues as unknown[]).length > 0) {
          output += '\nIssues:\n';
          for (const issue of data.issues as any[]) {
            output += `  - ${issue.loopId || issue.entityId}: ${issue.errors?.join(', ') || issue.message}\n`;
          }
        }
      } else {
        // Generic object display
        output += '\n';
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'object' && value !== null) {
            output += `${key}:\n`;
            for (const [k, v] of Object.entries(value as object)) {
              output += `  ${k}: ${v}\n`;
            }
          } else {
            output += `${key}: ${value}\n`;
          }
        }
      }
    }
  }

  return output;
}

function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '(empty)\n';

  const keys = Object.keys(rows[0]);
  const widths: Record<string, number> = {};

  // Calculate column widths
  for (const key of keys) {
    widths[key] = key.length;
    for (const row of rows) {
      const value = String(row[key] ?? '');
      widths[key] = Math.max(widths[key], value.length);
    }
  }

  // Build header
  let output = '';
  output += keys.map(k => k.padEnd(widths[k])).join('  ') + '\n';
  output += keys.map(k => '-'.repeat(widths[k])).join('  ') + '\n';

  // Build rows
  for (const row of rows) {
    output += keys.map(k => String(row[k] ?? '').padEnd(widths[k])).join('  ') + '\n';
  }

  return output;
}

function showHelp(): void {
  console.log(`
Loop CLI - Time Loop Story Engine

USAGE:
  loop <command> [subcommand] [options]

COMMANDS:
  init <name>              Initialize a new project

  graph nodes              List all nodes in the graph
  graph edges              List all edges in the graph
  graph add-node <id> <type> <time> <label>
                           Add a node to the graph
  graph add-edge <id> <from> <to>
                           Add an edge to the graph
  graph visualize [--format dot|mermaid]
                           Output graph visualization
  graph validate           Validate graph structure

  list [--limit N] [--status S] [--outcome O]
                           List all loops
  show <id>                Show details of a loop
  narrate <id> [--tone T] [--perspective P]
                           Generate narrative prose for a loop
  summarize <id>           Generate a summary for a loop
  validate                 Validate all loops

  stats                    Show project statistics
  export [--format json|summary]
                           Export project data

OPTIONS:
  --format json|text|table Output format (default: text)
  --quiet                  Suppress non-essential output
  --verbose                Show detailed output
  --project <dir>          Project directory (default: .)

EXAMPLES:
  loop init "Groundhog Day"
  loop graph add-node cafe event 08:00 "Morning Coffee"
  loop graph add-edge e1 start cafe
  loop graph visualize --format mermaid
  loop list --limit 10 --status completed
  loop narrate abc123 --tone desperate
  loop stats
`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const format = (args.options.format as OutputFormat) || 'text';
  const projectDir = (args.options.project as string) || '.';

  let result: CommandResult;

  switch (args.command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      return;

    case 'init':
      if (!args.subcommand) {
        result = { success: false, message: 'Project name required', errors: ['Usage: loop init <name>'] };
      } else {
        result = initProject(args.subcommand, projectDir);
      }
      break;

    case 'graph':
      switch (args.subcommand) {
        case 'nodes':
          result = listNodes(projectDir);
          break;
        case 'edges':
          result = listEdges(projectDir);
          break;
        case 'add-node':
          if (args.args.length < 4) {
            result = { success: false, message: 'Missing arguments', errors: ['Usage: loop graph add-node <id> <type> <time> <label>'] };
          } else {
            result = addNode(projectDir, args.args[0], args.args[1], args.args[2], args.args[3], {
              description: args.options.description as string,
              critical: args.options.critical === true,
            });
          }
          break;
        case 'add-edge':
          if (args.args.length < 3) {
            result = { success: false, message: 'Missing arguments', errors: ['Usage: loop graph add-edge <id> <from> <to>'] };
          } else {
            result = addEdge(projectDir, args.args[0], args.args[1], args.args[2], {
              type: args.options.type as string,
              weight: args.options.weight ? parseFloat(args.options.weight as string) : undefined,
            });
          }
          break;
        case 'visualize':
          result = visualizeGraph(projectDir, (args.options.format as any) || 'mermaid');
          break;
        case 'validate':
          result = validateGraph(projectDir);
          break;
        default:
          result = { success: false, message: 'Unknown graph subcommand', errors: ['Use: nodes, edges, add-node, add-edge, visualize, validate'] };
      }
      break;

    case 'list':
      result = listLoops(projectDir, {
        limit: args.options.limit ? parseInt(args.options.limit as string, 10) : undefined,
        status: args.options.status as string,
        outcomeType: args.options.outcome as string,
      });
      break;

    case 'show':
      if (!args.subcommand) {
        result = { success: false, message: 'Loop ID required', errors: ['Usage: loop show <id>'] };
      } else {
        result = showLoop(projectDir, args.subcommand);
      }
      break;

    case 'narrate':
      if (!args.subcommand) {
        result = { success: false, message: 'Loop ID required', errors: ['Usage: loop narrate <id>'] };
      } else {
        result = narrateLoopCommand(projectDir, args.subcommand, {
          tone: args.options.tone as string,
          perspective: args.options.perspective as string,
        });
      }
      break;

    case 'summarize':
      if (!args.subcommand) {
        result = { success: false, message: 'Loop ID required', errors: ['Usage: loop summarize <id>'] };
      } else {
        result = summarizeLoopCommand(projectDir, args.subcommand);
      }
      break;

    case 'validate':
      result = validateLoops(projectDir);
      break;

    case 'stats':
      result = getStats(projectDir);
      break;

    case 'export':
      result = exportProject(projectDir, (args.options.format as any) || 'json');
      break;

    default:
      result = {
        success: false,
        message: `Unknown command: ${args.command}`,
        errors: ['Run "loop help" for usage information'],
      };
  }

  const output = formatOutput(result, format);
  console.log(output);

  process.exit(result.success ? 0 : 1);
}

// Export for programmatic use
export { parseArgs, formatOutput, main };

// Run if executed directly
if (require.main === module) {
  main();
}
