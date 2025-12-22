/**
 * Graph Store
 *
 * Manages React Flow state and graph visualization
 */

import { create } from 'zustand';
import type { Node, Edge, Viewport, Connection } from '@xyflow/react';
import type { GraphNode, GraphEdge, NodeType, DayGraphData, NODE_TYPE_CONFIG } from '@/types';

// Custom node data type for React Flow
interface FlowNodeData extends GraphNode {
  isHighlighted?: boolean;
  isOnPath?: boolean;
}

interface GraphState {
  // React Flow state
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  viewport: Viewport;

  // Graph metadata
  graphId: string | null;
  graphName: string;
  startNodeId: string | null;

  // Interaction state
  isDragging: boolean;
  isConnecting: boolean;
  selectedNodes: string[];
  selectedEdges: string[];
  highlightedPath: string[];

  // Actions - React Flow
  setNodes: (nodes: Node<FlowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions - Graph manipulation
  loadGraph: (graph: DayGraphData) => void;
  clearGraph: () => void;
  addNode: (type: NodeType, position: { x: number; y: number }, label: string) => string;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (sourceId: string, targetId: string, type?: string) => string;
  removeEdge: (edgeId: string) => void;

  // Actions - Selection and highlighting
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  highlightPath: (nodeIds: string[]) => void;
  clearHighlight: () => void;

  // Actions - View
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;

  // Helpers
  getNode: (nodeId: string) => Node<FlowNodeData> | undefined;
  getEdge: (edgeId: string) => Edge | undefined;
  getConnectedEdges: (nodeId: string) => Edge[];
  toGraphData: () => DayGraphData;
}

// Node type to color mapping
const NODE_COLORS: Record<NodeType, string> = {
  event: '#22c55e',
  decision: '#eab308',
  location: '#3b82f6',
  encounter: '#f97316',
  discovery: '#a855f7',
  death: '#ef4444',
  reset: '#f43f5e',
};

// Convert DayGraph node to React Flow node
const graphNodeToFlowNode = (node: GraphNode, index: number): Node<FlowNodeData> => {
  // Auto-layout: arrange nodes in a grid based on time slot
  const timeMinutes = parseInt(node.time_slot.split(':')[0]) * 60 + parseInt(node.time_slot.split(':')[1]);
  const x = ((timeMinutes - 360) / 60) * 200; // 360 = 6:00 AM
  const y = index * 100;

  return {
    id: node.id,
    type: 'loopNode', // Custom node type
    position: { x, y },
    data: { ...node },
    style: {
      borderColor: NODE_COLORS[node.type],
    },
  };
};

// Convert React Flow node to DayGraph node
const flowNodeToGraphNode = (node: Node<FlowNodeData>): GraphNode => {
  const { isHighlighted, isOnPath, ...graphNode } = node.data;
  return graphNode;
};

// Convert DayGraph edge to React Flow edge
const graphEdgeToFlowEdge = (edge: GraphEdge): Edge => ({
  id: edge.id,
  source: edge.source_id,
  target: edge.target_id,
  type: 'loopEdge', // Custom edge type
  data: edge,
  animated: edge.type === 'conditional',
  style: {
    strokeWidth: edge.weight ?? 2,
  },
});

// Convert React Flow edge to DayGraph edge
const flowEdgeToGraphEdge = (edge: Edge): GraphEdge => ({
  id: edge.id,
  source_id: edge.source,
  target_id: edge.target,
  type: (edge.data as GraphEdge)?.type ?? 'default',
  weight: (edge.data as GraphEdge)?.weight,
  conditions: (edge.data as GraphEdge)?.conditions,
  duration_minutes: (edge.data as GraphEdge)?.duration_minutes,
  label: (edge.data as GraphEdge)?.label,
});

export const useGraphStore = create<GraphState>()((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  graphId: null,
  graphName: '',
  startNodeId: null,
  isDragging: false,
  isConnecting: false,
  selectedNodes: [],
  selectedEdges: [],
  highlightedPath: [],

  // React Flow actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) => {
    set((state) => {
      // Apply node changes (position, selection, etc.)
      let newNodes = [...state.nodes];
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          const index = newNodes.findIndex((n) => n.id === change.id);
          if (index !== -1) {
            newNodes[index] = { ...newNodes[index], position: change.position };
          }
        } else if (change.type === 'remove') {
          newNodes = newNodes.filter((n) => n.id !== change.id);
        } else if (change.type === 'select') {
          const index = newNodes.findIndex((n) => n.id === change.id);
          if (index !== -1) {
            newNodes[index] = { ...newNodes[index], selected: change.selected };
          }
        }
      }
      return { nodes: newNodes };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      let newEdges = [...state.edges];
      for (const change of changes) {
        if (change.type === 'remove') {
          newEdges = newEdges.filter((e) => e.id !== change.id);
        } else if (change.type === 'select') {
          const index = newEdges.findIndex((e) => e.id === change.id);
          if (index !== -1) {
            newEdges[index] = { ...newEdges[index], selected: change.selected };
          }
        }
      }
      return { edges: newEdges };
    });
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;

    const edgeId = crypto.randomUUID();
    const newEdge: Edge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      type: 'loopEdge',
      data: {
        id: edgeId,
        source_id: connection.source,
        target_id: connection.target,
        type: 'default',
      },
    };

    set((state) => ({ edges: [...state.edges, newEdge] }));
  },

  // Graph manipulation
  loadGraph: (graph) => {
    const nodes = graph.nodes.map((node, index) => graphNodeToFlowNode(node, index));
    const edges = graph.edges.map(graphEdgeToFlowEdge);

    set({
      graphId: graph.id,
      graphName: graph.name,
      startNodeId: graph.start_node_id,
      nodes,
      edges,
    });
  },

  clearGraph: () => {
    set({
      graphId: null,
      graphName: '',
      startNodeId: null,
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
      highlightedPath: [],
    });
  },

  addNode: (type, position, label) => {
    const nodeId = crypto.randomUUID();
    const newNode: Node<FlowNodeData> = {
      id: nodeId,
      type: 'loopNode',
      position,
      data: {
        id: nodeId,
        type,
        time_slot: '08:00', // Default time
        label,
      },
      style: {
        borderColor: NODE_COLORS[type],
      },
    };

    set((state) => {
      const newState: Partial<GraphState> = { nodes: [...state.nodes, newNode] };
      // Set as start node if first node
      if (state.nodes.length === 0) {
        newState.startNodeId = nodeId;
      }
      return newState;
    });

    return nodeId;
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: { ...node.data, ...updates },
          style: updates.type
            ? { ...node.style, borderColor: NODE_COLORS[updates.type] }
            : node.style,
        };
      }),
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      startNodeId: state.startNodeId === nodeId ? null : state.startNodeId,
    }));
  },

  addEdge: (sourceId, targetId, type = 'default') => {
    const edgeId = crypto.randomUUID();
    const newEdge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: 'loopEdge',
      data: {
        id: edgeId,
        source_id: sourceId,
        target_id: targetId,
        type,
      },
    };

    set((state) => ({ edges: [...state.edges, newEdge] }));
    return edgeId;
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
  },

  // Selection and highlighting
  setSelectedNodes: (nodeIds) => {
    set((state) => ({
      selectedNodes: nodeIds,
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: nodeIds.includes(node.id),
      })),
    }));
  },

  setSelectedEdges: (edgeIds) => {
    set((state) => ({
      selectedEdges: edgeIds,
      edges: state.edges.map((edge) => ({
        ...edge,
        selected: edgeIds.includes(edge.id),
      })),
    }));
  },

  highlightPath: (nodeIds) => {
    set((state) => {
      // Create a set of edge IDs that are on the path
      const pathEdgeIds = new Set<string>();
      for (let i = 0; i < nodeIds.length - 1; i++) {
        const edge = state.edges.find(
          (e) => e.source === nodeIds[i] && e.target === nodeIds[i + 1]
        );
        if (edge) pathEdgeIds.add(edge.id);
      }

      return {
        highlightedPath: nodeIds,
        nodes: state.nodes.map((node) => ({
          ...node,
          data: { ...node.data, isOnPath: nodeIds.includes(node.id) },
        })),
        edges: state.edges.map((edge) => ({
          ...edge,
          animated: pathEdgeIds.has(edge.id),
          style: pathEdgeIds.has(edge.id)
            ? { ...edge.style, stroke: '#6366f1', strokeWidth: 3 }
            : edge.style,
        })),
      };
    });
  },

  clearHighlight: () => {
    set((state) => ({
      highlightedPath: [],
      nodes: state.nodes.map((node) => ({
        ...node,
        data: { ...node.data, isOnPath: false },
      })),
      edges: state.edges.map((edge) => ({
        ...edge,
        animated: false,
        style: { ...edge.style, stroke: undefined, strokeWidth: 2 },
      })),
    }));
  },

  // View controls
  fitView: () => {
    // This would typically be handled by React Flow's useReactFlow hook
    // Placeholder for external integration
  },

  zoomIn: () => {
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.min(state.viewport.zoom * 1.2, 4) },
    }));
  },

  zoomOut: () => {
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.max(state.viewport.zoom / 1.2, 0.1) },
    }));
  },

  resetView: () => {
    set({ viewport: { x: 0, y: 0, zoom: 1 } });
  },

  // Helpers
  getNode: (nodeId) => get().nodes.find((n) => n.id === nodeId),
  getEdge: (edgeId) => get().edges.find((e) => e.id === edgeId),

  getConnectedEdges: (nodeId) => {
    return get().edges.filter((e) => e.source === nodeId || e.target === nodeId);
  },

  toGraphData: () => {
    const { graphId, graphName, startNodeId, nodes, edges } = get();
    return {
      id: graphId ?? crypto.randomUUID(),
      name: graphName || 'Untitled Graph',
      time_bounds: { start: '06:00', end: '23:59' },
      start_node_id: startNodeId ?? '',
      nodes: nodes.map(flowNodeToGraphNode),
      edges: edges.map(flowEdgeToGraphEdge),
    };
  },
}));
