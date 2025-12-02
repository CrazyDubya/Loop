// Narrative System Exports

export {
  NarrativeTone,
  DetailLevel,
  Perspective,
  StyleConfig,
  DEFAULT_STYLE,
  TemplateVariable,
  TemplateDefinition,
  TemplateContext,
  GraphContext,
  EpochContext,
  NarrationResult,
  LoopNarrationInput,
  MontageInput,
  EpochSummaryInput,
  ProseFragment,
  TransitionPhrase,
  VocabularySet,
  VOCABULARY,
} from './types';

export {
  TemplateEngine,
  RenderResult,
  createTemplateEngine,
  BUILT_IN_TEMPLATES,
} from './TemplateEngine';

export {
  LoopNarrator,
  narrateLoop,
  summarizeLoop,
} from './LoopNarrator';

export {
  MontageGenerator,
  generateMontage,
  briefMontage,
} from './MontageGenerator';

export {
  EpochSummarizer,
  EpochStatistics,
  summarizeEpoch,
  briefEpochSummary,
} from './EpochSummarizer';
