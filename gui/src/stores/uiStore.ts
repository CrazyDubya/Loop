/**
 * UI State Store
 *
 * Manages global UI state: theme, panels, selection, view modes
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelId, PanelLayout, UISelection, ViewMode, Command } from '@/types';

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Panel visibility and layout
  panels: Record<PanelId, PanelLayout>;
  togglePanel: (panelId: PanelId) => void;
  setPanelWidth: (panelId: PanelId, width: number) => void;

  // Selection state
  selection: UISelection;
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  selectLoop: (loopId: string | null) => void;
  selectEpoch: (epochId: string | null) => void;
  selectEquivClass: (equivClassId: string | null) => void;
  setHighlightedPath: (path: string[]) => void;
  clearSelection: () => void;

  // Command palette
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Sidebar
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Modal state
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Zoom and pan state for graph
  graphZoom: number;
  setGraphZoom: (zoom: number) => void;

  // Keyboard shortcuts enabled
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  duration?: number;
}

const DEFAULT_PANELS: Record<PanelId, PanelLayout> = {
  projectTree: { id: 'projectTree', visible: true, width: 250 },
  graphCanvas: { id: 'graphCanvas', visible: true },
  loopInspector: { id: 'loopInspector', visible: true, width: 300 },
  narrativePreview: { id: 'narrativePreview', visible: true, height: 200 },
  validation: { id: 'validation', visible: true, height: 150 },
};

const DEFAULT_SELECTION: UISelection = {
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectedLoopId: null,
  selectedEpochId: null,
  selectedEquivClassId: null,
  highlightedPath: [],
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // View mode
      viewMode: 'edit',
      setViewMode: (viewMode) => set({ viewMode }),

      // Panels
      panels: DEFAULT_PANELS,
      togglePanel: (panelId) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              visible: !state.panels[panelId].visible,
            },
          },
        })),
      setPanelWidth: (panelId, width) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              width,
            },
          },
        })),

      // Selection
      selection: DEFAULT_SELECTION,
      selectNode: (nodeId, addToSelection = false) =>
        set((state) => ({
          selection: {
            ...state.selection,
            selectedNodeIds: addToSelection
              ? [...state.selection.selectedNodeIds, nodeId]
              : [nodeId],
          },
        })),
      selectEdge: (edgeId, addToSelection = false) =>
        set((state) => ({
          selection: {
            ...state.selection,
            selectedEdgeIds: addToSelection
              ? [...state.selection.selectedEdgeIds, edgeId]
              : [edgeId],
          },
        })),
      selectLoop: (loopId) =>
        set((state) => ({
          selection: { ...state.selection, selectedLoopId: loopId },
        })),
      selectEpoch: (epochId) =>
        set((state) => ({
          selection: { ...state.selection, selectedEpochId: epochId },
        })),
      selectEquivClass: (equivClassId) =>
        set((state) => ({
          selection: { ...state.selection, selectedEquivClassId: equivClassId },
        })),
      setHighlightedPath: (path) =>
        set((state) => ({
          selection: { ...state.selection, highlightedPath: path },
        })),
      clearSelection: () => set({ selection: DEFAULT_SELECTION }),

      // Command palette
      isCommandPaletteOpen: false,
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

      // Sidebar
      sidebarWidth: 250,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      // Modal
      activeModal: null,
      openModal: (modalId) => set({ activeModal: modalId }),
      closeModal: () => set({ activeModal: null }),

      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
          ],
        })),
      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Graph zoom
      graphZoom: 1,
      setGraphZoom: (zoom) => set({ graphZoom: zoom }),

      // Shortcuts
      shortcutsEnabled: true,
      setShortcutsEnabled: (enabled) => set({ shortcutsEnabled: enabled }),
    }),
    {
      name: 'loop-studio-ui',
      partialize: (state) => ({
        theme: state.theme,
        panels: state.panels,
        sidebarWidth: state.sidebarWidth,
        isSidebarCollapsed: state.isSidebarCollapsed,
        shortcutsEnabled: state.shortcutsEnabled,
      }),
    }
  )
);
