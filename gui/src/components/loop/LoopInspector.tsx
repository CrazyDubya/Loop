/**
 * LoopInspector Component
 *
 * Detailed view of the currently selected loop
 */

import { useMemo } from 'react';
import { useUIStore, useLoopStore, useProjectStore } from '@/stores';
import type { Loop, Decision, EmotionalState, EMOTIONAL_STATE_CONFIG } from '@/types';

const EMOTION_COLORS: Record<EmotionalState, string> = {
  hopeful: 'text-green-400',
  curious: 'text-cyan-400',
  frustrated: 'text-orange-400',
  desperate: 'text-red-400',
  numb: 'text-gray-400',
  determined: 'text-blue-400',
  broken: 'text-rose-800',
  calm: 'text-teal-400',
  angry: 'text-red-600',
  resigned: 'text-gray-500',
};

export function LoopInspector() {
  const { selection, setHighlightedPath } = useUIStore();
  const { loops, equivalenceClasses } = useLoopStore();
  const { project } = useProjectStore();

  const selectedLoop = useMemo(() => {
    if (!selection.selectedLoopId) return null;
    return loops.find((l) => l.id === selection.selectedLoopId) ?? null;
  }, [selection.selectedLoopId, loops]);

  const equivClass = useMemo(() => {
    if (!selectedLoop?.equivalence_class_id) return null;
    return equivalenceClasses.find((ec) => ec.id === selectedLoop.equivalence_class_id) ?? null;
  }, [selectedLoop, equivalenceClasses]);

  // Highlight path on graph when loop is selected
  useMemo(() => {
    if (selectedLoop?.path) {
      setHighlightedPath(selectedLoop.path);
    }
  }, [selectedLoop?.path, setHighlightedPath]);

  if (!selectedLoop) {
    return (
      <div className="h-full flex items-center justify-center bg-loop-bg-darker text-gray-500 p-4">
        <div className="text-center">
          <LoopPlaceholderIcon />
          <p className="mt-4 text-sm">Select a loop to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-loop-bg-darker overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Loop #{selectedLoop.sequence_number}</h3>
          <StatusBadge status={selectedLoop.status} />
        </div>
        {selectedLoop.is_anchor && (
          <span className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
            <StarIcon /> Anchor Loop
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <Section title="Overview">
          <InfoRow label="Outcome" value={selectedLoop.outcome.type} />
          {selectedLoop.outcome.cause && (
            <InfoRow label="Cause" value={selectedLoop.outcome.cause} />
          )}
          <InfoRow label="Decisions" value={`${selectedLoop.decisions.length}`} />
          {selectedLoop.duration_story_minutes && (
            <InfoRow label="Duration" value={`${selectedLoop.duration_story_minutes} min`} />
          )}
        </Section>

        {/* Emotional Journey */}
        <Section title="Emotional State">
          <div className="flex items-center gap-2">
            <span className={EMOTION_COLORS[selectedLoop.emotional_state_start]}>
              {selectedLoop.emotional_state_start}
            </span>
            <span className="text-gray-600">→</span>
            <span className={EMOTION_COLORS[selectedLoop.emotional_state_end ?? selectedLoop.emotional_state_start]}>
              {selectedLoop.emotional_state_end ?? selectedLoop.emotional_state_start}
            </span>
          </div>
        </Section>

        {/* Path */}
        {selectedLoop.path && selectedLoop.path.length > 0 && (
          <Section title="Path">
            <div className="flex flex-wrap gap-1">
              {selectedLoop.path.map((nodeId, index) => {
                const node = project?.graph.nodes.find((n) => n.id === nodeId);
                return (
                  <span key={index} className="inline-flex items-center">
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                      {node?.label ?? nodeId.slice(0, 8)}
                    </span>
                    {index < selectedLoop.path!.length - 1 && (
                      <span className="text-gray-600 mx-1">→</span>
                    )}
                  </span>
                );
              })}
            </div>
          </Section>
        )}

        {/* Decisions */}
        {selectedLoop.decisions.length > 0 && (
          <Section title="Decisions">
            <div className="space-y-2">
              {selectedLoop.decisions.map((decision, index) => (
                <DecisionItem
                  key={decision.id}
                  decision={decision}
                  index={index}
                  graph={project?.graph}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Equivalence Class */}
        {equivClass && (
          <Section title="Equivalence Class">
            <div className="text-xs space-y-1">
              <InfoRow label="Members" value={`${equivClass.member_count} loops`} />
              <div className="text-gray-400">{equivClass.outcome_summary}</div>
            </div>
          </Section>
        )}

        {/* Operator */}
        {selectedLoop.operator_used && (
          <Section title="Operator">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-loop-primary/20 text-loop-primary rounded text-xs">
                {selectedLoop.operator_used}
              </span>
              {selectedLoop.operator_target && (
                <span className="text-gray-400 text-xs">
                  → {selectedLoop.operator_target}
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Tags */}
        {selectedLoop.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-1">
              {selectedLoop.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {selectedLoop.notes && (
          <Section title="Notes">
            <p className="text-sm text-gray-400 whitespace-pre-wrap">
              {selectedLoop.notes}
            </p>
          </Section>
        )}

        {/* Narrative Summary */}
        {selectedLoop.narrative_summary && (
          <Section title="Narrative">
            <p className="text-sm text-gray-300 italic">
              "{selectedLoop.narrative_summary}"
            </p>
          </Section>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-700/50 space-y-2">
        <button className="w-full btn-secondary text-xs">
          Generate Narrative
        </button>
        <div className="flex gap-2">
          <button className="flex-1 btn-ghost text-xs">Edit</button>
          <button className="flex-1 btn-ghost text-xs">Duplicate</button>
          <button className="flex-1 btn-ghost text-xs text-red-400">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    aborted: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  );
}

function DecisionItem({
  decision,
  index,
  graph,
}: {
  decision: Decision;
  index: number;
  graph?: { nodes: Array<{ id: string; label: string }> };
}) {
  const node = graph?.nodes.find((n) => n.id === decision.node_id);

  return (
    <div className="p-2 bg-gray-800/50 rounded text-xs">
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">#{index + 1}</span>
        <span className="text-gray-500">{decision.timestamp.split('T')[1]?.slice(0, 5)}</span>
      </div>
      <div className="text-gray-300">
        At {node?.label ?? decision.node_id.slice(0, 8)}: chose{' '}
        <span className="text-yellow-400">
          {decision.choice_label ?? `option ${decision.choice_index + 1}`}
        </span>
      </div>
      {decision.rationale && (
        <div className="text-gray-500 mt-1 italic">"{decision.rationale}"</div>
      )}
    </div>
  );
}

// ============================================
// Icons
// ============================================

function LoopPlaceholderIcon() {
  return (
    <svg className="w-16 h-16 text-gray-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
