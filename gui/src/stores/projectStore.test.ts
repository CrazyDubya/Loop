/**
 * Project Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store
    useProjectStore.setState({
      project: null,
      isLoading: false,
      isDirty: false,
      lastSaved: null,
    });
  });

  describe('createProject', () => {
    it('should create a new project', () => {
      useProjectStore.getState().createProject('Test Project', 'A test description');

      const { project } = useProjectStore.getState();
      expect(project).not.toBeNull();
      expect(project?.name).toBe('Test Project');
      expect(project?.description).toBe('A test description');
      expect(project?.graph.nodes).toEqual([]);
      expect(project?.epochs).toEqual([]);
      expect(project?.loops).toEqual([]);
    });

    it('should create project with default settings', () => {
      useProjectStore.getState().createProject('Test');

      const { project } = useProjectStore.getState();
      expect(project?.settings.defaultTone).toBe('clinical');
      expect(project?.settings.autoSave).toBe(true);
      expect(project?.settings.theme).toBe('dark');
    });

    it('should set isDirty to false on new project', () => {
      useProjectStore.getState().createProject('Test');
      expect(useProjectStore.getState().isDirty).toBe(false);
    });
  });

  describe('loadProject', () => {
    it('should load an existing project', () => {
      const mockProject = {
        id: 'test-id',
        name: 'Loaded Project',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        graph: {
          id: 'graph-id',
          name: 'Test Graph',
          time_bounds: { start: '06:00', end: '23:59' },
          start_node_id: '',
          nodes: [],
          edges: [],
        },
        epochs: [],
        loops: [],
        equivalenceClasses: [],
        knowledgeStates: [],
        settings: {
          defaultTone: 'clinical' as const,
          defaultDetailLevel: 'standard' as const,
          defaultPerspective: 'third_person_limited' as const,
          autoValidate: true,
          autoSave: true,
          theme: 'dark' as const,
        },
      };

      useProjectStore.getState().loadProject(mockProject);

      const { project, isDirty, lastSaved } = useProjectStore.getState();
      expect(project?.id).toBe('test-id');
      expect(project?.name).toBe('Loaded Project');
      expect(isDirty).toBe(false);
      expect(lastSaved).toBe(mockProject.updated_at);
    });
  });

  describe('updateProjectSettings', () => {
    it('should update project settings', () => {
      useProjectStore.getState().createProject('Test');
      useProjectStore.getState().updateProjectSettings({ defaultTone: 'poetic' });

      const { project, isDirty } = useProjectStore.getState();
      expect(project?.settings.defaultTone).toBe('poetic');
      expect(isDirty).toBe(true);
    });

    it('should not update if no project', () => {
      useProjectStore.getState().updateProjectSettings({ defaultTone: 'poetic' });
      expect(useProjectStore.getState().project).toBeNull();
    });
  });

  describe('graph operations', () => {
    beforeEach(() => {
      useProjectStore.getState().createProject('Test');
    });

    it('should add a node', () => {
      const nodeId = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '08:00',
        label: 'Wake Up',
      });

      const { project, isDirty } = useProjectStore.getState();
      expect(nodeId).toBeDefined();
      expect(project?.graph.nodes).toHaveLength(1);
      expect(project?.graph.nodes[0].label).toBe('Wake Up');
      expect(project?.graph.start_node_id).toBe(nodeId); // First node becomes start
      expect(isDirty).toBe(true);
    });

    it('should update a node', () => {
      const nodeId = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '08:00',
        label: 'Original',
      });

      useProjectStore.getState().updateNode(nodeId, { label: 'Updated' });

      const { project } = useProjectStore.getState();
      expect(project?.graph.nodes[0].label).toBe('Updated');
    });

    it('should remove a node and its edges', () => {
      const node1 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '08:00',
        label: 'Node 1',
      });
      const node2 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '09:00',
        label: 'Node 2',
      });
      useProjectStore.getState().addEdge({ source_id: node1, target_id: node2 });

      useProjectStore.getState().removeNode(node1);

      const { project } = useProjectStore.getState();
      expect(project?.graph.nodes).toHaveLength(1);
      expect(project?.graph.edges).toHaveLength(0);
    });

    it('should add an edge', () => {
      const node1 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '08:00',
        label: 'Node 1',
      });
      const node2 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '09:00',
        label: 'Node 2',
      });

      const edgeId = useProjectStore.getState().addEdge({
        source_id: node1,
        target_id: node2,
      });

      const { project } = useProjectStore.getState();
      expect(edgeId).toBeDefined();
      expect(project?.graph.edges).toHaveLength(1);
      expect(project?.graph.edges[0].source_id).toBe(node1);
      expect(project?.graph.edges[0].target_id).toBe(node2);
    });

    it('should remove an edge', () => {
      const node1 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '08:00',
        label: 'Node 1',
      });
      const node2 = useProjectStore.getState().addNode({
        type: 'event',
        time_slot: '09:00',
        label: 'Node 2',
      });
      const edgeId = useProjectStore.getState().addEdge({
        source_id: node1,
        target_id: node2,
      });

      useProjectStore.getState().removeEdge(edgeId);

      const { project } = useProjectStore.getState();
      expect(project?.graph.edges).toHaveLength(0);
    });
  });

  describe('epoch operations', () => {
    beforeEach(() => {
      useProjectStore.getState().createProject('Test');
    });

    it('should add an epoch', () => {
      const epochId = useProjectStore.getState().addEpoch({
        name: 'Denial',
        order: 0,
        strategy_profile: {
          primary_operator: 'explore',
          risk_tolerance: 'low',
        },
      });

      const { project, isDirty } = useProjectStore.getState();
      expect(epochId).toBeDefined();
      expect(project?.epochs).toHaveLength(1);
      expect(project?.epochs[0].name).toBe('Denial');
      expect(isDirty).toBe(true);
    });

    it('should update an epoch', () => {
      const epochId = useProjectStore.getState().addEpoch({
        name: 'Denial',
        order: 0,
        strategy_profile: {
          primary_operator: 'explore',
          risk_tolerance: 'low',
        },
      });

      useProjectStore.getState().updateEpoch(epochId, { name: 'Acceptance' });

      const { project } = useProjectStore.getState();
      expect(project?.epochs[0].name).toBe('Acceptance');
    });

    it('should remove an epoch and reorder remaining', () => {
      useProjectStore.getState().addEpoch({
        name: 'Epoch 1',
        order: 0,
        strategy_profile: { primary_operator: 'explore', risk_tolerance: 'low' },
      });
      const epoch2 = useProjectStore.getState().addEpoch({
        name: 'Epoch 2',
        order: 1,
        strategy_profile: { primary_operator: 'cause', risk_tolerance: 'medium' },
      });
      useProjectStore.getState().addEpoch({
        name: 'Epoch 3',
        order: 2,
        strategy_profile: { primary_operator: 'avoid', risk_tolerance: 'high' },
      });

      useProjectStore.getState().removeEpoch(epoch2);

      const { project } = useProjectStore.getState();
      expect(project?.epochs).toHaveLength(2);
      expect(project?.epochs[0].name).toBe('Epoch 1');
      expect(project?.epochs[0].order).toBe(0);
      expect(project?.epochs[1].name).toBe('Epoch 3');
      expect(project?.epochs[1].order).toBe(1);
    });
  });

  describe('closeProject', () => {
    it('should close the project', () => {
      useProjectStore.getState().createProject('Test');
      useProjectStore.getState().closeProject();

      const { project, isDirty, lastSaved } = useProjectStore.getState();
      expect(project).toBeNull();
      expect(isDirty).toBe(false);
      expect(lastSaved).toBeNull();
    });
  });
});
