/**
 * MontageGenerator - Generates prose summaries for equivalence classes
 *
 * A "montage" summarizes many similar loops that ended the same way,
 * conveying the repetition and emotional weight of repeated attempts.
 */

import { Loop, EquivalenceClass } from '../loop/types';
import {
  NarrationResult,
  MontageInput,
  StyleConfig,
  GraphContext,
  DEFAULT_STYLE,
  VOCABULARY,
  VocabularySet,
} from './types';

export class MontageGenerator {
  private style: StyleConfig;

  constructor(style: Partial<StyleConfig> = {}) {
    this.style = { ...DEFAULT_STYLE, ...style };
  }

  /**
   * Generate a montage for an equivalence class
   */
  generate(input: MontageInput): NarrationResult {
    const style = { ...this.style, ...input.style };
    const vocab = VOCABULARY[style.tone];

    try {
      const ec = input.equivalenceClass;
      const loops = input.sampleLoops;
      const maxSentences = input.maxSentences ?? 5;

      const sentences: string[] = [];

      // Opening: establish the pattern
      sentences.push(this.generateOpening(ec, loops, vocab, style));

      // Describe the common path/decisions if detectable
      if (loops.length > 0 && style.detailLevel !== 'minimal') {
        const pathSentence = this.generateCommonPath(loops, input.graphContext, vocab, style);
        if (pathSentence) {
          sentences.push(pathSentence);
        }
      }

      // Describe variations
      if (loops.length > 1 && style.detailLevel !== 'minimal') {
        const variationSentence = this.generateVariations(loops, vocab, style);
        if (variationSentence) {
          sentences.push(variationSentence);
        }
      }

      // Emotional arc
      if (style.emotionalEmphasis > 0.3) {
        sentences.push(this.generateEmotionalSummary(loops, vocab, style));
      }

      // Closing: what was learned or conveyed
      sentences.push(this.generateClosing(ec, vocab, style));

      // Limit to max sentences
      const finalSentences = sentences.slice(0, maxSentences);
      const prose = this.formatProse(finalSentences, style);

      return {
        success: true,
        prose,
        wordCount: prose.split(/\s+/).length,
        paragraphCount: prose.split(/\n\n+/).length,
        metadata: {
          styleApplied: style,
          generatedAt: new Date().toISOString(),
          inputType: 'montage',
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
          inputType: 'montage',
        },
        warnings: [`Montage generation failed: ${err}`],
      };
    }
  }

  /**
   * Generate a very brief montage (one sentence)
   */
  brief(ec: EquivalenceClass): string {
    const vocab = VOCABULARY[this.style.tone];
    const loopRef = this.pickRandom(vocab.loopReferences);

    if (ec.member_count === 1) {
      return `One ${loopRef} ended in ${ec.outcome_summary}.`;
    }

    return `${ec.member_count} ${loopRef}s ended the same way: ${ec.outcome_summary}.`;
  }

  // ============================================
  // Sentence Generators
  // ============================================

  private generateOpening(
    ec: EquivalenceClass,
    loops: Loop[],
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    const count = ec.member_count;
    const loopRef = this.pickRandom(vocab.loopReferences);
    const timeTransition = this.pickRandom(vocab.timeTransitions);

    switch (style.perspective) {
      case 'first_person':
        if (count === 1) {
          return `There was one ${loopRef} where this happened.`;
        } else if (count < 5) {
          return `${count} times, ${timeTransition}, I found myself walking the same path.`;
        } else if (count < 20) {
          return `${count} ${loopRef}s. ${count} times I walked this same path to the same end.`;
        } else {
          return `Dozens of ${loopRef}s blur together now. ${count} times I relived the same ending.`;
        }

      case 'second_person':
        if (count === 1) {
          return `There is one ${loopRef} where this happens.`;
        } else if (count < 5) {
          return `${count} times you find yourself here, facing the same end.`;
        } else {
          return `${count} ${loopRef}s, all ending the same way.`;
        }

      case 'third_person':
      case 'third_person_limited':
      default:
        if (count === 1) {
          return `There was one ${loopRef} where this occurred.`;
        } else if (count < 5) {
          return `${count} times they walked this path, ${timeTransition}.`;
        } else if (count < 20) {
          return `${count} ${loopRef}s led to the same destination.`;
        } else {
          return `In ${count} ${loopRef}s, the outcome never changed.`;
        }
    }
  }

  private generateCommonPath(
    loops: Loop[],
    graphContext: GraphContext | undefined,
    vocab: VocabularySet,
    style: StyleConfig
  ): string | null {
    // Find common path elements
    const pathSets = loops
      .filter(l => l.path && l.path.length > 0)
      .map(l => new Set(l.path!));

    if (pathSets.length === 0) return null;

    // Find intersection
    const common = pathSets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    }, pathSets[0]);

    const commonNodes = Array.from(common);
    if (commonNodes.length < 2) return null;

    // Get labels for first few common nodes
    const labels = commonNodes
      .slice(0, 3)
      .map(id => this.getNodeLabel(id, graphContext));

    switch (style.perspective) {
      case 'first_person':
        return `Each time, I passed through ${labels.join(', then ')}.`;
      case 'second_person':
        return `Each time, you pass through ${labels.join(', then ')}.`;
      default:
        return `Each time, they passed through ${labels.join(', then ')}.`;
    }
  }

  private generateVariations(
    loops: Loop[],
    vocab: VocabularySet,
    style: StyleConfig
  ): string | null {
    // Count unique decision vectors
    const vectors = new Set(loops.map(l => JSON.stringify(l.decision_vector)));
    const uniqueVectors = vectors.size;

    if (uniqueVectors <= 1) {
      return null; // No variation worth mentioning
    }

    const loopRef = this.pickRandom(vocab.loopReferences);

    switch (style.perspective) {
      case 'first_person':
        if (uniqueVectors === 2) {
          return `I tried two different approaches, but both led here.`;
        } else {
          return `I tried ${uniqueVectors} different approaches. They all ended the same.`;
        }

      case 'second_person':
        if (uniqueVectors === 2) {
          return `Two different approaches, but both lead here.`;
        } else {
          return `${uniqueVectors} different choices, all the same result.`;
        }

      default:
        if (uniqueVectors === 2) {
          return `Two different paths led to the same end.`;
        } else {
          return `${uniqueVectors} variations of the ${loopRef} all reached the same conclusion.`;
        }
    }
  }

  private generateEmotionalSummary(
    loops: Loop[],
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    // Count emotional transitions
    const transitions = new Map<string, number>();

    for (const loop of loops) {
      const key = `${loop.emotional_state_start}->${loop.emotional_state_end || loop.emotional_state_start}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
    }

    // Find most common transition
    let maxTransition = '';
    let maxCount = 0;
    for (const [transition, count] of transitions) {
      if (count > maxCount) {
        maxTransition = transition;
        maxCount = count;
      }
    }

    const [startEmotion, endEmotion] = maxTransition.split('->');

    if (startEmotion === endEmotion) {
      const adj = vocab.emotionalAdjectives[startEmotion as keyof typeof vocab.emotionalAdjectives]?.[0] || startEmotion;
      switch (style.perspective) {
        case 'first_person':
          return `Through all of them, I remained ${adj}.`;
        case 'second_person':
          return `Through all of them, you remain ${adj}.`;
        default:
          return `Through all of them, they remained ${adj}.`;
      }
    }

    const startAdj = vocab.emotionalAdjectives[startEmotion as keyof typeof vocab.emotionalAdjectives]?.[0] || startEmotion;
    const endAdj = vocab.emotionalAdjectives[endEmotion as keyof typeof vocab.emotionalAdjectives]?.[0] || endEmotion;

    switch (style.perspective) {
      case 'first_person':
        return `Each time I started ${startAdj} and ended ${endAdj}.`;
      case 'second_person':
        return `Each time you start ${startAdj} and end ${endAdj}.`;
      default:
        return `Each time they started ${startAdj} and ended ${endAdj}.`;
    }
  }

  private generateClosing(
    ec: EquivalenceClass,
    vocab: VocabularySet,
    style: StyleConfig
  ): string {
    const outcomeType = this.extractOutcomeType(ec.outcome_summary);
    const loopRef = this.pickRandom(vocab.loopReferences);

    switch (style.tone) {
      case 'desperate':
        switch (style.perspective) {
          case 'first_person':
            return `${ec.member_count} times. ${ec.member_count} failures.`;
          default:
            return `${ec.member_count} ${loopRef}s. ${ec.member_count} failures.`;
        }

      case 'philosophical':
        return `Perhaps there is meaning in the repetition itself.`;

      case 'dark_humor':
        return `At least the ending was consistent.`;

      case 'melancholic':
        return `And so it was, ${ec.member_count} times over.`;

      case 'clinical':
      default:
        return `Outcome: ${ec.outcome_summary}. Occurrences: ${ec.member_count}.`;
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private formatProse(sentences: string[], style: StyleConfig): string {
    if (style.paragraphStyle === 'short') {
      // Each sentence is its own paragraph
      return sentences.join('\n\n');
    } else if (style.paragraphStyle === 'medium') {
      // Group 2-3 sentences per paragraph
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(sentences.slice(i, i + 2).join(' '));
      }
      return paragraphs.join('\n\n');
    } else {
      // All in one paragraph
      return sentences.join(' ');
    }
  }

  private getNodeLabel(nodeId: string, graphContext?: GraphContext): string {
    if (graphContext?.nodeLabels.has(nodeId)) {
      return graphContext.nodeLabels.get(nodeId)!;
    }
    return nodeId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private extractOutcomeType(summary: string): string {
    // Extract outcome type from summary like "death: explosion at vault"
    const match = summary.match(/^(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

/**
 * Generate a montage for an equivalence class
 */
export function generateMontage(
  ec: EquivalenceClass,
  sampleLoops: Loop[],
  style?: Partial<StyleConfig>
): NarrationResult {
  const generator = new MontageGenerator(style);
  return generator.generate({ equivalenceClass: ec, sampleLoops, style });
}

/**
 * Generate a brief one-sentence montage
 */
export function briefMontage(ec: EquivalenceClass, style?: Partial<StyleConfig>): string {
  const generator = new MontageGenerator(style);
  return generator.brief(ec);
}
