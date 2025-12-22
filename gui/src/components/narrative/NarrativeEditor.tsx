/**
 * NarrativeEditor Component
 *
 * Prose preview and editing with tone selection
 */

import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useUIStore, useLoopStore, useProjectStore } from '@/stores';
import { narrativeService } from '@/services';
import type { NarrativeTone, NARRATIVE_TONE_CONFIG, StyleConfig, DEFAULT_STYLE_CONFIG } from '@/types';

const TONE_OPTIONS: Array<{ value: NarrativeTone; label: string; description: string }> = [
  { value: 'clinical', label: 'Clinical', description: 'Detached, analytical' },
  { value: 'hopeful', label: 'Hopeful', description: 'Optimistic despite repetition' },
  { value: 'desperate', label: 'Desperate', description: 'Panicked desperation' },
  { value: 'melancholic', label: 'Melancholic', description: 'Mournful reflection' },
  { value: 'dark_humor', label: 'Dark Humor', description: 'Sardonic wit' },
  { value: 'philosophical', label: 'Philosophical', description: 'Contemplative wisdom' },
  { value: 'terse', label: 'Terse', description: 'Minimalist brevity' },
  { value: 'poetic', label: 'Poetic', description: 'Lyrical descriptions' },
];

export function NarrativeEditor() {
  const { selection } = useUIStore();
  const { loops } = useLoopStore();
  const { project } = useProjectStore();

  const [selectedTone, setSelectedTone] = useState<NarrativeTone>('clinical');
  const [customContent, setCustomContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const selectedLoop = useMemo(() => {
    if (!selection.selectedLoopId) return null;
    return loops.find((l) => l.id === selection.selectedLoopId) ?? null;
  }, [selection.selectedLoopId, loops]);

  // Generate narrative preview
  const narrativePreview = useMemo(() => {
    if (!selectedLoop || !project?.graph) return '';

    return narrativeService.generatePreview(selectedLoop, project.graph, {
      tone: selectedTone,
      detailLevel: 'standard',
      perspective: 'third_person_limited',
      includeInternalMonologue: false,
      includeTimestamps: false,
      paragraphStyle: 'medium',
      emotionalEmphasis: 0.5,
    });
  }, [selectedLoop, project?.graph, selectedTone]);

  // Word count
  const wordCount = useMemo(() => {
    const content = isEditing ? customContent : narrativePreview;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [isEditing, customContent, narrativePreview]);

  if (!selectedLoop) {
    return (
      <div className="h-full flex items-center justify-center bg-loop-bg-darker text-gray-500 p-4">
        <div className="text-center">
          <NarrativePlaceholderIcon />
          <p className="mt-4 text-sm">Select a loop to preview narrative</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-loop-bg-darker overflow-hidden">
      {/* Header with Tone Selector */}
      <div className="px-4 py-2 border-b border-gray-700/50 flex items-center gap-4">
        <h3 className="font-medium text-sm">Narrative Preview</h3>

        {/* Tone Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Tone:</label>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value as NarrativeTone)}
            className="select text-xs py-1 px-2 bg-gray-800 border-gray-700"
          >
            {TONE_OPTIONS.map((tone) => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Edit Toggle */}
        <button
          onClick={() => {
            if (!isEditing) {
              setCustomContent(narrativePreview);
            }
            setIsEditing(!isEditing);
          }}
          className={`btn-ghost text-xs ${isEditing ? 'text-loop-primary' : ''}`}
        >
          {isEditing ? 'Preview' : 'Edit'}
        </button>

        {/* Word Count */}
        <span className="text-xs text-gray-500">{wordCount} words</span>
      </div>

      {/* Tone Description */}
      <div className="px-4 py-1 bg-gray-800/30 text-xs text-gray-500">
        {TONE_OPTIONS.find((t) => t.value === selectedTone)?.description}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={customContent}
            onChange={(value) => setCustomContent(value ?? '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'off',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              padding: { top: 16 },
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {narrativePreview || (
                  <span className="text-gray-500 italic">
                    No narrative generated. This loop may need more context.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Actions */}
      <div className="px-4 py-2 border-t border-gray-700/50 flex items-center gap-2">
        <button className="btn-ghost text-xs" onClick={() => setSelectedTone('clinical')}>
          Reset Tone
        </button>
        <div className="flex-1" />
        <button className="btn-ghost text-xs">Copy</button>
        <button className="btn-secondary text-xs">Save to Loop</button>
        <button className="btn-primary text-xs">Regenerate</button>
      </div>
    </div>
  );
}

function NarrativePlaceholderIcon() {
  return (
    <svg className="w-16 h-16 text-gray-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
