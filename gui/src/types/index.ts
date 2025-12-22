/**
 * Loop Studio Type Definitions
 *
 * These types mirror and extend the core Loop Engine types for GUI use.
 * They bridge the existing TypeScript engine with React components.
 */

// ============================================
// Re-exported Core Types
// ============================================

export type EmotionalState =
  | 'hopeful'
  | 'curious'
  | 'frustrated'
  | 'desperate'
  | 'numb'
  | 'determined'
  | 'broken'
  | 'calm'
  | 'angry'
  | 'resigned';

export type OperatorType =
  | 'explore'
  | 'cause'
  | 'avoid'
  | 'trigger'
  | 'relive'
  | 'vary'
  | 'chaos';

export type LoopStatus = 'in_progress' | 'completed' | 'aborted';

export type OutcomeType =
  | 'death'
  | 'reset_trigger'
  | 'day_end'
  | 'voluntary_reset'
  | 'sub_loop_exit'
  | 'success'
  | 'failure'
  | 'partial';

export type NodeType =
  | 'event'
  | 'decision'
  | 'location'
  | 'encounter'
  | 'discovery'
  | 'death'
  | 'reset';

export type EdgeType =
  | 'default'
  | 'choice'
  | 'conditional'
  | 'timed'
  | 'random';

export type NarrativeTone =
  | 'hopeful'
  | 'desperate'
  | 'clinical'
  | 'melancholic'
  | 'dark_humor'
  | 'philosophical'
  | 'terse'
  | 'poetic';

export type DetailLevel = 'minimal' | 'standard' | 'detailed' | 'verbose';
export type Perspective = 'first_person' | 'second_person' | 'third_person' | 'third_person_limited';
export type RiskTolerance = 'minimal' | 'low' | 'medium' | 'high' | 'reckless';

// ============================================
// Graph Types
// ============================================

export interface NodeChoice {
  index: number;
  label: string;
  target_edge_id: string;
  requires_knowledge?: string[];
  probability_weight?: number;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  time_slot: string; // HH:MM format
  label: string;
  description?: string;
  location?: string;
  critical?: boolean;
  time_flexible?: boolean;
  choices?: NodeChoice[];
  knowledge_available?: string[];
  characters_present?: string[];
  tags?: string[];
}

export interface EdgeConditions {
  requires_knowledge?: string[];
  requires_item?: string[];
  time_window?: {
    after?: string;
    before?: string;
  };
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type?: EdgeType;
  weight?: number;
  conditions?: EdgeConditions;
  duration_minutes?: number;
  label?: string;
}

export interface TimeBounds {
  start: string;
  end: string;
}

export interface DayGraphData {
  id: string;
  name: string;
  version?: number;
  time_bounds: TimeBounds;
  start_node_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================
// Decision & Outcome Types
// ============================================

export interface Decision {
  id: string;
  node_id: string;
  choice_index: number;
  choice_label?: string;
  timestamp: string;
  confidence?: number;
  rationale?: string;
  influenced_by?: string[];
}

export type CharacterState =
  | 'alive'
  | 'dead'
  | 'injured'
  | 'escaped'
  | 'captured'
  | 'unknown';

export interface CharacterAffected {
  character_id: string;
  state: CharacterState;
}

export interface Outcome {
  id: string;
  type: OutcomeType;
  terminal_node_id: string;
  timestamp: string;
  cause?: string;
  world_state_delta?: Record<string, string | number | boolean | null>;
  characters_affected?: CharacterAffected[];
  hash?: string;
}

// ============================================
// Sub-Loop Types
// ============================================

export interface StrategyAttempt {
  strategy: string;
  attempts: number;
  success: boolean;
  notes?: string;
}

export interface PsychologicalEffect {
  frustration_delta?: number;
  mastery_delta?: number;
  description?: string;
}

export interface SubLoop {
  id: string;
  parent_loop_id: string;
  parent_sub_loop_id?: string | null;
  depth: number;
  start_node_id: string;
  start_time: string;
  end_node_id: string;
  end_time?: string;
  attempt_count: number;
  strategies_tried?: StrategyAttempt[];
  best_outcome_id: string;
  final_outcome_id?: string;
  knowledge_gained?: string[];
  psychological_effect?: PsychologicalEffect;
  narrative_summary?: string;
}

// ============================================
// Loop (Main Entity)
// ============================================

export interface Loop {
  id: string;
  sequence_number: number;
  parent_id?: string | null;
  epoch_id: string;
  graph_id: string;
  status: LoopStatus;
  created_at: string;
  started_at: string;
  ended_at?: string | null;
  duration_story_minutes?: number | null;
  knowledge_state_start_id: string;
  knowledge_state_end_id?: string | null;
  emotional_state_start: EmotionalState;
  emotional_state_end?: EmotionalState | null;
  decisions: Decision[];
  decision_vector: number[];
  path?: string[];
  outcome: Outcome;
  sub_loops?: SubLoop[];
  equivalence_class_id?: string | null;
  is_anchor: boolean;
  tags: string[];
  operator_used?: OperatorType | null;
  operator_target?: string | null;
  narrative_summary?: string | null;
  notes?: string | null;
}

// ============================================
// Epoch Types
// ============================================

export interface StrategyProfile {
  primary_operator: OperatorType;
  risk_tolerance: RiskTolerance;
  goals?: string[];
}

export interface EpochConditions {
  min_loop_count?: number;
  max_loop_count?: number;
  required_knowledge?: string[];
  trigger_event?: string;
  required_outcome?: string;
  knowledge_threshold?: string;
}

export interface Epoch {
  id: string;
  name: string;
  order: number;
  description?: string;
  strategy_profile: StrategyProfile;
  emotional_baseline?: EmotionalState;
  entry_conditions?: EpochConditions;
  exit_conditions?: EpochConditions;
  anchor_loop_ids?: string[];
  loop_count?: number;
}

// ============================================
// Equivalence Class Types
// ============================================

export interface EquivalenceClass {
  id: string;
  outcome_hash: string;
  knowledge_end_hash: string;
  composite_hash: string;
  representative_loop_id: string;
  sample_loop_ids: string[];
  member_count: number;
  epoch_distribution: Record<string, number>;
  outcome_summary: string;
  knowledge_delta_summary: string;
  common_tags: string[];
  decision_vector_centroid?: number[];
  decision_vector_variance?: number;
  first_occurrence_loop_id: string;
  last_occurrence_loop_id: string;
  created_at: string;
  updated_at: string;
  narrative_template?: string;
}

// ============================================
// Knowledge State Types
// ============================================

export interface KnowledgeState {
  id: string;
  facts: string[];
  skills?: string[];
  relationships?: Record<string, string>;
  items?: string[];
  hash?: string;
}

// ============================================
// Project Types (GUI-specific)
// ============================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  graph: DayGraphData;
  epochs: Epoch[];
  loops: Loop[];
  equivalenceClasses: EquivalenceClass[];
  knowledgeStates: KnowledgeState[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  defaultTone: NarrativeTone;
  defaultDetailLevel: DetailLevel;
  defaultPerspective: Perspective;
  autoValidate: boolean;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultTone: 'clinical',
  defaultDetailLevel: 'standard',
  defaultPerspective: 'third_person_limited',
  autoValidate: true,
  autoSave: true,
  theme: 'dark',
};

// ============================================
// Validation Types
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
  nodeId?: string;
  loopId?: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  checkedAt: string;
}

// ============================================
// UI State Types
// ============================================

export type ViewMode = 'edit' | 'preview' | 'comparison' | 'timeline';
export type PanelId = 'projectTree' | 'graphCanvas' | 'loopInspector' | 'narrativePreview' | 'validation';

export interface PanelLayout {
  id: PanelId;
  visible: boolean;
  width?: number;
  height?: number;
}

export interface UISelection {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  selectedLoopId: string | null;
  selectedEpochId: string | null;
  selectedEquivClassId: string | null;
  highlightedPath: string[];
}

// ============================================
// Narrative Types
// ============================================

export interface StyleConfig {
  tone: NarrativeTone;
  detailLevel: DetailLevel;
  perspective: Perspective;
  includeInternalMonologue: boolean;
  includeTimestamps: boolean;
  paragraphStyle: 'short' | 'medium' | 'long';
  emotionalEmphasis: number;
}

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  tone: 'clinical',
  detailLevel: 'standard',
  perspective: 'third_person_limited',
  includeInternalMonologue: false,
  includeTimestamps: false,
  paragraphStyle: 'medium',
  emotionalEmphasis: 0.5,
};

export interface NarrativePreview {
  loopId: string;
  prose: string;
  wordCount: number;
  tone: NarrativeTone;
  generatedAt: string;
}

// ============================================
// React Flow Integration Types
// ============================================

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: GraphNode;
  selected?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: EdgeType;
  data: GraphEdge;
  animated?: boolean;
  style?: Record<string, string | number>;
}

// ============================================
// Command Palette Types
// ============================================

export interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: 'file' | 'edit' | 'view' | 'graph' | 'loop' | 'narrative' | 'help';
  action: () => void;
}

// ============================================
// Export/Import Types
// ============================================

export interface ExportOptions {
  format: 'json' | 'markdown' | 'html' | 'dot' | 'mermaid';
  includeNarratives: boolean;
  includeMetadata: boolean;
  compressEquivalenceClasses: boolean;
}

export interface ImportResult {
  success: boolean;
  project?: Project;
  errors?: string[];
  warnings?: string[];
}

// ============================================
// Helpers
// ============================================

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

// Node type metadata for UI
export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; color: string; icon: string }> = {
  event: { label: 'Event', color: '#22c55e', icon: 'calendar' },
  decision: { label: 'Decision', color: '#eab308', icon: 'git-branch' },
  location: { label: 'Location', color: '#3b82f6', icon: 'map-pin' },
  encounter: { label: 'Encounter', color: '#f97316', icon: 'users' },
  discovery: { label: 'Discovery', color: '#a855f7', icon: 'lightbulb' },
  death: { label: 'Death', color: '#ef4444', icon: 'skull' },
  reset: { label: 'Reset', color: '#f43f5e', icon: 'refresh-cw' },
};

// Emotional state metadata for UI
export const EMOTIONAL_STATE_CONFIG: Record<EmotionalState, { label: string; color: string }> = {
  hopeful: { label: 'Hopeful', color: '#22c55e' },
  curious: { label: 'Curious', color: '#06b6d4' },
  frustrated: { label: 'Frustrated', color: '#f97316' },
  desperate: { label: 'Desperate', color: '#ef4444' },
  numb: { label: 'Numb', color: '#6b7280' },
  determined: { label: 'Determined', color: '#3b82f6' },
  broken: { label: 'Broken', color: '#881337' },
  calm: { label: 'Calm', color: '#14b8a6' },
  angry: { label: 'Angry', color: '#dc2626' },
  resigned: { label: 'Resigned', color: '#9ca3af' },
};

// Narrative tone metadata for UI
export const NARRATIVE_TONE_CONFIG: Record<NarrativeTone, { label: string; description: string }> = {
  hopeful: { label: 'Hopeful', description: 'Optimistic despite repetition' },
  desperate: { label: 'Desperate', description: 'Panicked desperation' },
  clinical: { label: 'Clinical', description: 'Detached, analytical' },
  melancholic: { label: 'Melancholic', description: 'Mournful reflection' },
  dark_humor: { label: 'Dark Humor', description: 'Sardonic wit' },
  philosophical: { label: 'Philosophical', description: 'Contemplative wisdom' },
  terse: { label: 'Terse', description: 'Minimalist brevity' },
  poetic: { label: 'Poetic', description: 'Lyrical descriptions' },
};
