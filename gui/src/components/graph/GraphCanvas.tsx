/**
 * GraphCanvas Component
 *
 * Interactive DAG editor using React Flow
 */

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore, useProjectStore, useUIStore } from '@/stores';
import { LoopNode } from './LoopNode';
import { LoopEdge } from './LoopEdge';
import type { NodeType } from '@/types';

// Custom node types
const nodeTypes = {
  loopNode: LoopNode,
};

// Custom edge types
const edgeTypes = {
  loopEdge: LoopEdge,
};

export function GraphCanvas() {
  const { project } = useProjectStore();
  const { viewMode, selection, selectNode, setHighlightedPath, clearSelection } = useUIStore();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loadGraph,
    addNode,
  } = useGraphStore();

  // Load graph when project changes
  useMemo(() => {
    if (project?.graph) {
      loadGraph(project.graph);
    }
  }, [project?.graph?.id]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle adding a new node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = addNode(type, { x: 200, y: 200 }, `New ${type}`);
      selectNode(id);
    },
    [addNode, selectNode]
  );

  // Minimap node color based on type
  const minimapNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      event: '#22c55e',
      decision: '#eab308',
      location: '#3b82f6',
      encounter: '#f97316',
      discovery: '#a855f7',
      death: '#ef4444',
      reset: '#f43f5e',
    };
    return colors[node.data?.type] ?? '#6b7280';
  }, []);

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-loop-bg-darker text-gray-500">
        <div className="text-center">
          <GraphPlaceholderIcon />
          <p className="mt-4">Open a project to edit the day graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-loop-bg-darker"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="bg-loop-bg-darker border-gray-700" />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="bg-loop-bg-darker border-gray-700"
        />

        {/* Toolbar Panel */}
        <Panel position="top-left" className="flex gap-2">
          <NodeToolbar onAddNode={handleAddNode} />
        </Panel>

        {/* Info Panel */}
        <Panel position="top-right" className="bg-loop-bg-darker/80 px-3 py-2 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            {selection.selectedNodeIds.length > 0 && (
              <div className="text-loop-primary">
                Selected: {selection.selectedNodeIds.length}
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface NodeToolbarProps {
  onAddNode: (type: NodeType) => void;
}

function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  const nodeTypes: { type: NodeType; label: string; color: string }[] = [
    { type: 'event', label: 'Event', color: '#22c55e' },
    { type: 'decision', label: 'Decision', color: '#eab308' },
    { type: 'location', label: 'Location', color: '#3b82f6' },
    { type: 'encounter', label: 'Encounter', color: '#f97316' },
    { type: 'discovery', label: 'Discovery', color: '#a855f7' },
    { type: 'death', label: 'Death', color: '#ef4444' },
    { type: 'reset', label: 'Reset', color: '#f43f5e' },
  ];

  return (
    <div className="flex gap-1 bg-loop-bg-darker/90 p-2 rounded-lg border border-gray-700">
      {nodeTypes.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onAddNode(type)}
          className="p-2 rounded hover:bg-gray-700/50 transition-colors group"
          title={`Add ${label} node`}
        >
          <div
            className="w-4 h-4 rounded-sm group-hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
          />
        </button>
      ))}
    </div>
  );
}

function GraphPlaceholderIcon() {
  return (
    <svg
      className="w-24 h-24 text-gray-600 mx-auto"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}
