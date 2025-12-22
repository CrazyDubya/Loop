/**
 * ValidationPanel Component
 *
 * Real-time validation feedback for graph and loops
 */

import { useMemo } from 'react';
import { useProjectStore, useUIStore } from '@/stores';
import { validationService } from '@/services';
import type { ValidationIssue, ValidationSeverity } from '@/types';

const SEVERITY_STYLES: Record<ValidationSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    icon: <ErrorIcon />,
  },
  warning: {
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
    icon: <WarningIcon />,
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
    icon: <InfoIcon />,
  },
};

export function ValidationPanel() {
  const { project } = useProjectStore();
  const { selectNode, selectLoop } = useUIStore();

  // Run validation
  const validationResult = useMemo(() => {
    if (!project?.graph) {
      return { valid: true, issues: [], checkedAt: new Date().toISOString() };
    }
    return validationService.validateGraph(project.graph, {
      checkReachability: true,
      checkDeadEnds: true,
      checkTimeConsistency: true,
    });
  }, [project?.graph]);

  const errors = validationResult.issues.filter((i) => i.severity === 'error');
  const warnings = validationResult.issues.filter((i) => i.severity === 'warning');
  const infos = validationResult.issues.filter((i) => i.severity === 'info');

  const handleIssueClick = (issue: ValidationIssue) => {
    if (issue.nodeId) {
      selectNode(issue.nodeId);
    } else if (issue.loopId) {
      selectLoop(issue.loopId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-loop-bg-darker overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-700/50 flex items-center gap-3">
        <h3 className="font-medium text-sm">Validation</h3>
        <div className="flex-1" />
        <StatusSummary errors={errors.length} warnings={warnings.length} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {validationResult.issues.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-400 text-sm">
            <CheckIcon />
            <span className="ml-2">All validations passed</span>
          </div>
        ) : (
          <>
            {/* Errors first */}
            {errors.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onClick={() => handleIssueClick(issue)}
              />
            ))}

            {/* Then warnings */}
            {warnings.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onClick={() => handleIssueClick(issue)}
              />
            ))}

            {/* Then info */}
            {infos.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onClick={() => handleIssueClick(issue)}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700/50 flex items-center text-xs text-gray-500">
        <span>Last checked: {new Date(validationResult.checkedAt).toLocaleTimeString()}</span>
        <div className="flex-1" />
        <button className="btn-ghost text-xs">Revalidate</button>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function StatusSummary({ errors, warnings }: { errors: number; warnings: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {errors > 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <ErrorIcon />
          {errors}
        </span>
      )}
      {warnings > 0 && (
        <span className="flex items-center gap-1 text-yellow-400">
          <WarningIcon />
          {warnings}
        </span>
      )}
      {errors === 0 && warnings === 0 && (
        <span className="flex items-center gap-1 text-green-400">
          <CheckIcon />
          OK
        </span>
      )}
    </div>
  );
}

function IssueItem({
  issue,
  onClick,
}: {
  issue: ValidationIssue;
  onClick: () => void;
}) {
  const style = SEVERITY_STYLES[issue.severity];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded border ${style.bg} ${style.text} hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm">{issue.message}</div>
          {issue.suggestion && (
            <div className="text-xs opacity-70 mt-1">
              Suggestion: {issue.suggestion}
            </div>
          )}
          {issue.path && (
            <div className="text-xs opacity-50 mt-1 font-mono">
              {issue.path}
            </div>
          )}
        </div>
        {(issue.nodeId || issue.loopId) && (
          <span className="text-xs opacity-50">
            Click to locate
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================
// Icons
// ============================================

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
