/**
 * Engine Bridge Tests
 */

import { describe, it, expect } from 'vitest';
import { validationService, narrativeService, pathService } from './engineBridge';
import type { DayGraphData, Loop } from '@/types';

describe('validationService', () => {
  describe('validateGraph', () => {
    it('should pass validation for empty graph with warning', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: '',
        nodes: [],
        edges: [],
      };

      const result = validationService.validateGraph(graph);
      expect(result.valid).toBe(true);
      expect(result.issues.some((i) => i.message.includes('no nodes'))).toBe(true);
    });

    it('should error when start node does not exist', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'nonexistent',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Test' },
        ],
        edges: [],
      };

      const result = validationService.validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.severity === 'error')).toBe(true);
    });

    it('should warn about dead end nodes', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Start' },
          { id: 'node2', type: 'event', time_slot: '09:00', label: 'Dead End' },
        ],
        edges: [
          { id: 'edge1', source_id: 'node1', target_id: 'node2' },
        ],
      };

      const result = validationService.validateGraph(graph);
      expect(result.issues.some((i) => i.message.includes('no outgoing edges'))).toBe(true);
    });

    it('should warn about orphaned nodes', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Start' },
          { id: 'node2', type: 'event', time_slot: '09:00', label: 'Orphan' },
        ],
        edges: [],
      };

      const result = validationService.validateGraph(graph);
      expect(result.issues.some((i) => i.message.includes('no incoming edges'))).toBe(true);
    });

    it('should not warn about death/reset nodes without outgoing edges', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Start' },
          { id: 'node2', type: 'death', time_slot: '09:00', label: 'Death' },
        ],
        edges: [
          { id: 'edge1', source_id: 'node1', target_id: 'node2' },
        ],
      };

      const result = validationService.validateGraph(graph);
      expect(result.issues.filter((i) => i.nodeId === 'node2' && i.message.includes('no outgoing'))).toHaveLength(0);
    });

    it('should warn about decision nodes with fewer than 2 choices', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'decision', time_slot: '08:00', label: 'Decision' },
          { id: 'node2', type: 'death', time_slot: '09:00', label: 'End' },
        ],
        edges: [
          { id: 'edge1', source_id: 'node1', target_id: 'node2' },
        ],
      };

      const result = validationService.validateGraph(graph);
      expect(result.issues.some((i) => i.message.includes('fewer than 2'))).toBe(true);
    });

    it('should error on dangling edges', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Start' },
        ],
        edges: [
          { id: 'edge1', source_id: 'node1', target_id: 'nonexistent' },
        ],
      };

      const result = validationService.validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('non-existent'))).toBe(true);
    });
  });
});

describe('narrativeService', () => {
  describe('generatePreview', () => {
    it('should generate narrative for a loop', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Wake Up', description: 'The alarm rings.' },
          { id: 'node2', type: 'death', time_slot: '09:00', label: 'Death' },
        ],
        edges: [],
      };

      const loop: Loop = {
        id: 'loop1',
        sequence_number: 1,
        epoch_id: 'epoch1',
        graph_id: 'test',
        status: 'completed',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        knowledge_state_start_id: 'ks1',
        emotional_state_start: 'hopeful',
        emotional_state_end: 'desperate',
        decisions: [],
        decision_vector: [],
        path: ['node1', 'node2'],
        outcome: {
          id: 'out1',
          type: 'death',
          terminal_node_id: 'node2',
          timestamp: new Date().toISOString(),
          cause: 'explosion',
        },
        is_anchor: false,
        tags: [],
      };

      const narrative = narrativeService.generatePreview(loop, graph, { tone: 'clinical' });
      expect(narrative).toBeDefined();
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should generate different narratives for different tones', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'event', time_slot: '08:00', label: 'Wake Up' },
        ],
        edges: [],
      };

      const loop: Loop = {
        id: 'loop1',
        sequence_number: 1,
        epoch_id: 'epoch1',
        graph_id: 'test',
        status: 'completed',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        knowledge_state_start_id: 'ks1',
        emotional_state_start: 'hopeful',
        decisions: [],
        decision_vector: [],
        path: ['node1'],
        outcome: {
          id: 'out1',
          type: 'death',
          terminal_node_id: 'node1',
          timestamp: new Date().toISOString(),
        },
        is_anchor: false,
        tags: [],
      };

      const clinical = narrativeService.generatePreview(loop, graph, { tone: 'clinical' });
      const desperate = narrativeService.generatePreview(loop, graph, { tone: 'desperate' });
      const poetic = narrativeService.generatePreview(loop, graph, { tone: 'poetic' });

      // Different tones should produce different text
      expect(clinical).not.toBe(desperate);
      expect(desperate).not.toBe(poetic);
    });
  });
});

describe('pathService', () => {
  describe('findPaths', () => {
    it('should find paths to target node', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'a',
        nodes: [
          { id: 'a', type: 'event', time_slot: '08:00', label: 'A' },
          { id: 'b', type: 'event', time_slot: '09:00', label: 'B' },
          { id: 'c', type: 'event', time_slot: '10:00', label: 'C' },
        ],
        edges: [
          { id: 'e1', source_id: 'a', target_id: 'b' },
          { id: 'e2', source_id: 'b', target_id: 'c' },
          { id: 'e3', source_id: 'a', target_id: 'c' },
        ],
      };

      const paths = pathService.findPaths(graph, 'c');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.join('->') === 'a->c')).toBe(true);
      expect(paths.some((p) => p.join('->') === 'a->b->c')).toBe(true);
    });

    it('should return empty array if no path exists', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'a',
        nodes: [
          { id: 'a', type: 'event', time_slot: '08:00', label: 'A' },
          { id: 'b', type: 'event', time_slot: '09:00', label: 'B' },
        ],
        edges: [],
      };

      const paths = pathService.findPaths(graph, 'b');
      expect(paths).toHaveLength(0);
    });
  });

  describe('isReachable', () => {
    it('should return true for reachable nodes', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'a',
        nodes: [
          { id: 'a', type: 'event', time_slot: '08:00', label: 'A' },
          { id: 'b', type: 'event', time_slot: '09:00', label: 'B' },
        ],
        edges: [
          { id: 'e1', source_id: 'a', target_id: 'b' },
        ],
      };

      expect(pathService.isReachable(graph, 'b')).toBe(true);
    });

    it('should return false for unreachable nodes', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'a',
        nodes: [
          { id: 'a', type: 'event', time_slot: '08:00', label: 'A' },
          { id: 'b', type: 'event', time_slot: '09:00', label: 'B' },
        ],
        edges: [],
      };

      expect(pathService.isReachable(graph, 'b')).toBe(false);
    });

    it('should return true for start node', () => {
      const graph: DayGraphData = {
        id: 'test',
        name: 'Test',
        time_bounds: { start: '06:00', end: '23:59' },
        start_node_id: 'a',
        nodes: [
          { id: 'a', type: 'event', time_slot: '08:00', label: 'A' },
        ],
        edges: [],
      };

      expect(pathService.isReachable(graph, 'a')).toBe(true);
    });
  });
});
