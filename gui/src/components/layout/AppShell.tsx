/**
 * AppShell Component
 *
 * Main layout container for Loop Studio with 4-pane workspace
 */

import { useCallback, useEffect } from 'react';
import { useUIStore, useProjectStore } from '@/stores';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { MenuBar } from './MenuBar';
import { CommandPalette } from './CommandPalette';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { LoopInspector } from '@/components/loop/LoopInspector';
import { NarrativeEditor } from '@/components/narrative/NarrativeEditor';
import { ValidationPanel } from '@/components/validation/ValidationPanel';

export function AppShell() {
  const {
    panels,
    isSidebarCollapsed,
    sidebarWidth,
    isCommandPaletteOpen,
    toggleCommandPalette,
    shortcutsEnabled,
  } = useUIStore();

  const { project } = useProjectStore();

  // Global keyboard shortcuts
  useEffect(() => {
    if (!shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsEnabled, toggleCommandPalette]);

  const effectiveSidebarWidth = isSidebarCollapsed ? 0 : sidebarWidth;

  return (
    <div className="h-screen flex flex-col bg-loop-bg-dark text-gray-100 overflow-hidden">
      {/* Menu Bar */}
      <MenuBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {panels.projectTree.visible && !isSidebarCollapsed && (
          <div
            className="flex-shrink-0 border-r border-gray-700/50 overflow-hidden"
            style={{ width: effectiveSidebarWidth }}
          >
            <Sidebar />
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Area: Graph Canvas + Inspector */}
          <div className="flex-1 flex overflow-hidden">
            {/* Graph Canvas */}
            {panels.graphCanvas.visible && (
              <div className="flex-1 overflow-hidden">
                <GraphCanvas />
              </div>
            )}

            {/* Loop Inspector */}
            {panels.loopInspector.visible && (
              <div
                className="flex-shrink-0 border-l border-gray-700/50 overflow-hidden"
                style={{ width: panels.loopInspector.width }}
              >
                <LoopInspector />
              </div>
            )}
          </div>

          {/* Bottom Area: Narrative Preview + Validation */}
          <div className="flex border-t border-gray-700/50">
            {/* Narrative Editor */}
            {panels.narrativePreview.visible && (
              <div
                className="flex-1 overflow-hidden"
                style={{ height: panels.narrativePreview.height }}
              >
                <NarrativeEditor />
              </div>
            )}

            {/* Validation Panel */}
            {panels.validation.visible && (
              <div
                className="flex-shrink-0 border-l border-gray-700/50 overflow-hidden"
                style={{ height: panels.validation.height, width: 300 }}
              >
                <ValidationPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && <CommandPalette />}

      {/* Welcome Screen (when no project) */}
      {!project && <WelcomeOverlay />}
    </div>
  );
}

function WelcomeOverlay() {
  const { createProject } = useProjectStore();

  const handleNewProject = useCallback(() => {
    createProject('Untitled Project', 'A new time-loop narrative');
  }, [createProject]);

  return (
    <div className="fixed inset-0 bg-loop-bg-dark/95 flex items-center justify-center z-40">
      <div className="max-w-lg text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <svg
            className="w-24 h-24 text-loop-primary"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M 32 12 A 20 20 0 1 1 12 32"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <polygon points="12,26 12,38 6,32" fill="currentColor" />
            <circle cx="32" cy="32" r="4" fill="currentColor" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Loop Studio</h1>
          <p className="text-gray-400">Visual editor for time-loop narratives</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={handleNewProject} className="btn-primary text-lg py-3">
            Create New Project
          </button>
          <button className="btn-secondary py-3">Open Project</button>
          <button className="btn-ghost py-2 text-sm">Import from File</button>
        </div>

        {/* Quick Tips */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>
            <kbd className="kbd">Cmd</kbd> + <kbd className="kbd">K</kbd> to open
            command palette
          </p>
          <p>
            <kbd className="kbd">Cmd</kbd> + <kbd className="kbd">S</kbd> to save
          </p>
        </div>
      </div>
    </div>
  );
}
