/**
 * EpochSummarizer - Generates chapter-level summaries for epochs
 *
 * An epoch represents a phase of the looper's journey, containing
 * many loops with a coherent theme or goal.
 */

import { Loop, EquivalenceClass, OutcomeType, EmotionalState } from '../loop/types';
import {
  NarrationResult,
  EpochSummaryInput,
  EpochContext,
  StyleConfig,
  GraphContext,
  DEFAULT_STYLE,
  VOCABULARY,
  VocabularySet,
  NarrativeTone,
} from './types';
import { MontageGenerator } from './MontageGenerator';

export interface EpochStatistics {
  totalLoops: number;
  completedLoops: number;
  deathCount: number;
  resetCount: number;
  successCount: number;
  uniqueOutcomes: number;
  averageDecisions: number;
  mostCommonOutcome: string;
  emotionalJourney: { start: EmotionalState; end: EmotionalState }[];
  anchorLoopCount: number;
  equivalenceClassCount: number;
}

export class EpochSummarizer {
  private style: StyleConfig;
  private montageGenerator: MontageGenerator;

  constructor(style: Partial<StyleConfig> = {}) {
    this.style = { ...DEFAULT_STYLE, ...style };
    this.montageGenerator = new MontageGenerator(style);
  }

  /**
   * Generate a comprehensive epoch summary
   */
  summarize(input: EpochSummaryInput): NarrationResult {
    const style = { ...this.style, ...input.style };
    const vocab = VOCABULARY[style.tone];

    try {
      const { epoch, loops, equivalenceClasses } = input;
      const stats = this.computeStatistics(loops, equivalenceClasses);

      const sections: string[] = [];

      // Title/Header
      sections.push(this.generateTitle(epoch, vocab, style));

      // Opening paragraph - sets the scene
      sections.push(this.generateOpening(epoch, stats, vocab, style));

      // Statistics section (if requested)
      if (input.includeStatistics) {
        sections.push(this.generateStatisticsSection(stats, vocab, style));
      }

      // Anchor loops section - the important moments
      if (stats.anchorLoopCount > 0) {
        const anchorSection = this.generateAnchorSection(loops, vocab, style);
        if (anchorSection) {
          sections.push(anchorSection);
        }
      }

      // Montages for major equivalence classes
      if (equivalenceClasses.length > 0 && style.detailLevel !== 'minimal') {
        const montageSection = this.generateMontageSection(
          equivalenceClasses,
          loops,
          input.graphContext,
          vocab,
          style
        );
        if (montageSection) {
          sections.push(montageSection);
        }
      }

      // Emotional journey
      if (style.emotionalEmphasis > 0.3) {
        sections.push(this.generateEmotionalJourney(stats, vocab, style));
      }

      // Closing - transition or reflection
      sections.push(this.generateClosing(epoch, stats, vocab, style));

      const prose = sections.filter(s => s.length > 0).join('\n\n');

      return {
        success: true,
        prose,
        wordCount: prose.split(/\s+/).length,
        paragraphCount: prose.split(/\n\n+/).length,
        metadata: {
          styleApplied: style,
          generatedAt: new Date().toISOString(),
          inputType: 'epoch',
        },
      };
    } catch (err) {
      return {
        success: false,
        prose: '',
        wordCount: 0,
        paragraphCount: 0,
        metadata: {
          styleApplied: style,
          generatedAt: new Date().toISOString(),
          inputType: 'epoch',
        },
        warnings: [`Epoch summary failed: ${err}`],
      };
    }
  }

  /**
   * Generate a brief one-paragraph summary
   */
  brief(epoch: EpochContext, loops: Loop[]): string {
    const vocab = VOCABULARY[this.style.tone];
    const stats = this.computeStatistics(loops, []);
    const loopRef = this.pickRandom(vocab.loopReferences);

    return `${epoch.name}: ${stats.totalLoops} ${loopRef}s, ${stats.deathCount} deaths, ${stats.uniqueOutcomes} unique outcomes. ${stats.anchorLoopCount} anchor moment${stats.anchorLoopCount !== 1 ? 's' : ''}.`;
  }

  // ============================================
  // Section Generators
  // ============================================

  private generateTitle(
    epoch: EpochContext,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    if (style.detailLevel === 'minimal') {
      return `## ${epoch.name}`;
    }

    return `## ${epoch.name}\n\n*${epoch.description || 'A phase of the journey.'}*`;
  }

  private generateOpening(
    epoch: EpochContext,
    stats: EpochStatistics,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    const loopRef = this.pickRandom(vocab.loopReferences);

    switch (style.perspective) {
      case 'first_person':
        if (stats.totalLoops === 1) {
          return `This was a single ${loopRef}. Just one attempt.`;
        } else if (stats.totalLoops < 10) {
          return `This phase lasted ${stats.totalLoops} ${loopRef}s. A brief chapter.`;
        } else if (stats.totalLoops < 50) {
          return `${stats.totalLoops} ${loopRef}s. That's how long this chapter lasted.`;
        } else {
          return `${stats.totalLoops} ${loopRef}s. I lost count of the days that blurred together in this endless phase.`;
        }

      case 'second_person':
        return `You spend ${stats.totalLoops} ${loopRef}s in this phase.`;

      default:
        if (stats.totalLoops === 1) {
          return `This epoch contained a single ${loopRef}.`;
        } else if (stats.totalLoops < 10) {
          return `This epoch spanned ${stats.totalLoops} ${loopRef}s.`;
        } else if (stats.totalLoops < 50) {
          return `Through ${stats.totalLoops} ${loopRef}s, the story of this epoch unfolded.`;
        } else {
          return `${stats.totalLoops} ${loopRef}s defined this epoch, each one adding to the weight of experience.`;
        }
    }
  }

  private generateStatisticsSection(
    stats: EpochStatistics,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    const lines: string[] = [];

    lines.push('**Statistics:**');
    lines.push(`- Total loops: ${stats.totalLoops}`);

    if (stats.deathCount > 0) {
      const deathPct = Math.round((stats.deathCount / stats.totalLoops) * 100);
      lines.push(`- Deaths: ${stats.deathCount} (${deathPct}%)`);
    }

    if (stats.resetCount > 0) {
      lines.push(`- Resets: ${stats.resetCount}`);
    }

    if (stats.successCount > 0) {
      lines.push(`- Successes: ${stats.successCount}`);
    }

    lines.push(`- Unique outcomes: ${stats.uniqueOutcomes}`);
    lines.push(`- Average decisions per loop: ${stats.averageDecisions.toFixed(1)}`);

    if (stats.equivalenceClassCount > 0) {
      lines.push(`- Pattern classes: ${stats.equivalenceClassCount}`);
    }

    return lines.join('\n');
  }

  private generateAnchorSection(
    loops: Loop[],
    vocab: VocabularySet,
    style: StyleConfig
  ): string | null {
    const anchors = loops.filter(l => l.is_anchor);
    if (anchors.length === 0) return null;

    const lines: string[] = [];
    lines.push('**Anchor Moments:**');

    for (const anchor of anchors.slice(0, 5)) {
      const outcomeDesc = anchor.outcome.cause || anchor.outcome.type;
      lines.push(`- Loop ${anchor.sequence_number}: ${outcomeDesc}`);
    }

    if (anchors.length > 5) {
      lines.push(`- ... and ${anchors.length - 5} more significant moments.`);
    }

    return lines.join('\n');
  }

  private generateMontageSection(
    equivalenceClasses: EquivalenceClass[],
    loops: Loop[],
    graphContext: GraphContext | undefined,
    vocab: VocabularySet,
    style: StyleConfig
  ): string | null {
    // Sort by member count descending
    const sorted = [...equivalenceClasses].sort((a, b) => b.member_count - a.member_count);

    // Take top 3 classes
    const topClasses = sorted.slice(0, 3);

    if (topClasses.length === 0) return null;

    const lines: string[] = [];
    lines.push('**Recurring Patterns:**');

    for (const ec of topClasses) {
      lines.push('');
      lines.push(this.montageGenerator.brief(ec));
    }

    return lines.join('\n');
  }

  private generateEmotionalJourney(
    stats: EpochStatistics,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    if (stats.emotionalJourney.length === 0) {
      return '';
    }

    // Analyze emotional trajectory
    const startEmotions = stats.emotionalJourney.map(e => e.start);
    const endEmotions = stats.emotionalJourney.map(e => e.end);

    const mostCommonStart = this.mode(startEmotions);
    const mostCommonEnd = this.mode(endEmotions);

    const startAdj = vocab.emotionalAdjectives[mostCommonStart]?.[0] || mostCommonStart;
    const endAdj = vocab.emotionalAdjectives[mostCommonEnd]?.[0] || mostCommonEnd;

    if (mostCommonStart === mostCommonEnd) {
      switch (style.perspective) {
        case 'first_person':
          return `Throughout this epoch, I remained ${startAdj}. The feeling never changed.`;
        case 'second_person':
          return `Throughout this epoch, you remain ${startAdj}.`;
        default:
          return `Throughout this epoch, they remained ${startAdj}.`;
      }
    }

    switch (style.perspective) {
      case 'first_person':
        return `I entered this epoch ${startAdj}. I left it ${endAdj}.`;
      case 'second_person':
        return `You enter ${startAdj}. You leave ${endAdj}.`;
      default:
        return `They entered ${startAdj} and left ${endAdj}.`;
    }
  }

  private generateClosing(
    epoch: EpochContext,
    stats: EpochStatistics,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    const loopRef = this.pickRandom(vocab.loopReferences);

    switch (style.tone) {
      case 'desperate':
        if (stats.deathCount > stats.totalLoops * 0.8) {
          return `Nothing but death. ${stats.deathCount} times over.`;
        }
        return `Another chapter. Another mountain of failed attempts.`;

      case 'philosophical':
        return `And so this epoch passed into memory, its lessons absorbed into the spiral of experience.`;

      case 'dark_humor':
        return `At least the next epoch couldn't be worse. Right?`;

      case 'melancholic':
        return `The epoch faded, leaving only echoes.`;

      case 'hopeful':
        if (stats.successCount > 0) {
          return `Progress was made. ${stats.successCount} success${stats.successCount !== 1 ? 'es' : ''} to build upon.`;
        }
        return `Despite the setbacks, each ${loopRef} brought new understanding.`;

      case 'clinical':
      default:
        return `End of epoch. Loops processed: ${stats.totalLoops}. Status: Complete.`;
    }
  }

  // ============================================
  // Statistics Computation
  // ============================================

  private computeStatistics(loops: Loop[], equivalenceClasses: EquivalenceClass[]): EpochStatistics {
    let deathCount = 0;
    let resetCount = 0;
    let successCount = 0;
    let totalDecisions = 0;
    let anchorCount = 0;
    const outcomes = new Set<string>();
    const emotionalJourney: { start: EmotionalState; end: EmotionalState }[] = [];

    for (const loop of loops) {
      if (loop.status === 'completed') {
        const outcomeType = loop.outcome.type;
        outcomes.add(outcomeType);

        if (outcomeType === 'death') deathCount++;
        else if (outcomeType === 'reset_trigger' || outcomeType === 'day_end') resetCount++;
        else if (outcomeType === 'success') successCount++;
      }

      totalDecisions += loop.decisions.length;

      if (loop.is_anchor) anchorCount++;

      if (loop.emotional_state_end) {
        emotionalJourney.push({
          start: loop.emotional_state_start,
          end: loop.emotional_state_end,
        });
      }
    }

    const completedLoops = loops.filter(l => l.status === 'completed').length;

    // Find most common outcome
    const outcomeCounts = new Map<string, number>();
    for (const loop of loops) {
      if (loop.status === 'completed') {
        const type = loop.outcome.type;
        outcomeCounts.set(type, (outcomeCounts.get(type) || 0) + 1);
      }
    }

    let mostCommonOutcome = 'none';
    let maxCount = 0;
    for (const [outcome, count] of outcomeCounts) {
      if (count > maxCount) {
        mostCommonOutcome = outcome;
        maxCount = count;
      }
    }

    return {
      totalLoops: loops.length,
      completedLoops,
      deathCount,
      resetCount,
      successCount,
      uniqueOutcomes: outcomes.size,
      averageDecisions: loops.length > 0 ? totalDecisions / loops.length : 0,
      mostCommonOutcome,
      emotionalJourney,
      anchorLoopCount: anchorCount,
      equivalenceClassCount: equivalenceClasses.length,
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private mode<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxItem = arr[0];
    let maxCount = 0;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxItem = item;
        maxCount = count;
      }
    }

    return maxItem;
  }
}

/**
 * Generate an epoch summary
 */
export function summarizeEpoch(input: EpochSummaryInput): NarrationResult {
  const summarizer = new EpochSummarizer(input.style);
  return summarizer.summarize(input);
}

/**
 * Generate a brief epoch summary
 */
export function briefEpochSummary(
  epoch: EpochContext,
  loops: Loop[],
  style?: Partial<StyleConfig>
): string {
  const summarizer = new EpochSummarizer(style);
  return summarizer.brief(epoch, loops);
}
