/**
 * Export Service
 *
 * Handles exporting projects to various formats
 */

import type {
  Project,
  DayGraphData,
  Loop,
  Epoch,
  ExportOptions,
  NarrativeTone,
} from '@/types';
import { narrativeService } from './engineBridge';

// ============================================
// Export Functions
// ============================================

export const exportService = {
  /**
   * Export project to specified format
   */
  async export(project: Project, options: ExportOptions): Promise<string> {
    switch (options.format) {
      case 'json':
        return this.toJSON(project, options);
      case 'markdown':
        return this.toMarkdown(project, options);
      case 'dot':
        return this.toDOT(project.graph);
      case 'mermaid':
        return this.toMermaid(project.graph);
      case 'html':
        return this.toHTML(project, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  },

  /**
   * Export to JSON
   */
  toJSON(project: Project, options: ExportOptions): string {
    let exportData: Partial<Project> = { ...project };

    if (!options.includeNarratives) {
      exportData = {
        ...exportData,
        loops: project.loops.map((loop) => ({
          ...loop,
          narrative_summary: undefined,
        })),
      };
    }

    if (!options.includeMetadata) {
      exportData = {
        ...exportData,
        created_at: undefined,
        updated_at: undefined,
      };
    }

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Export to Markdown
   */
  toMarkdown(project: Project, options: ExportOptions): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${project.name}`);
    lines.push('');
    if (project.description) {
      lines.push(project.description);
      lines.push('');
    }

    // Metadata
    if (options.includeMetadata) {
      lines.push('## Project Info');
      lines.push('');
      lines.push(`- **Created:** ${new Date(project.created_at).toLocaleDateString()}`);
      lines.push(`- **Last Updated:** ${new Date(project.updated_at).toLocaleDateString()}`);
      lines.push(`- **Total Loops:** ${project.loops.length}`);
      lines.push(`- **Epochs:** ${project.epochs.length}`);
      lines.push('');
    }

    // Graph
    lines.push('## Day Graph');
    lines.push('');
    lines.push(`**Name:** ${project.graph.name}`);
    lines.push(`**Time Bounds:** ${project.graph.time_bounds.start} - ${project.graph.time_bounds.end}`);
    lines.push('');

    lines.push('### Nodes');
    lines.push('');
    lines.push('| Label | Type | Time | Description |');
    lines.push('|-------|------|------|-------------|');
    for (const node of project.graph.nodes) {
      lines.push(`| ${node.label} | ${node.type} | ${node.time_slot} | ${node.description ?? '-'} |`);
    }
    lines.push('');

    // Mermaid graph
    lines.push('### Graph Visualization');
    lines.push('');
    lines.push('```mermaid');
    lines.push(this.toMermaid(project.graph));
    lines.push('```');
    lines.push('');

    // Epochs
    lines.push('## Epochs');
    lines.push('');
    for (const epoch of project.epochs.sort((a, b) => a.order - b.order)) {
      lines.push(`### ${epoch.order + 1}. ${epoch.name}`);
      lines.push('');
      if (epoch.description) {
        lines.push(epoch.description);
        lines.push('');
      }
      lines.push(`- **Strategy:** ${epoch.strategy_profile.primary_operator}`);
      lines.push(`- **Risk Tolerance:** ${epoch.strategy_profile.risk_tolerance}`);
      if (epoch.emotional_baseline) {
        lines.push(`- **Emotional Baseline:** ${epoch.emotional_baseline}`);
      }
      lines.push('');
    }

    // Loops (anchor loops only for brevity)
    const anchorLoops = project.loops.filter((l) => l.is_anchor);
    if (anchorLoops.length > 0) {
      lines.push('## Key Loops');
      lines.push('');
      for (const loop of anchorLoops) {
        lines.push(`### Loop #${loop.sequence_number}`);
        lines.push('');
        lines.push(`- **Status:** ${loop.status}`);
        lines.push(`- **Outcome:** ${loop.outcome.type}`);
        lines.push(`- **Decisions:** ${loop.decisions.length}`);
        lines.push('');

        if (options.includeNarratives && loop.narrative_summary) {
          lines.push('**Narrative:**');
          lines.push('');
          lines.push(`> ${loop.narrative_summary}`);
          lines.push('');
        }
      }
    }

    // Equivalence Classes
    if (project.equivalenceClasses.length > 0) {
      lines.push('## Equivalence Classes');
      lines.push('');

      if (options.compressEquivalenceClasses) {
        lines.push(`Total: ${project.equivalenceClasses.length} classes`);
        lines.push('');
        lines.push('| Outcome | Members | Summary |');
        lines.push('|---------|---------|---------|');
        for (const ec of project.equivalenceClasses) {
          lines.push(`| ${ec.outcome_summary.slice(0, 30)}... | ${ec.member_count} | ${ec.knowledge_delta_summary.slice(0, 40)}... |`);
        }
      } else {
        for (const ec of project.equivalenceClasses) {
          lines.push(`### ${ec.outcome_summary}`);
          lines.push('');
          lines.push(`- **Members:** ${ec.member_count} loops`);
          lines.push(`- **Knowledge Delta:** ${ec.knowledge_delta_summary}`);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  },

  /**
   * Export graph to DOT format (Graphviz)
   */
  toDOT(graph: DayGraphData): string {
    const lines: string[] = [];

    lines.push('digraph DayGraph {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Node type colors
    const nodeColors: Record<string, string> = {
      event: '#22c55e',
      decision: '#eab308',
      location: '#3b82f6',
      encounter: '#f97316',
      discovery: '#a855f7',
      death: '#ef4444',
      reset: '#f43f5e',
    };

    // Nodes
    for (const node of graph.nodes) {
      const color = nodeColors[node.type] ?? '#6b7280';
      const shape = node.type === 'decision' ? 'diamond' : 'box';
      const label = `${node.label}\\n${node.time_slot}`;
      lines.push(`  "${node.id}" [label="${label}", shape=${shape}, fillcolor="${color}", style="filled,rounded"];`);
    }
    lines.push('');

    // Edges
    for (const edge of graph.edges) {
      let attrs = '';
      if (edge.label) {
        attrs = ` [label="${edge.label}"]`;
      } else if (edge.type === 'conditional') {
        attrs = ' [style=dashed]';
      }
      lines.push(`  "${edge.source_id}" -> "${edge.target_id}"${attrs};`);
    }

    // Mark start node
    if (graph.start_node_id) {
      lines.push('');
      lines.push(`  start [shape=point];`);
      lines.push(`  start -> "${graph.start_node_id}";`);
    }

    lines.push('}');

    return lines.join('\n');
  },

  /**
   * Export graph to Mermaid format
   */
  toMermaid(graph: DayGraphData): string {
    const lines: string[] = [];

    lines.push('graph LR');

    // Node type styles
    const nodeStyles: Record<string, string> = {
      event: 'fill:#22c55e,stroke:#16a34a',
      decision: 'fill:#eab308,stroke:#ca8a04',
      location: 'fill:#3b82f6,stroke:#2563eb',
      encounter: 'fill:#f97316,stroke:#ea580c',
      discovery: 'fill:#a855f7,stroke:#9333ea',
      death: 'fill:#ef4444,stroke:#dc2626',
      reset: 'fill:#f43f5e,stroke:#e11d48',
    };

    // Nodes
    for (const node of graph.nodes) {
      const label = `${node.label}<br/>${node.time_slot}`;
      if (node.type === 'decision') {
        lines.push(`  ${node.id}{{"${label}"}}`);
      } else if (node.type === 'death' || node.type === 'reset') {
        lines.push(`  ${node.id}(("${label}"))`);
      } else {
        lines.push(`  ${node.id}["${label}"]`);
      }
    }

    lines.push('');

    // Edges
    for (const edge of graph.edges) {
      const arrow = edge.type === 'conditional' ? '-.->' : '-->';
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`  ${edge.source_id} ${arrow}${label} ${edge.target_id}`);
    }

    // Styles
    lines.push('');
    const styleGroups = new Map<string, string[]>();
    for (const node of graph.nodes) {
      const existing = styleGroups.get(node.type) ?? [];
      existing.push(node.id);
      styleGroups.set(node.type, existing);
    }

    for (const [type, nodeIds] of styleGroups) {
      const style = nodeStyles[type];
      if (style) {
        lines.push(`  style ${nodeIds.join(',')} ${style}`);
      }
    }

    return lines.join('\n');
  },

  /**
   * Export to standalone HTML
   */
  toHTML(project: Project, options: ExportOptions): string {
    const markdown = this.toMarkdown(project, options);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Loop Studio Export</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
    }
    h1, h2, h3 { color: #111827; }
    h1 { border-bottom: 2px solid #6366f1; padding-bottom: 0.5rem; }
    h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
    th { background: #f3f4f6; }
    code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; }
    pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #6366f1; margin: 1rem 0; padding-left: 1rem; color: #6b7280; }
    .mermaid { background: white; padding: 1rem; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="content">
    ${markdownToHTML(markdown)}
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>`;
  },

  /**
   * Download exported content as file
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// Simple markdown to HTML converter (basic)
function markdownToHTML(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```mermaid\n([\s\S]*?)```/g, '<div class="mermaid">$1</div>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // Lists
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    // Tables (basic)
    .replace(/\|.*\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => c.match(/^-+$/))) {
        return ''; // Header separator
      }
      const cellType = match.includes('---') ? 'th' : 'td';
      return `<tr>${cells.map((c) => `<${cellType}>${c}</${cellType}>`).join('')}</tr>`;
    })
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up empty tags
  html = html.replace(/<p><\/p>/g, '').replace(/<p><br\/>/g, '<p>');

  // Wrap tables
  html = html.replace(/(<tr>.*?<\/tr>)+/g, '<table>$&</table>');

  // Wrap lists
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  return html;
}

export default exportService;
