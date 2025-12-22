/**
 * CommandPalette Component
 *
 * Quick command search modal (Cmd+K)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUIStore, useProjectStore, useLoopStore } from '@/stores';
import type { Command } from '@/types';

export function CommandPalette() {
  const { closeCommandPalette, togglePanel, setViewMode, selectLoop, selectEpoch } = useUIStore();
  const { project, createProject, saveProject } = useProjectStore();
  const { loops } = useLoopStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Define commands
  const commands: Command[] = useMemo(() => [
    // File commands
    { id: 'new-project', label: 'New Project', category: 'file', shortcut: 'Cmd+N', action: () => { createProject('New Project'); closeCommandPalette(); } },
    { id: 'save', label: 'Save Project', category: 'file', shortcut: 'Cmd+S', action: () => { saveProject(); closeCommandPalette(); } },

    // View commands
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', category: 'view', shortcut: 'Cmd+B', action: () => { useUIStore.getState().toggleSidebar(); closeCommandPalette(); } },
    { id: 'edit-mode', label: 'Switch to Edit Mode', category: 'view', action: () => { setViewMode('edit'); closeCommandPalette(); } },
    { id: 'preview-mode', label: 'Switch to Preview Mode', category: 'view', action: () => { setViewMode('preview'); closeCommandPalette(); } },
    { id: 'timeline-mode', label: 'Switch to Timeline Mode', category: 'view', action: () => { setViewMode('timeline'); closeCommandPalette(); } },

    // Panel commands
    { id: 'toggle-tree', label: 'Toggle Project Tree', category: 'view', action: () => { togglePanel('projectTree'); closeCommandPalette(); } },
    { id: 'toggle-inspector', label: 'Toggle Loop Inspector', category: 'view', action: () => { togglePanel('loopInspector'); closeCommandPalette(); } },
    { id: 'toggle-narrative', label: 'Toggle Narrative Preview', category: 'view', action: () => { togglePanel('narrativePreview'); closeCommandPalette(); } },
    { id: 'toggle-validation', label: 'Toggle Validation Panel', category: 'view', action: () => { togglePanel('validation'); closeCommandPalette(); } },

    // Graph commands
    { id: 'add-node', label: 'Add Node', category: 'graph', shortcut: 'N', action: () => closeCommandPalette(), description: 'Add a new node to the graph' },
    { id: 'add-edge', label: 'Add Edge', category: 'graph', shortcut: 'E', action: () => closeCommandPalette(), description: 'Connect two nodes' },
    { id: 'fit-view', label: 'Fit Graph to View', category: 'graph', shortcut: 'Cmd+0', action: () => closeCommandPalette() },

    // Loop commands
    { id: 'new-loop', label: 'Create New Loop', category: 'loop', shortcut: 'Cmd+L', action: () => closeCommandPalette() },

    // Help commands
    { id: 'docs', label: 'Open Documentation', category: 'help', action: () => { window.open('https://loop-engine.dev/docs', '_blank'); closeCommandPalette(); } },

    // Dynamic: loops to navigate to
    ...loops.slice(0, 10).map((loop) => ({
      id: `goto-loop-${loop.id}`,
      label: `Go to Loop #${loop.sequence_number}`,
      category: 'loop' as const,
      description: `${loop.status} - ${loop.outcome.type}`,
      action: () => { selectLoop(loop.id); closeCommandPalette(); },
    })),

    // Dynamic: epochs to navigate to
    ...(project?.epochs ?? []).map((epoch) => ({
      id: `goto-epoch-${epoch.id}`,
      label: `Go to Epoch: ${epoch.name}`,
      category: 'loop' as const,
      action: () => { selectEpoch(epoch.id); closeCommandPalette(); },
    })),
  ], [project, loops, createProject, saveProject, closeCommandPalette, togglePanel, setViewMode, selectLoop, selectEpoch]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 10);

    const lower = query.toLowerCase();
    return commands
      .filter((cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.description?.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower)
      )
      .slice(0, 15);
  }, [query, commands]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeCommandPalette();
        break;
    }
  };

  // Category icons
  const categoryIcons: Record<string, React.ReactNode> = {
    file: <FileIcon />,
    edit: <EditIcon />,
    view: <ViewIcon />,
    graph: <GraphIcon />,
    loop: <LoopIcon />,
    narrative: <NarrativeIcon />,
    help: <HelpIcon />,
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-lg bg-loop-bg-darker border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-base"
          />
          <kbd className="kbd text-xs">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={command.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                  index === selectedIndex
                    ? 'bg-loop-primary/20 text-loop-primary'
                    : 'text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                <span className="text-gray-500">{categoryIcons[command.category]}</span>
                <div className="flex-1">
                  <div className="text-sm">{command.label}</div>
                  {command.description && (
                    <div className="text-xs text-gray-500">{command.description}</div>
                  )}
                </div>
                {command.shortcut && (
                  <span className="text-xs text-gray-500">{command.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Icons
// ============================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function NarrativeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
