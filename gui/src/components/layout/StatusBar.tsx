/**
 * StatusBar Component
 *
 * Bottom status bar with project info, validation status, and stats
 */

import { useProjectStore, useLoopStore, useUIStore } from '@/stores';
import { validationService } from '@/services';
import { useMemo } from 'react';

export function StatusBar() {
  const { project, isDirty, lastSaved } = useProjectStore();
  const { loops, equivalenceClasses } = useLoopStore();
  const { selection, viewMode, graphZoom } = useUIStore();

  // Validation status
  const validationResult = useMemo(() => {
    if (!project) return null;
    return validationService.validateGraph(project.graph);
  }, [project?.graph]);

  const errorCount = validationResult?.issues.filter((i) => i.severity === 'error').length ?? 0;
  const warningCount = validationResult?.issues.filter((i) => i.severity === 'warning').length ?? 0;

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return 'Never saved';
    const date = new Date(lastSaved);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString();
  }, [lastSaved]);

  if (!project) {
    return (
      <div className="h-6 bg-loop-bg-darker border-t border-gray-700/50 px-4 flex items-center text-xs text-gray-500">
        No project open
      </div>
    );
  }

  return (
    <div className="h-6 bg-loop-bg-darker border-t border-gray-700/50 px-2 flex items-center text-xs text-gray-400 gap-4">
      {/* Validation Status */}
      <div className="flex items-center gap-2">
        {errorCount > 0 ? (
          <span className="flex items-center gap-1 text-red-400">
            <ErrorIcon />
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        ) : warningCount > 0 ? (
          <span className="flex items-center gap-1 text-yellow-400">
            <WarningIcon />
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-400">
            <CheckIcon />
            Valid
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Stats */}
      <div className="flex items-center gap-3">
        <span>Loops: {loops.length}</span>
        <span>Equiv: {equivalenceClasses.length}</span>
        <span>Nodes: {project.graph.nodes.length}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Current Selection */}
      {selection.selectedLoopId && (
        <span className="text-loop-primary">Loop #{selection.selectedLoopId.slice(0, 8)}</span>
      )}
      {selection.selectedNodeIds.length > 0 && (
        <span className="text-loop-accent">
          {selection.selectedNodeIds.length} node{selection.selectedNodeIds.length !== 1 ? 's' : ''} selected
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* View Mode */}
      <span className="capitalize">{viewMode} mode</span>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Zoom */}
      <span>{Math.round(graphZoom * 100)}%</span>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Save Status */}
      <div className="flex items-center gap-2">
        {isDirty && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Unsaved changes" />}
        <span>{lastSavedText}</span>
      </div>
    </div>
  );
}

// ============================================
// Icons
// ============================================

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
