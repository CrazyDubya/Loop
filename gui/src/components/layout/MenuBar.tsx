/**
 * MenuBar Component
 *
 * Top menu bar with file, edit, view menus and toolbar
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore, useUIStore } from '@/stores';
import { exportService, storageService } from '@/services';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

export function MenuBar() {
  const { project, isDirty, saveProject, createProject, closeProject } = useProjectStore();
  const { togglePanel, panels, toggleSidebar, toggleCommandPalette, setViewMode, viewMode } = useUIStore();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle menu actions
  const handleExportJSON = async () => {
    if (!project) return;
    const content = await exportService.export(project, {
      format: 'json',
      includeNarratives: true,
      includeMetadata: true,
      compressEquivalenceClasses: false,
    });
    exportService.downloadFile(content, `${project.name}.json`, 'application/json');
    setOpenMenu(null);
  };

  const handleExportMarkdown = async () => {
    if (!project) return;
    const content = await exportService.export(project, {
      format: 'markdown',
      includeNarratives: true,
      includeMetadata: true,
      compressEquivalenceClasses: true,
    });
    exportService.downloadFile(content, `${project.name}.md`, 'text/markdown');
    setOpenMenu(null);
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Cmd+N', action: () => { createProject('New Project'); setOpenMenu(null); } },
        { label: 'Open...', shortcut: 'Cmd+O', action: () => setOpenMenu(null) },
        { separator: true, label: '' },
        { label: 'Save', shortcut: 'Cmd+S', action: () => { saveProject(); setOpenMenu(null); }, disabled: !isDirty },
        { label: 'Save As...', shortcut: 'Cmd+Shift+S', action: () => setOpenMenu(null) },
        { separator: true, label: '' },
        { label: 'Export as JSON', action: handleExportJSON, disabled: !project },
        { label: 'Export as Markdown', action: handleExportMarkdown, disabled: !project },
        { label: 'Export as DOT', action: () => setOpenMenu(null), disabled: !project },
        { separator: true, label: '' },
        { label: 'Close Project', action: () => { closeProject(); setOpenMenu(null); }, disabled: !project },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Cmd+Z', action: () => setOpenMenu(null) },
        { label: 'Redo', shortcut: 'Cmd+Shift+Z', action: () => setOpenMenu(null) },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Cmd+X', action: () => setOpenMenu(null) },
        { label: 'Copy', shortcut: 'Cmd+C', action: () => setOpenMenu(null) },
        { label: 'Paste', shortcut: 'Cmd+V', action: () => setOpenMenu(null) },
        { label: 'Delete', shortcut: 'Del', action: () => setOpenMenu(null) },
        { separator: true, label: '' },
        { label: 'Select All', shortcut: 'Cmd+A', action: () => setOpenMenu(null) },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Command Palette', shortcut: 'Cmd+K', action: () => { toggleCommandPalette(); setOpenMenu(null); } },
        { separator: true, label: '' },
        { label: `${panels.projectTree.visible ? '✓ ' : ''}Project Tree`, action: () => { togglePanel('projectTree'); setOpenMenu(null); } },
        { label: `${panels.graphCanvas.visible ? '✓ ' : ''}Graph Canvas`, action: () => { togglePanel('graphCanvas'); setOpenMenu(null); } },
        { label: `${panels.loopInspector.visible ? '✓ ' : ''}Loop Inspector`, action: () => { togglePanel('loopInspector'); setOpenMenu(null); } },
        { label: `${panels.narrativePreview.visible ? '✓ ' : ''}Narrative Preview`, action: () => { togglePanel('narrativePreview'); setOpenMenu(null); } },
        { label: `${panels.validation.visible ? '✓ ' : ''}Validation Panel`, action: () => { togglePanel('validation'); setOpenMenu(null); } },
        { separator: true, label: '' },
        { label: 'Toggle Sidebar', shortcut: 'Cmd+B', action: () => { toggleSidebar(); setOpenMenu(null); } },
        { separator: true, label: '' },
        { label: `${viewMode === 'edit' ? '• ' : ''}Edit Mode`, action: () => { setViewMode('edit'); setOpenMenu(null); } },
        { label: `${viewMode === 'preview' ? '• ' : ''}Preview Mode`, action: () => { setViewMode('preview'); setOpenMenu(null); } },
        { label: `${viewMode === 'timeline' ? '• ' : ''}Timeline Mode`, action: () => { setViewMode('timeline'); setOpenMenu(null); } },
      ],
    },
    {
      label: 'Graph',
      items: [
        { label: 'Add Node', shortcut: 'N', action: () => setOpenMenu(null), disabled: !project },
        { label: 'Add Edge', shortcut: 'E', action: () => setOpenMenu(null), disabled: !project },
        { separator: true, label: '' },
        { label: 'Auto Layout', action: () => setOpenMenu(null), disabled: !project },
        { label: 'Fit to View', shortcut: 'Cmd+0', action: () => setOpenMenu(null), disabled: !project },
        { separator: true, label: '' },
        { label: 'Validate Graph', shortcut: 'Cmd+Shift+V', action: () => setOpenMenu(null), disabled: !project },
      ],
    },
    {
      label: 'Loop',
      items: [
        { label: 'New Loop', shortcut: 'Cmd+L', action: () => setOpenMenu(null), disabled: !project },
        { label: 'Duplicate Loop', action: () => setOpenMenu(null), disabled: !project },
        { separator: true, label: '' },
        { label: 'Mark as Anchor', action: () => setOpenMenu(null), disabled: !project },
        { label: 'Assign to Equivalence Class', action: () => setOpenMenu(null), disabled: !project },
        { separator: true, label: '' },
        { label: 'Generate Narrative', shortcut: 'Cmd+G', action: () => setOpenMenu(null), disabled: !project },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', action: () => window.open('https://loop-engine.dev/docs', '_blank') },
        { label: 'Keyboard Shortcuts', shortcut: 'Cmd+/', action: () => setOpenMenu(null) },
        { separator: true, label: '' },
        { label: 'About Loop Studio', action: () => setOpenMenu(null) },
      ],
    },
  ];

  return (
    <div
      ref={menuBarRef}
      className="h-8 bg-loop-bg-darker border-b border-gray-700/50 flex items-center px-2 text-sm select-none"
    >
      {/* App Logo */}
      <div className="flex items-center gap-2 px-2 mr-2">
        <svg className="w-5 h-5 text-loop-primary" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="4" />
          <path d="M 32 16 A 16 16 0 1 1 16 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {/* Menus */}
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            className={`px-3 py-1 rounded hover:bg-gray-700/50 ${
              openMenu === menu.label ? 'bg-gray-700/50' : ''
            }`}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div className="absolute top-full left-0 mt-1 py-1 min-w-[200px] bg-loop-bg-darker border border-gray-700 rounded-lg shadow-xl z-50">
              {menu.items.map((item, index) =>
                item.separator ? (
                  <div key={index} className="my-1 border-t border-gray-700" />
                ) : (
                  <button
                    key={item.label}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left ${
                      item.disabled
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'hover:bg-gray-700/50 text-gray-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project Name */}
      {project && (
        <div className="flex items-center gap-2 px-3 text-gray-400">
          <span className="truncate max-w-[200px]">{project.name}</span>
          {isDirty && <span className="text-yellow-500">●</span>}
        </div>
      )}
    </div>
  );
}
