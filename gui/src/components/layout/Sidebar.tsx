/**
 * Sidebar Component
 *
 * Project tree navigation with epochs, loops, and equivalence classes
 */

import { useState } from 'react';
import { useProjectStore, useLoopStore, useUIStore } from '@/stores';
import type { Epoch, Loop, EquivalenceClass } from '@/types';

// Icons (inline SVGs for simplicity)
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const LoopIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const LayersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`w-3 h-3 ${filled ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`}
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

export function Sidebar() {
  const { project } = useProjectStore();
  const { loops, equivalenceClasses } = useLoopStore();
  const { selection, selectLoop, selectEpoch, selectEquivClass } = useUIStore();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['epochs', 'equivClasses'])
  );
  const [expandedEpochs, setExpandedEpochs] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleEpoch = (epochId: string) => {
    setExpandedEpochs((prev) => {
      const next = new Set(prev);
      if (next.has(epochId)) {
        next.delete(epochId);
      } else {
        next.add(epochId);
      }
      return next;
    });
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No project open
      </div>
    );
  }

  const epochs = project.epochs.sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col bg-loop-bg-darker">
      {/* Project Header */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h2 className="font-semibold text-sm truncate">{project.name}</h2>
        <p className="text-xs text-gray-500 truncate">
          {loops.length} loops · {epochs.length} epochs
        </p>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Epochs Section */}
        <TreeSection
          title="Epochs"
          icon={<FolderIcon />}
          isExpanded={expandedSections.has('epochs')}
          onToggle={() => toggleSection('epochs')}
          count={epochs.length}
        >
          {epochs.map((epoch) => (
            <EpochItem
              key={epoch.id}
              epoch={epoch}
              loops={loops.filter((l) => l.epoch_id === epoch.id)}
              isExpanded={expandedEpochs.has(epoch.id)}
              isSelected={selection.selectedEpochId === epoch.id}
              selectedLoopId={selection.selectedLoopId}
              onToggle={() => toggleEpoch(epoch.id)}
              onSelect={() => selectEpoch(epoch.id)}
              onSelectLoop={(loopId) => selectLoop(loopId)}
            />
          ))}
          {epochs.length === 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 italic">No epochs yet</div>
          )}
        </TreeSection>

        {/* Equivalence Classes Section */}
        <TreeSection
          title="Equivalence Classes"
          icon={<LayersIcon />}
          isExpanded={expandedSections.has('equivClasses')}
          onToggle={() => toggleSection('equivClasses')}
          count={equivalenceClasses.length}
        >
          {equivalenceClasses.map((ec) => (
            <EquivClassItem
              key={ec.id}
              equivClass={ec}
              isSelected={selection.selectedEquivClassId === ec.id}
              onSelect={() => selectEquivClass(ec.id)}
            />
          ))}
          {equivalenceClasses.length === 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 italic">
              No equivalence classes yet
            </div>
          )}
        </TreeSection>

        {/* Anchor Loops Section */}
        <TreeSection
          title="Anchor Loops"
          icon={<StarIcon filled />}
          isExpanded={expandedSections.has('anchors')}
          onToggle={() => toggleSection('anchors')}
          count={loops.filter((l) => l.is_anchor).length}
        >
          {loops
            .filter((l) => l.is_anchor)
            .map((loop) => (
              <LoopItem
                key={loop.id}
                loop={loop}
                isSelected={selection.selectedLoopId === loop.id}
                onSelect={() => selectLoop(loop.id)}
                indent={1}
              />
            ))}
        </TreeSection>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2 border-t border-gray-700/50 space-y-1">
        <button className="w-full btn-ghost text-xs justify-start">
          + Add Epoch
        </button>
        <button className="w-full btn-ghost text-xs justify-start">
          + New Loop
        </button>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface TreeSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}

function TreeSection({
  title,
  icon,
  isExpanded,
  onToggle,
  count,
  children,
}: TreeSectionProps) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/30 text-left text-sm font-medium text-gray-300"
      >
        <ChevronIcon open={isExpanded} />
        {icon}
        <span className="flex-1">{title}</span>
        <span className="text-xs text-gray-500">{count}</span>
      </button>
      {isExpanded && <div className="mt-1">{children}</div>}
    </div>
  );
}

interface EpochItemProps {
  epoch: Epoch;
  loops: Loop[];
  isExpanded: boolean;
  isSelected: boolean;
  selectedLoopId: string | null;
  onToggle: () => void;
  onSelect: () => void;
  onSelectLoop: (loopId: string) => void;
}

function EpochItem({
  epoch,
  loops,
  isExpanded,
  isSelected,
  selectedLoopId,
  onToggle,
  onSelect,
  onSelectLoop,
}: EpochItemProps) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 px-4 py-1 cursor-pointer text-sm ${
          isSelected
            ? 'bg-loop-primary/20 text-loop-primary'
            : 'hover:bg-gray-700/30 text-gray-300'
        }`}
      >
        <button onClick={onToggle} className="p-0.5">
          <ChevronIcon open={isExpanded} />
        </button>
        <span onClick={onSelect} className="flex-1 truncate">
          {epoch.name}
        </span>
        <span className="text-xs text-gray-500">{loops.length}</span>
      </div>
      {isExpanded && loops.length > 0 && (
        <div className="ml-4">
          {loops.slice(0, 20).map((loop) => (
            <LoopItem
              key={loop.id}
              loop={loop}
              isSelected={selectedLoopId === loop.id}
              onSelect={() => onSelectLoop(loop.id)}
              indent={2}
            />
          ))}
          {loops.length > 20 && (
            <div className="px-4 py-1 text-xs text-gray-500">
              +{loops.length - 20} more loops
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LoopItemProps {
  loop: Loop;
  isSelected: boolean;
  onSelect: () => void;
  indent: number;
}

function LoopItem({ loop, isSelected, onSelect, indent }: LoopItemProps) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    aborted: 'bg-red-500',
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 py-1 cursor-pointer text-sm ${
        isSelected
          ? 'bg-loop-primary/20 text-loop-primary'
          : 'hover:bg-gray-700/30 text-gray-400'
      }`}
      style={{ paddingLeft: `${indent * 12 + 16}px` }}
    >
      <LoopIcon />
      <span className="flex-1 truncate">Loop #{loop.sequence_number}</span>
      {loop.is_anchor && <StarIcon filled />}
      <span className={`status-dot ${statusColors[loop.status]}`} />
    </div>
  );
}

interface EquivClassItemProps {
  equivClass: EquivalenceClass;
  isSelected: boolean;
  onSelect: () => void;
}

function EquivClassItem({ equivClass, isSelected, onSelect }: EquivClassItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-1 cursor-pointer text-sm ${
        isSelected
          ? 'bg-loop-primary/20 text-loop-primary'
          : 'hover:bg-gray-700/30 text-gray-400'
      }`}
    >
      <LayersIcon />
      <span className="flex-1 truncate text-xs">{equivClass.outcome_summary}</span>
      <span className="text-xs text-gray-500">{equivClass.member_count}</span>
    </div>
  );
}
