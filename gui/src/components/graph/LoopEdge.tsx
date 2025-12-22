/**
 * LoopEdge Component
 *
 * Custom React Flow edge for day graph visualization
 */

import { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import type { GraphEdge, EdgeType } from '@/types';

interface LoopEdgeData extends GraphEdge {
  isOnPath?: boolean;
}

const EDGE_STYLES: Record<EdgeType, { stroke: string; strokeWidth: number; dashArray?: string }> = {
  default: { stroke: '#6b7280', strokeWidth: 2 },
  choice: { stroke: '#eab308', strokeWidth: 2 },
  conditional: { stroke: '#8b5cf6', strokeWidth: 2, dashArray: '5,5' },
  timed: { stroke: '#06b6d4', strokeWidth: 2, dashArray: '10,5' },
  random: { stroke: '#f97316', strokeWidth: 2, dashArray: '2,3' },
};

export const LoopEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}: EdgeProps<LoopEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType = data?.type ?? 'default';
  const edgeStyle = EDGE_STYLES[edgeType];
  const isOnPath = data?.isOnPath ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isOnPath ? '#6366f1' : selected ? '#a855f7' : edgeStyle.stroke,
          strokeWidth: isOnPath ? 3 : edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.dashArray,
          ...style,
        }}
      />

      {/* Edge Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 bg-loop-bg-darker border border-gray-700 rounded text-xs text-gray-400"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Duration indicator */}
      {data?.duration_minutes && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, 50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] text-gray-500"
          >
            {data.duration_minutes}min
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Conditional indicator */}
      {data?.conditions && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -150%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] text-purple-400"
            title={formatConditions(data.conditions)}
          >
            ⚡
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

LoopEdge.displayName = 'LoopEdge';

function formatConditions(conditions: GraphEdge['conditions']): string {
  if (!conditions) return '';
  const parts: string[] = [];

  if (conditions.requires_knowledge?.length) {
    parts.push(`Requires: ${conditions.requires_knowledge.join(', ')}`);
  }
  if (conditions.requires_item?.length) {
    parts.push(`Items: ${conditions.requires_item.join(', ')}`);
  }
  if (conditions.time_window) {
    const { after, before } = conditions.time_window;
    if (after && before) {
      parts.push(`Time: ${after} - ${before}`);
    } else if (after) {
      parts.push(`After: ${after}`);
    } else if (before) {
      parts.push(`Before: ${before}`);
    }
  }

  return parts.join('\n');
}
