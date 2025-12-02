/**
 * Loop-related type definitions matching the JSON schemas
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Emotional States
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

// ============================================
// Operators
// ============================================

export type OperatorType =
  | 'explore'
  | 'cause'
  | 'avoid'
  | 'trigger'
  | 'relive'
  | 'vary'
  | 'chaos';

// ============================================
// Loop Status
// ============================================

export type LoopStatus = 'in_progress' | 'completed' | 'aborted';

// ============================================
// Outcome Types
// ============================================

export type OutcomeType =
  | 'death'
  | 'reset_trigger'
  | 'day_end'
  | 'voluntary_reset'
  | 'sub_loop_exit'
  | 'success'
  | 'failure'
  | 'partial';

export type CharacterState =
  | 'alive'
  | 'dead'
  | 'injured'
  | 'escaped'
  | 'captured'
  | 'unknown';

// ============================================
// Decision
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

// ============================================
// Outcome
// ============================================

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
// Sub-Loop
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
// Equivalence Class
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
// Query Types
// ============================================

export interface LoopQuery {
  epoch_id?: string;
  status?: LoopStatus;
  outcome_type?: OutcomeType;
  tags?: string[];
  tags_match?: 'all' | 'any';
  operator_used?: OperatorType;
  is_anchor?: boolean;
  equivalence_class_id?: string;
  parent_id?: string;
  sequence_range?: { min?: number; max?: number };
  time_range?: { start?: string; end?: string };
  limit?: number;
  offset?: number;
}

export interface LoopQueryResult {
  loops: Loop[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Factory Input Types
// ============================================

export interface CreateLoopInput {
  epoch_id: string;
  graph_id: string;
  knowledge_state_start_id: string;
  emotional_state_start: EmotionalState;
  parent_id?: string;
  operator_used?: OperatorType;
  operator_target?: string;
  is_anchor?: boolean;
  tags?: string[];
  notes?: string;
}

export interface CreateDecisionInput {
  node_id: string;
  choice_index: number;
  choice_label?: string;
  timestamp: string;
  confidence?: number;
  rationale?: string;
  influenced_by?: string[];
}

export interface CreateOutcomeInput {
  type: OutcomeType;
  terminal_node_id: string;
  timestamp: string;
  cause?: string;
  world_state_delta?: Record<string, string | number | boolean | null>;
  characters_affected?: CharacterAffected[];
}

// ============================================
// Helpers
// ============================================

export function generateId(): string {
  return uuidv4();
}

export function nowISO(): string {
  return new Date().toISOString();
}
