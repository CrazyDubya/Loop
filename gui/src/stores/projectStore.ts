/**
 * Project Store
 *
 * Manages the current project state including graph, epochs, and settings
 */

import { create } from 'zustand';
import type {
  Project,
  DayGraphData,
  Epoch,
  ProjectSettings,
  DEFAULT_PROJECT_SETTINGS,
  GraphNode,
  GraphEdge,
  generateId,
  nowISO,
} from '@/types';

interface ProjectState {
  // Current project
  project: Project | null;
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: string | null;

  // Project actions
  createProject: (name: string, description?: string) => void;
  loadProject: (project: Project) => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  saveProject: () => Promise<void>;
  closeProject: () => void;

  // Graph actions
  setGraph: (graph: DayGraphData) => void;
  addNode: (node: Omit<GraphNode, 'id'>) => string;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Omit<GraphEdge, 'id'>) => string;
  updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  removeEdge: (edgeId: string) => void;

  // Epoch actions
  addEpoch: (epoch: Omit<Epoch, 'id'>) => string;
  updateEpoch: (epochId: string, updates: Partial<Epoch>) => void;
  removeEpoch: (epochId: string) => void;
  reorderEpochs: (epochIds: string[]) => void;

  // Dirty state management
  markDirty: () => void;
  markClean: () => void;
}

const createDefaultGraph = (): DayGraphData => ({
  id: crypto.randomUUID(),
  name: 'Day Graph',
  version: 1,
  time_bounds: { start: '06:00', end: '23:59' },
  start_node_id: '',
  nodes: [],
  edges: [],
});

const createDefaultProject = (name: string, description?: string): Project => ({
  id: crypto.randomUUID(),
  name,
  description,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  graph: createDefaultGraph(),
  epochs: [],
  loops: [],
  equivalenceClasses: [],
  knowledgeStates: [],
  settings: {
    defaultTone: 'clinical',
    defaultDetailLevel: 'standard',
    defaultPerspective: 'third_person_limited',
    autoValidate: true,
    autoSave: true,
    theme: 'dark',
  },
});

export const useProjectStore = create<ProjectState>()((set, get) => ({
  // State
  project: null,
  isLoading: false,
  isDirty: false,
  lastSaved: null,

  // Project actions
  createProject: (name, description) => {
    const project = createDefaultProject(name, description);
    set({ project, isDirty: false, lastSaved: null });
  },

  loadProject: (project) => {
    set({ project, isDirty: false, lastSaved: project.updated_at });
  },

  updateProjectSettings: (settings) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        settings: { ...project.settings, ...settings },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  saveProject: async () => {
    const { project } = get();
    if (!project) return;

    const now = new Date().toISOString();
    set({
      project: { ...project, updated_at: now },
      isDirty: false,
      lastSaved: now,
    });
    // Storage will be handled by the storage service
  },

  closeProject: () => {
    set({ project: null, isDirty: false, lastSaved: null });
  },

  // Graph actions
  setGraph: (graph) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        graph,
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  addNode: (nodeData) => {
    const { project } = get();
    if (!project) return '';

    const nodeId = crypto.randomUUID();
    const node: GraphNode = { ...nodeData, id: nodeId };

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          nodes: [...project.graph.nodes, node],
          // Set as start node if it's the first node
          start_node_id: project.graph.nodes.length === 0 ? nodeId : project.graph.start_node_id,
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });

    return nodeId;
  },

  updateNode: (nodeId, updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          nodes: project.graph.nodes.map((node) =>
            node.id === nodeId ? { ...node, ...updates } : node
          ),
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  removeNode: (nodeId) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          nodes: project.graph.nodes.filter((node) => node.id !== nodeId),
          edges: project.graph.edges.filter(
            (edge) => edge.source_id !== nodeId && edge.target_id !== nodeId
          ),
          start_node_id:
            project.graph.start_node_id === nodeId ? '' : project.graph.start_node_id,
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  addEdge: (edgeData) => {
    const { project } = get();
    if (!project) return '';

    const edgeId = crypto.randomUUID();
    const edge: GraphEdge = { ...edgeData, id: edgeId };

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          edges: [...project.graph.edges, edge],
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });

    return edgeId;
  },

  updateEdge: (edgeId, updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          edges: project.graph.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, ...updates } : edge
          ),
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  removeEdge: (edgeId) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        graph: {
          ...project.graph,
          edges: project.graph.edges.filter((edge) => edge.id !== edgeId),
        },
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  // Epoch actions
  addEpoch: (epochData) => {
    const { project } = get();
    if (!project) return '';

    const epochId = crypto.randomUUID();
    const epoch: Epoch = {
      ...epochData,
      id: epochId,
      order: project.epochs.length,
    };

    set({
      project: {
        ...project,
        epochs: [...project.epochs, epoch],
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });

    return epochId;
  },

  updateEpoch: (epochId, updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        epochs: project.epochs.map((epoch) =>
          epoch.id === epochId ? { ...epoch, ...updates } : epoch
        ),
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  removeEpoch: (epochId) => {
    const { project } = get();
    if (!project) return;

    const removedOrder = project.epochs.find((e) => e.id === epochId)?.order ?? -1;

    set({
      project: {
        ...project,
        epochs: project.epochs
          .filter((epoch) => epoch.id !== epochId)
          .map((epoch) => ({
            ...epoch,
            order: epoch.order > removedOrder ? epoch.order - 1 : epoch.order,
          })),
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  reorderEpochs: (epochIds) => {
    const { project } = get();
    if (!project) return;

    const epochMap = new Map(project.epochs.map((e) => [e.id, e]));
    const reorderedEpochs = epochIds
      .map((id, index) => {
        const epoch = epochMap.get(id);
        return epoch ? { ...epoch, order: index } : null;
      })
      .filter((e): e is Epoch => e !== null);

    set({
      project: {
        ...project,
        epochs: reorderedEpochs,
        updated_at: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  // Dirty state
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
