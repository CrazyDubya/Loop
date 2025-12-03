/**
 * LoopNode Component
 *
 * Custom React Flow node for day graph visualization
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { GraphNode, NodeType } from '@/types';

interface LoopNodeData extends GraphNode {
  isHighlighted?: boolean;
  isOnPath?: boolean;
}

const NODE_COLORS: Record<NodeType, { bg: string; border: string; text: string }> = {
  event: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  decision: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  location: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  encounter: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  discovery: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  death: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  reset: { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400' },
};

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  event: <CalendarIcon />,
  decision: <GitBranchIcon />,
  location: <MapPinIcon />,
  encounter: <UsersIcon />,
  discovery: <LightbulbIcon />,
  death: <SkullIcon />,
  reset: <RefreshIcon />,
};

export const LoopNode = memo(({ data, selected }: NodeProps<LoopNodeData>) => {
  const colors = NODE_COLORS[data.type] ?? NODE_COLORS.event;
  const isDecision = data.type === 'decision';
  const isTerminal = data.type === 'death' || data.type === 'reset';

  return (
    <div
      className={`
        min-w-[120px] rounded-lg border-2 transition-all
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-loop-primary ring-offset-2 ring-offset-loop-bg-dark' : ''}
        ${data.isOnPath ? 'shadow-lg shadow-loop-primary/30' : ''}
        ${data.critical ? 'border-dashed' : 'border-solid'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400"
      />

      {/* Content */}
      <div className="px-3 py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className={colors.text}>{NODE_ICONS[data.type]}</span>
          <span className="text-xs text-gray-500 font-mono">{data.time_slot}</span>
          {data.critical && (
            <span className="text-xs text-yellow-400" title="Critical node">
              ★
            </span>
          )}
        </div>

        {/* Label */}
        <div className="font-medium text-sm text-gray-100 truncate max-w-[150px]">
          {data.label}
        </div>

        {/* Description (if short) */}
        {data.description && data.description.length < 50 && (
          <div className="text-xs text-gray-400 mt-1 truncate">
            {data.description}
          </div>
        )}

        {/* Decision choices indicator */}
        {isDecision && data.choices && data.choices.length > 0 && (
          <div className="mt-2 text-xs text-yellow-400/70">
            {data.choices.length} choice{data.choices.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Location badge */}
        {data.location && (
          <div className="mt-1 text-xs text-blue-400/70 flex items-center gap-1">
            <MapPinIcon className="w-3 h-3" />
            {data.location}
          </div>
        )}
      </div>

      {/* Output Handle(s) */}
      {!isTerminal && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-gray-600 border-2 border-gray-400"
        />
      )}

      {/* Multiple output handles for decision nodes */}
      {isDecision && data.choices && data.choices.length > 1 && (
        <>
          {data.choices.map((choice, index) => (
            <Handle
              key={choice.index}
              type="source"
              position={Position.Right}
              id={`choice-${choice.index}`}
              className="w-2 h-2 bg-yellow-500 border-2 border-yellow-400"
              style={{
                top: `${30 + (index * 20)}%`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
});

LoopNode.displayName = 'LoopNode';

// ============================================
// Icons
// ============================================

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GitBranchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10m0-10a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0zM7 7a2 2 0 100-4 2 2 0 000 4zm10 10V9a2 2 0 00-2-2H9" />
    </svg>
  );
}

function MapPinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function LightbulbIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function SkullIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="10" r="7" strokeWidth={2} />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
      <path strokeLinecap="round" strokeWidth={2} d="M9 17v4M12 17v4M15 17v4" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
