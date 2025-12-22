/**
 * IndexedDB Storage Service
 *
 * Offline-first storage using Dexie for Loop Studio projects
 */

import Dexie, { type Table } from 'dexie';
import type {
  Project,
  DayGraphData,
  Epoch,
  Loop,
  EquivalenceClass,
  KnowledgeState,
  ProjectSettings,
} from '@/types';

// ============================================
// Database Schema
// ============================================

export interface StoredProject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  settings: ProjectSettings;
}

export interface StoredGraph {
  id: string;
  project_id: string;
  data: DayGraphData;
  updated_at: string;
}

export interface StoredEpoch {
  id: string;
  project_id: string;
  data: Epoch;
}

export interface StoredLoop {
  id: string;
  project_id: string;
  epoch_id: string;
  sequence_number: number;
  data: Loop;
}

export interface StoredEquivalenceClass {
  id: string;
  project_id: string;
  data: EquivalenceClass;
}

export interface StoredKnowledgeState {
  id: string;
  project_id: string;
  data: KnowledgeState;
}

// ============================================
// Dexie Database Class
// ============================================

class LoopStudioDB extends Dexie {
  projects!: Table<StoredProject>;
  graphs!: Table<StoredGraph>;
  epochs!: Table<StoredEpoch>;
  loops!: Table<StoredLoop>;
  equivalenceClasses!: Table<StoredEquivalenceClass>;
  knowledgeStates!: Table<StoredKnowledgeState>;

  constructor() {
    super('LoopStudioDB');

    this.version(1).stores({
      projects: 'id, name, created_at, updated_at',
      graphs: 'id, project_id, updated_at',
      epochs: 'id, project_id, [project_id+data.order]',
      loops: 'id, project_id, epoch_id, sequence_number, [project_id+epoch_id], [project_id+sequence_number]',
      equivalenceClasses: 'id, project_id',
      knowledgeStates: 'id, project_id',
    });
  }
}

// Singleton database instance
export const db = new LoopStudioDB();

// ============================================
// Storage Service
// ============================================

export const storageService = {
  // ----------------------------------------
  // Project Operations
  // ----------------------------------------

  async listProjects(): Promise<StoredProject[]> {
    return db.projects.orderBy('updated_at').reverse().toArray();
  },

  async getProject(id: string): Promise<Project | null> {
    const project = await db.projects.get(id);
    if (!project) return null;

    const [graph, epochs, loops, equivalenceClasses, knowledgeStates] = await Promise.all([
      db.graphs.where('project_id').equals(id).first(),
      db.epochs.where('project_id').equals(id).toArray(),
      db.loops.where('project_id').equals(id).toArray(),
      db.equivalenceClasses.where('project_id').equals(id).toArray(),
      db.knowledgeStates.where('project_id').equals(id).toArray(),
    ]);

    return {
      ...project,
      graph: graph?.data ?? {
        id: crypto.randomUUID(),
        name: 'Day Graph',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: '',
        nodes: [],
        edges: [],
      },
      epochs: epochs.map((e) => e.data).sort((a, b) => a.order - b.order),
      loops: loops.map((l) => l.data).sort((a, b) => a.sequence_number - b.sequence_number),
      equivalenceClasses: equivalenceClasses.map((ec) => ec.data),
      knowledgeStates: knowledgeStates.map((ks) => ks.data),
    };
  },

  async saveProject(project: Project): Promise<void> {
    await db.transaction('rw', [
      db.projects,
      db.graphs,
      db.epochs,
      db.loops,
      db.equivalenceClasses,
      db.knowledgeStates,
    ], async () => {
      // Save project metadata
      await db.projects.put({
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        updated_at: project.updated_at,
        settings: project.settings,
      });

      // Save graph
      await db.graphs.put({
        id: project.graph.id,
        project_id: project.id,
        data: project.graph,
        updated_at: project.updated_at,
      });

      // Clear and save epochs
      await db.epochs.where('project_id').equals(project.id).delete();
      await db.epochs.bulkPut(
        project.epochs.map((epoch) => ({
          id: epoch.id,
          project_id: project.id,
          data: epoch,
        }))
      );

      // Clear and save loops
      await db.loops.where('project_id').equals(project.id).delete();
      await db.loops.bulkPut(
        project.loops.map((loop) => ({
          id: loop.id,
          project_id: project.id,
          epoch_id: loop.epoch_id,
          sequence_number: loop.sequence_number,
          data: loop,
        }))
      );

      // Clear and save equivalence classes
      await db.equivalenceClasses.where('project_id').equals(project.id).delete();
      await db.equivalenceClasses.bulkPut(
        project.equivalenceClasses.map((ec) => ({
          id: ec.id,
          project_id: project.id,
          data: ec,
        }))
      );

      // Clear and save knowledge states
      await db.knowledgeStates.where('project_id').equals(project.id).delete();
      await db.knowledgeStates.bulkPut(
        project.knowledgeStates.map((ks) => ({
          id: ks.id,
          project_id: project.id,
          data: ks,
        }))
      );
    });
  },

  async deleteProject(id: string): Promise<void> {
    await db.transaction('rw', [
      db.projects,
      db.graphs,
      db.epochs,
      db.loops,
      db.equivalenceClasses,
      db.knowledgeStates,
    ], async () => {
      await db.projects.delete(id);
      await db.graphs.where('project_id').equals(id).delete();
      await db.epochs.where('project_id').equals(id).delete();
      await db.loops.where('project_id').equals(id).delete();
      await db.equivalenceClasses.where('project_id').equals(id).delete();
      await db.knowledgeStates.where('project_id').equals(id).delete();
    });
  },

  // ----------------------------------------
  // Graph Operations (partial updates)
  // ----------------------------------------

  async updateGraph(projectId: string, graph: DayGraphData): Promise<void> {
    const existing = await db.graphs.where('project_id').equals(projectId).first();
    if (existing) {
      await db.graphs.update(existing.id, {
        data: graph,
        updated_at: new Date().toISOString(),
      });
    } else {
      await db.graphs.put({
        id: graph.id,
        project_id: projectId,
        data: graph,
        updated_at: new Date().toISOString(),
      });
    }
  },

  // ----------------------------------------
  // Loop Operations (partial updates)
  // ----------------------------------------

  async addLoop(projectId: string, loop: Loop): Promise<void> {
    await db.loops.put({
      id: loop.id,
      project_id: projectId,
      epoch_id: loop.epoch_id,
      sequence_number: loop.sequence_number,
      data: loop,
    });
  },

  async updateLoop(loop: Loop): Promise<void> {
    const stored = await db.loops.get(loop.id);
    if (stored) {
      await db.loops.update(loop.id, { data: loop });
    }
  },

  async deleteLoop(loopId: string): Promise<void> {
    await db.loops.delete(loopId);
  },

  async getLoopsByEpoch(projectId: string, epochId: string): Promise<Loop[]> {
    const stored = await db.loops
      .where('[project_id+epoch_id]')
      .equals([projectId, epochId])
      .toArray();
    return stored.map((s) => s.data);
  },

  // ----------------------------------------
  // Export / Import
  // ----------------------------------------

  async exportProject(id: string): Promise<string> {
    const project = await this.getProject(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    return JSON.stringify(project, null, 2);
  },

  async importProject(json: string): Promise<Project> {
    const project = JSON.parse(json) as Project;

    // Generate new IDs to avoid conflicts
    const oldToNewId = new Map<string, string>();
    const newId = () => {
      const id = crypto.randomUUID();
      return id;
    };

    // Map old IDs to new IDs
    oldToNewId.set(project.id, newId());
    oldToNewId.set(project.graph.id, newId());

    for (const epoch of project.epochs) {
      oldToNewId.set(epoch.id, newId());
    }
    for (const loop of project.loops) {
      oldToNewId.set(loop.id, newId());
    }
    for (const ec of project.equivalenceClasses) {
      oldToNewId.set(ec.id, newId());
    }
    for (const ks of project.knowledgeStates) {
      oldToNewId.set(ks.id, newId());
    }
    for (const node of project.graph.nodes) {
      oldToNewId.set(node.id, newId());
    }
    for (const edge of project.graph.edges) {
      oldToNewId.set(edge.id, newId());
    }

    // Helper to remap ID
    const remap = (id: string | null | undefined): string => {
      if (!id) return '';
      return oldToNewId.get(id) ?? id;
    };

    // Create remapped project
    const now = new Date().toISOString();
    const remappedProject: Project = {
      ...project,
      id: remap(project.id),
      name: `${project.name} (imported)`,
      created_at: now,
      updated_at: now,
      graph: {
        ...project.graph,
        id: remap(project.graph.id),
        start_node_id: remap(project.graph.start_node_id),
        nodes: project.graph.nodes.map((node) => ({
          ...node,
          id: remap(node.id),
        })),
        edges: project.graph.edges.map((edge) => ({
          ...edge,
          id: remap(edge.id),
          source_id: remap(edge.source_id),
          target_id: remap(edge.target_id),
        })),
      },
      epochs: project.epochs.map((epoch) => ({
        ...epoch,
        id: remap(epoch.id),
        anchor_loop_ids: epoch.anchor_loop_ids?.map(remap),
      })),
      loops: project.loops.map((loop) => ({
        ...loop,
        id: remap(loop.id),
        epoch_id: remap(loop.epoch_id),
        graph_id: remap(loop.graph_id),
        parent_id: loop.parent_id ? remap(loop.parent_id) : null,
        knowledge_state_start_id: remap(loop.knowledge_state_start_id),
        knowledge_state_end_id: loop.knowledge_state_end_id ? remap(loop.knowledge_state_end_id) : null,
        equivalence_class_id: loop.equivalence_class_id ? remap(loop.equivalence_class_id) : null,
        path: loop.path?.map(remap),
        outcome: {
          ...loop.outcome,
          id: remap(loop.outcome.id),
          terminal_node_id: remap(loop.outcome.terminal_node_id),
        },
        decisions: loop.decisions.map((d) => ({
          ...d,
          id: remap(d.id),
          node_id: remap(d.node_id),
        })),
      })),
      equivalenceClasses: project.equivalenceClasses.map((ec) => ({
        ...ec,
        id: remap(ec.id),
        representative_loop_id: remap(ec.representative_loop_id),
        sample_loop_ids: ec.sample_loop_ids.map(remap),
        first_occurrence_loop_id: remap(ec.first_occurrence_loop_id),
        last_occurrence_loop_id: remap(ec.last_occurrence_loop_id),
      })),
      knowledgeStates: project.knowledgeStates.map((ks) => ({
        ...ks,
        id: remap(ks.id),
      })),
    };

    await this.saveProject(remappedProject);
    return remappedProject;
  },

  // ----------------------------------------
  // Database Management
  // ----------------------------------------

  async clearAllData(): Promise<void> {
    await db.delete();
    await db.open();
  },

  async getDatabaseSize(): Promise<{ projects: number; loops: number; totalRecords: number }> {
    const [projects, loops, epochs, equivalenceClasses, knowledgeStates, graphs] = await Promise.all([
      db.projects.count(),
      db.loops.count(),
      db.epochs.count(),
      db.equivalenceClasses.count(),
      db.knowledgeStates.count(),
      db.graphs.count(),
    ]);

    return {
      projects,
      loops,
      totalRecords: projects + loops + epochs + equivalenceClasses + knowledgeStates + graphs,
    };
  },
};

export default storageService;
