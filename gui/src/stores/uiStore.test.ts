/**
 * UI Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUIStore.setState({
      theme: 'dark',
      viewMode: 'edit',
      selection: {
        selectedNodeIds: [],
        selectedEdgeIds: [],
        selectedLoopId: null,
        selectedEpochId: null,
        selectedEquivClassId: null,
        highlightedPath: [],
      },
      isCommandPaletteOpen: false,
      notifications: [],
    });
  });

  describe('theme', () => {
    it('should default to dark theme', () => {
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should set theme', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
    });
  });

  describe('view mode', () => {
    it('should default to edit mode', () => {
      expect(useUIStore.getState().viewMode).toBe('edit');
    });

    it('should change view mode', () => {
      useUIStore.getState().setViewMode('preview');
      expect(useUIStore.getState().viewMode).toBe('preview');

      useUIStore.getState().setViewMode('timeline');
      expect(useUIStore.getState().viewMode).toBe('timeline');
    });
  });

  describe('selection', () => {
    it('should select a node', () => {
      useUIStore.getState().selectNode('node-1');
      expect(useUIStore.getState().selection.selectedNodeIds).toEqual(['node-1']);
    });

    it('should add to selection when addToSelection is true', () => {
      useUIStore.getState().selectNode('node-1');
      useUIStore.getState().selectNode('node-2', true);
      expect(useUIStore.getState().selection.selectedNodeIds).toEqual(['node-1', 'node-2']);
    });

    it('should replace selection when addToSelection is false', () => {
      useUIStore.getState().selectNode('node-1');
      useUIStore.getState().selectNode('node-2', false);
      expect(useUIStore.getState().selection.selectedNodeIds).toEqual(['node-2']);
    });

    it('should select a loop', () => {
      useUIStore.getState().selectLoop('loop-1');
      expect(useUIStore.getState().selection.selectedLoopId).toBe('loop-1');
    });

    it('should clear selection', () => {
      useUIStore.getState().selectNode('node-1');
      useUIStore.getState().selectLoop('loop-1');
      useUIStore.getState().clearSelection();

      const selection = useUIStore.getState().selection;
      expect(selection.selectedNodeIds).toEqual([]);
      expect(selection.selectedLoopId).toBeNull();
    });

    it('should set highlighted path', () => {
      const path = ['node-1', 'node-2', 'node-3'];
      useUIStore.getState().setHighlightedPath(path);
      expect(useUIStore.getState().selection.highlightedPath).toEqual(path);
    });
  });

  describe('command palette', () => {
    it('should default to closed', () => {
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });

    it('should open command palette', () => {
      useUIStore.getState().openCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);
    });

    it('should close command palette', () => {
      useUIStore.getState().openCommandPalette();
      useUIStore.getState().closeCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });

    it('should toggle command palette', () => {
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);

      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });
  });

  describe('panels', () => {
    it('should toggle panel visibility', () => {
      const initialVisibility = useUIStore.getState().panels.projectTree.visible;
      useUIStore.getState().togglePanel('projectTree');
      expect(useUIStore.getState().panels.projectTree.visible).toBe(!initialVisibility);
    });

    it('should set panel width', () => {
      useUIStore.getState().setPanelWidth('loopInspector', 400);
      expect(useUIStore.getState().panels.loopInspector.width).toBe(400);
    });
  });

  describe('notifications', () => {
    it('should add notification', () => {
      useUIStore.getState().addNotification({
        type: 'success',
        message: 'Test notification',
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test notification');
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].id).toBeDefined();
      expect(notifications[0].timestamp).toBeDefined();
    });

    it('should dismiss notification', () => {
      useUIStore.getState().addNotification({
        type: 'info',
        message: 'Test',
      });

      const id = useUIStore.getState().notifications[0].id;
      useUIStore.getState().dismissNotification(id);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      useUIStore.getState().addNotification({ type: 'info', message: 'One' });
      useUIStore.getState().addNotification({ type: 'info', message: 'Two' });
      useUIStore.getState().clearNotifications();
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('sidebar', () => {
    it('should toggle sidebar', () => {
      const initialState = useUIStore.getState().isSidebarCollapsed;
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(!initialState);
    });

    it('should set sidebar width', () => {
      useUIStore.getState().setSidebarWidth(300);
      expect(useUIStore.getState().sidebarWidth).toBe(300);
    });
  });
});
