/**
 * Narrative System Types
 *
 * Types for generating prose from loop data
 */

import { Loop, EquivalenceClass, EmotionalState, OutcomeType } from '../loop/types';

// ============================================
// Tone and Style
// ============================================

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

export interface StyleConfig {
  tone: NarrativeTone;
  detailLevel: DetailLevel;
  perspective: Perspective;
  includeInternalMonologue: boolean;
  includeTimestamps: boolean;
  paragraphStyle: 'short' | 'medium' | 'long';
  emotionalEmphasis: number; // 0-1, how much to emphasize emotional states
}

export const DEFAULT_STYLE: StyleConfig = {
  tone: 'clinical',
  detailLevel: 'standard',
  perspective: 'third_person_limited',
  includeInternalMonologue: false,
  includeTimestamps: false,
  paragraphStyle: 'medium',
  emotionalEmphasis: 0.5,
};

// ============================================
// Template System
// ============================================

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'list' | 'object';
  required: boolean;
  description?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables: TemplateVariable[];
  tags?: string[];
}

export interface TemplateContext {
  loop?: Loop;
  loops?: Loop[];
  equivalenceClass?: EquivalenceClass;
  epoch?: EpochContext;
  graph?: GraphContext;
  style: StyleConfig;
  custom?: Record<string, unknown>;
}

export interface GraphContext {
  id: string;
  name: string;
  nodeLabels: Map<string, string>;
  nodeDescriptions: Map<string, string>;
}

export interface EpochContext {
  id: string;
  name: string;
  description?: string;
  loopCount: number;
  anchorLoops: Loop[];
  dominantTone: NarrativeTone;
}

// ============================================
// Narration Output
// ============================================

export interface NarrationResult {
  success: boolean;
  prose: string;
  wordCount: number;
  paragraphCount: number;
  metadata: {
    templateUsed?: string;
    styleApplied: StyleConfig;
    generatedAt: string;
    inputType: 'loop' | 'equivalence_class' | 'epoch' | 'montage';
  };
  warnings?: string[];
}

export interface LoopNarrationInput {
  loop: Loop;
  style?: Partial<StyleConfig>;
  graphContext?: GraphContext;
  previousLoop?: Loop;
  includeDecisionDetails?: boolean;
  includeOutcomeDetails?: boolean;
}

export interface MontageInput {
  equivalenceClass: EquivalenceClass;
  sampleLoops: Loop[];
  style?: Partial<StyleConfig>;
  graphContext?: GraphContext;
  maxSentences?: number;
}

export interface EpochSummaryInput {
  epoch: EpochContext;
  loops: Loop[];
  equivalenceClasses: EquivalenceClass[];
  style?: Partial<StyleConfig>;
  graphContext?: GraphContext;
  includeStatistics?: boolean;
}

// ============================================
// Prose Fragments
// ============================================

export interface ProseFragment {
  type: 'scene' | 'transition' | 'reflection' | 'dialogue' | 'action' | 'description';
  content: string;
  weight: number; // 0-1, importance for inclusion
  tags: string[];
}

export interface TransitionPhrase {
  from: OutcomeType | EmotionalState;
  to: OutcomeType | EmotionalState;
  phrases: string[];
}

// ============================================
// Vocabulary and Phrasing
// ============================================

export interface VocabularySet {
  id: string;
  tone: NarrativeTone;
  deathVerbs: string[];
  resetVerbs: string[];
  decisionVerbs: string[];
  emotionalAdjectives: Record<EmotionalState, string[]>;
  timeTransitions: string[];
  loopReferences: string[];
  knowledgeVerbs: string[];
}

// Built-in vocabulary sets
export const VOCABULARY: Record<NarrativeTone, VocabularySet> = {
  hopeful: {
    id: 'hopeful',
    tone: 'hopeful',
    deathVerbs: ['fell', 'succumbed', 'was taken'],
    resetVerbs: ['awoke again', 'found a new beginning', 'started fresh'],
    decisionVerbs: ['chose', 'decided', 'selected'],
    emotionalAdjectives: {
      hopeful: ['optimistic', 'encouraged', 'buoyant'],
      curious: ['intrigued', 'fascinated', 'eager'],
      frustrated: ['challenged', 'tested', 'tried'],
      desperate: ['struggling', 'fighting', 'persevering'],
      numb: ['detached', 'distant', 'calm'],
      determined: ['resolute', 'focused', 'driven'],
      broken: ['wounded', 'hurt', 'fragile'],
      calm: ['peaceful', 'serene', 'centered'],
      angry: ['fierce', 'passionate', 'intense'],
      resigned: ['accepting', 'at peace', 'understanding'],
    },
    timeTransitions: ['once more', 'again', 'this time', 'in this iteration'],
    loopReferences: ['cycle', 'day', 'attempt', 'journey'],
    knowledgeVerbs: ['discovered', 'learned', 'uncovered', 'realized'],
  },
  desperate: {
    id: 'desperate',
    tone: 'desperate',
    deathVerbs: ['died', 'perished', 'was killed', 'met their end'],
    resetVerbs: ['snapped back', 'was thrown back', 'woke screaming'],
    decisionVerbs: ['frantically chose', 'desperately tried', 'gambled on'],
    emotionalAdjectives: {
      hopeful: ['clinging to hope', 'barely hopeful', 'tentatively optimistic'],
      curious: ['obsessively curious', 'paranoid', 'suspicious'],
      frustrated: ['maddened', 'enraged', 'at wit\'s end'],
      desperate: ['frantic', 'wild-eyed', 'unhinged'],
      numb: ['hollow', 'dead inside', 'empty'],
      determined: ['grimly determined', 'obsessed', 'single-minded'],
      broken: ['shattered', 'destroyed', 'ruined'],
      calm: ['eerily calm', 'unsettlingly peaceful', 'resigned'],
      angry: ['furious', 'seething', 'volcanic'],
      resigned: ['defeated', 'giving up', 'surrendering'],
    },
    timeTransitions: ['again', 'once more', 'yet again', 'for the hundredth time'],
    loopReferences: ['nightmare', 'prison', 'hell', 'trap'],
    knowledgeVerbs: ['finally understood', 'painfully learned', 'was forced to accept'],
  },
  clinical: {
    id: 'clinical',
    tone: 'clinical',
    deathVerbs: ['died', 'expired', 'terminated', 'ceased'],
    resetVerbs: ['reset', 'restarted', 'reinitiated', 'began again'],
    decisionVerbs: ['selected', 'opted for', 'chose', 'proceeded with'],
    emotionalAdjectives: {
      hopeful: ['positive', 'optimistic', 'encouraged'],
      curious: ['inquisitive', 'investigative', 'analytical'],
      frustrated: ['challenged', 'impeded', 'obstructed'],
      desperate: ['urgent', 'critical', 'pressured'],
      numb: ['neutral', 'unaffected', 'disengaged'],
      determined: ['focused', 'committed', 'resolved'],
      broken: ['compromised', 'impaired', 'damaged'],
      calm: ['stable', 'composed', 'regulated'],
      angry: ['agitated', 'reactive', 'elevated'],
      resigned: ['accepting', 'passive', 'compliant'],
    },
    timeTransitions: ['subsequently', 'following this', 'next', 'at T+'],
    loopReferences: ['iteration', 'cycle', 'instance', 'run'],
    knowledgeVerbs: ['acquired', 'obtained', 'registered', 'noted'],
  },
  melancholic: {
    id: 'melancholic',
    tone: 'melancholic',
    deathVerbs: ['slipped away', 'faded', 'was lost', 'drifted into darkness'],
    resetVerbs: ['returned to the beginning', 'was pulled back', 'found themselves again'],
    decisionVerbs: ['wearily chose', 'turned toward', 'drifted to'],
    emotionalAdjectives: {
      hopeful: ['wistfully hopeful', 'cautiously optimistic', 'barely believing'],
      curious: ['pensively curious', 'quietly wondering', 'contemplative'],
      frustrated: ['weary', 'tired', 'worn'],
      desperate: ['aching', 'yearning', 'longing'],
      numb: ['hollow', 'empty', 'void'],
      determined: ['quietly resolute', 'steadfast', 'unwavering'],
      broken: ['shattered', 'fragmented', 'lost'],
      calm: ['still', 'quiet', 'at rest'],
      angry: ['bitter', 'resentful', 'wounded'],
      resigned: ['accepting', 'at peace', 'letting go'],
    },
    timeTransitions: ['once more', 'as always', 'as before', 'like every time'],
    loopReferences: ['day', 'memory', 'echo', 'shadow'],
    knowledgeVerbs: ['came to understand', 'quietly realized', 'accepted'],
  },
  dark_humor: {
    id: 'dark_humor',
    tone: 'dark_humor',
    deathVerbs: ['bit the dust', 'bought the farm', 'kicked the bucket', 'checked out'],
    resetVerbs: ['respawned', 'got another shot', 'was back at it'],
    decisionVerbs: ['figured why not', 'went with', 'rolled the dice on'],
    emotionalAdjectives: {
      hopeful: ['naively optimistic', 'adorably hopeful', 'bless their heart'],
      curious: ['nosy', 'snooping', 'poking around'],
      frustrated: ['fed up', 'over it', 'done'],
      desperate: ['at rock bottom', 'scraping the barrel', 'throwing spaghetti'],
      numb: ['checked out', 'on autopilot', 'lights on nobody home'],
      determined: ['stupidly stubborn', 'pigheaded', 'relentless'],
      broken: ['a hot mess', 'falling apart', 'held together by spite'],
      calm: ['suspiciously calm', 'zen master', 'too chill'],
      angry: ['absolutely livid', 'about to flip tables', 'seeing red'],
      resigned: ['whatever', 'sure why not', 'fine'],
    },
    timeTransitions: ['surprise surprise', 'would you look at that', 'here we go again'],
    loopReferences: ['groundhog day', 'rerun', 'same old same old', 'déjà vu'],
    knowledgeVerbs: ['figured out', 'finally got', 'had the lightbulb moment'],
  },
  philosophical: {
    id: 'philosophical',
    tone: 'philosophical',
    deathVerbs: ['transcended', 'passed beyond', 'completed the cycle'],
    resetVerbs: ['returned to origin', 'began anew', 'was reborn'],
    decisionVerbs: ['contemplated and chose', 'weighed and selected', 'considered'],
    emotionalAdjectives: {
      hopeful: ['transcendently hopeful', 'spiritually optimistic', 'believing'],
      curious: ['seeking', 'questioning', 'wondering'],
      frustrated: ['tested', 'challenged', 'confronted'],
      desperate: ['at the edge', 'facing the void', 'confronting mortality'],
      numb: ['beyond feeling', 'detached', 'observing'],
      determined: ['purposeful', 'driven by meaning', 'committed'],
      broken: ['transformed through suffering', 'refined', 'stripped bare'],
      calm: ['at peace', 'centered', 'present'],
      angry: ['burning with righteous fire', 'awakened', 'alive'],
      resigned: ['accepting', 'understanding', 'at one with'],
    },
    timeTransitions: ['in this eternal moment', 'once again', 'in the cycle'],
    loopReferences: ['eternal return', 'wheel of time', 'ouroboros', 'cycle'],
    knowledgeVerbs: ['came to wisdom', 'understood deeply', 'grasped the truth'],
  },
  terse: {
    id: 'terse',
    tone: 'terse',
    deathVerbs: ['died', 'fell', 'ended'],
    resetVerbs: ['reset', 'woke', 'started'],
    decisionVerbs: ['chose', 'went', 'took'],
    emotionalAdjectives: {
      hopeful: ['hopeful'],
      curious: ['curious'],
      frustrated: ['frustrated'],
      desperate: ['desperate'],
      numb: ['numb'],
      determined: ['determined'],
      broken: ['broken'],
      calm: ['calm'],
      angry: ['angry'],
      resigned: ['resigned'],
    },
    timeTransitions: ['again', 'then', 'next'],
    loopReferences: ['loop', 'day', 'run'],
    knowledgeVerbs: ['learned', 'knew', 'found'],
  },
  poetic: {
    id: 'poetic',
    tone: 'poetic',
    deathVerbs: ['dissolved into starlight', 'became silence', 'returned to the void'],
    resetVerbs: ['bloomed again at dawn', 'emerged from the chrysalis of night', 'was reborn'],
    decisionVerbs: ['turned their heart toward', 'let their feet carry them to', 'surrendered to'],
    emotionalAdjectives: {
      hopeful: ['luminous with hope', 'dawn-touched', 'star-blessed'],
      curious: ['wonder-drunk', 'seeking', 'hungry for mysteries'],
      frustrated: ['storm-tossed', 'thorned', 'tangled'],
      desperate: ['drowning', 'grasping at shadows', 'hollow-eyed'],
      numb: ['frozen', 'stone-still', 'winter-quiet'],
      determined: ['iron-willed', 'flame-bright', 'mountain-steady'],
      broken: ['shattered like glass', 'scattered petals', 'ash'],
      calm: ['lake-still', 'evening-gentle', 'dusk-soft'],
      angry: ['thunder-voiced', 'fire-tongued', 'storm-born'],
      resigned: ['autumn-weary', 'tide-accepting', 'sunset-soft'],
    },
    timeTransitions: ['once more the wheel turned', 'again the dance began', 'the song repeated'],
    loopReferences: ['dance', 'song', 'dream', 'tide'],
    knowledgeVerbs: ['the truth blossomed', 'understanding dawned', 'clarity crystallized'],
  },
};
