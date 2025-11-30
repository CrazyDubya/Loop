/**
 * LoopNarrator - Generates narrative prose for a single loop
 *
 * Converts loop data into readable prose with configurable style and detail.
 */

import { Loop, Decision, EmotionalState, OutcomeType } from '../loop/types';
import {
  NarrationResult,
  LoopNarrationInput,
  StyleConfig,
  GraphContext,
  DEFAULT_STYLE,
  VOCABULARY,
  VocabularySet,
  ProseFragment,
} from './types';

export class LoopNarrator {
  private vocabulary: VocabularySet;
  private style: StyleConfig;
  private graphContext?: GraphContext;

  constructor(style: Partial<StyleConfig> = {}) {
    this.style = { ...DEFAULT_STYLE, ...style };
    this.vocabulary = VOCABULARY[this.style.tone];
  }

  /**
   * Generate narrative prose for a loop
   */
  narrate(input: LoopNarrationInput): NarrationResult {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Merge styles
    const style = { ...this.style, ...input.style };
    const vocab = VOCABULARY[style.tone];

    this.graphContext = input.graphContext;

    try {
      const fragments: ProseFragment[] = [];

      // Opening - establishes the loop and emotional state
      fragments.push(this.generateOpening(input.loop, vocab, style));

      // Path narrative - what happened during the loop
      if (input.includeDecisionDetails !== false && input.loop.decisions.length > 0) {
        fragments.push(...this.generateDecisionNarrative(input.loop, vocab, style));
      }

      // Path description if available
      if (input.loop.path && input.loop.path.length > 0) {
        fragments.push(...this.generatePathNarrative(input.loop, vocab, style));
      }

      // Outcome - how it ended
      fragments.push(this.generateOutcome(input.loop, vocab, style));

      // Closing - reflection or transition
      if (style.includeInternalMonologue) {
        fragments.push(this.generateReflection(input.loop, vocab, style));
      }

      // Compose final prose
      const prose = this.composeProse(fragments, style);

      return {
        success: true,
        prose,
        wordCount: prose.split(/\s+/).length,
        paragraphCount: prose.split(/\n\n+/).length,
        metadata: {
          styleApplied: style,
          generatedAt: new Date().toISOString(),
          inputType: 'loop',
        },
        warnings: warnings.length > 0 ? warnings : undefined,
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
          inputType: 'loop',
        },
        warnings: [`Narration failed: ${err}`],
      };
    }
  }

  /**
   * Generate a brief one-line summary
   */
  summarize(loop: Loop): string {
    const vocab = this.vocabulary;
    const outcomeVerb = this.getOutcomeVerb(loop.outcome.type, vocab);
    const emotionAdj = vocab.emotionalAdjectives[loop.emotional_state_start]?.[0] || loop.emotional_state_start;

    return `Loop ${loop.sequence_number}: Started ${emotionAdj}, ${outcomeVerb} at ${loop.outcome.terminal_node_id}.`;
  }

  // ============================================
  // Fragment Generators
  // ============================================

  private generateOpening(
    loop: Loop,
    vocab: VocabularySet,
    style: StyleConfig
  ): ProseFragment {
    const emotion = loop.emotional_state_start;
    const emotionAdj = this.pickRandom(vocab.emotionalAdjectives[emotion]) || emotion;
    const loopRef = this.pickRandom(vocab.loopReferences);
    const sequence = loop.sequence_number;

    let content: string;

    switch (style.perspective) {
      case 'first_person':
        if (sequence === 1) {
          content = `I woke up. Everything felt ${emotionAdj}.`;
        } else {
          content = `${this.capitalize(this.pickRandom(vocab.timeTransitions))}, I woke up. This was ${loopRef} number ${sequence}. I felt ${emotionAdj}.`;
        }
        break;

      case 'second_person':
        content = `You wake up, feeling ${emotionAdj}. This is your ${this.ordinal(sequence)} ${loopRef}.`;
        break;

      case 'third_person':
      case 'third_person_limited':
      default:
        if (sequence === 1) {
          content = `The day began. They felt ${emotionAdj}.`;
        } else {
          content = `${this.capitalize(this.pickRandom(vocab.timeTransitions))}, the ${loopRef} began. They felt ${emotionAdj}.`;
        }
    }

    if (style.includeTimestamps && loop.started_at) {
      content += ` [${this.formatTime(loop.started_at)}]`;
    }

    return { type: 'scene', content, weight: 1.0, tags: ['opening', 'emotional'] };
  }

  private generateDecisionNarrative(
    loop: Loop,
    vocab: VocabularySet,
    style: StyleConfig
  ): ProseFragment[] {
    const fragments: ProseFragment[] = [];

    for (let i = 0; i < loop.decisions.length; i++) {
      const decision = loop.decisions[i];
      const isFirst = i === 0;
      const isLast = i === loop.decisions.length - 1;

      const fragment = this.narrateDecision(decision, vocab, style, isFirst, isLast);
      fragments.push(fragment);
    }

    return fragments;
  }

  private narrateDecision(
    decision: Decision,
    vocab: VocabularySet,
    style: StyleConfig,
    isFirst: boolean,
    isLast: boolean
  ): ProseFragment {
    const verb = this.pickRandom(vocab.decisionVerbs);
    const nodeName = this.getNodeLabel(decision.node_id);
    const choiceDesc = decision.choice_label || `option ${decision.choice_index}`;

    let content: string;

    switch (style.perspective) {
      case 'first_person':
        content = isFirst
          ? `At ${nodeName}, I ${verb} ${choiceDesc}.`
          : `Then, at ${nodeName}, I ${verb} ${choiceDesc}.`;
        break;

      case 'second_person':
        content = `At ${nodeName}, you ${verb.replace(/chose|decided|selected/, 'choose')} ${choiceDesc}.`;
        break;

      case 'third_person':
      case 'third_person_limited':
      default:
        content = isFirst
          ? `At ${nodeName}, they ${verb} ${choiceDesc}.`
          : `Then, at ${nodeName}, they ${verb} ${choiceDesc}.`;
    }

    if (decision.rationale && style.includeInternalMonologue) {
      content += ` (${decision.rationale})`;
    }

    if (style.includeTimestamps && decision.timestamp) {
      content += ` [${this.formatTime(decision.timestamp)}]`;
    }

    return {
      type: 'action',
      content,
      weight: isLast ? 0.9 : 0.7,
      tags: ['decision', decision.node_id],
    };
  }

  private generatePathNarrative(
    loop: Loop,
    vocab: VocabularySet,
    style: StyleConfig
  ): ProseFragment[] {
    const fragments: ProseFragment[] = [];

    if (!loop.path || loop.path.length < 2) return fragments;

    // Skip nodes that are already covered by decisions
    const decisionNodes = new Set(loop.decisions.map(d => d.node_id));
    const significantNodes = loop.path.filter(
      n => !decisionNodes.has(n) && n !== loop.path![0] && n !== loop.outcome.terminal_node_id
    );

    if (significantNodes.length === 0) return fragments;

    // Only narrate a subset based on detail level
    const maxNodes = style.detailLevel === 'verbose' ? 5 :
                     style.detailLevel === 'detailed' ? 3 :
                     style.detailLevel === 'standard' ? 2 : 1;

    const nodesToNarrate = significantNodes.slice(0, maxNodes);

    for (const nodeId of nodesToNarrate) {
      const label = this.getNodeLabel(nodeId);
      const desc = this.getNodeDescription(nodeId);

      let content: string;
      switch (style.perspective) {
        case 'first_person':
          content = desc ? `I passed through ${label}. ${desc}` : `I passed through ${label}.`;
          break;
        case 'second_person':
          content = desc ? `You pass through ${label}. ${desc}` : `You pass through ${label}.`;
          break;
        default:
          content = desc ? `They passed through ${label}. ${desc}` : `They passed through ${label}.`;
      }

      fragments.push({
        type: 'description',
        content,
        weight: 0.4,
        tags: ['path', nodeId],
      });
    }

    return fragments;
  }

  private generateOutcome(
    loop: Loop,
    vocab: VocabularySet,
    style: StyleConfig
  ): ProseFragment {
    const outcome = loop.outcome;
    const outcomeVerb = this.getOutcomeVerb(outcome.type, vocab);
    const terminalLabel = this.getNodeLabel(outcome.terminal_node_id);

    let content: string;

    switch (style.perspective) {
      case 'first_person':
        if (outcome.type === 'death') {
          content = `At ${terminalLabel}, I ${outcomeVerb}.`;
          if (outcome.cause) {
            content += ` ${this.capitalize(outcome.cause)}.`;
          }
        } else if (outcome.type === 'reset_trigger' || outcome.type === 'day_end') {
          content = `At ${terminalLabel}, the day ended. I ${this.pickRandom(vocab.resetVerbs)}.`;
        } else {
          content = `At ${terminalLabel}, I ${outcomeVerb}.`;
        }
        break;

      case 'second_person':
        if (outcome.type === 'death') {
          content = `At ${terminalLabel}, you ${outcomeVerb.replace(/died|fell|perished/, 'die')}.`;
        } else {
          content = `At ${terminalLabel}, you ${outcomeVerb}.`;
        }
        break;

      case 'third_person':
      case 'third_person_limited':
      default:
        if (outcome.type === 'death') {
          content = `At ${terminalLabel}, they ${outcomeVerb}.`;
          if (outcome.cause) {
            content += ` ${this.capitalize(outcome.cause)}.`;
          }
        } else if (outcome.type === 'reset_trigger' || outcome.type === 'day_end') {
          content = `At ${terminalLabel}, the day ended. They ${this.pickRandom(vocab.resetVerbs)}.`;
        } else {
          content = `At ${terminalLabel}, they ${outcomeVerb}.`;
        }
    }

    // Add emotional state change if significant
    if (loop.emotional_state_end && loop.emotional_state_end !== loop.emotional_state_start) {
      const endEmotion = vocab.emotionalAdjectives[loop.emotional_state_end]?.[0] || loop.emotional_state_end;
      if (style.emotionalEmphasis > 0.3) {
        content += ` They felt ${endEmotion}.`;
      }
    }

    return { type: 'scene', content, weight: 1.0, tags: ['outcome', outcome.type] };
  }

  private generateReflection(
    loop: Loop,
    vocab: VocabularySet,
    style: StyleConfig
  ): ProseFragment {
    const knowledgeVerb = this.pickRandom(vocab.knowledgeVerbs);

    let content: string;

    // Only include reflection for loops that gained knowledge
    if (loop.knowledge_state_end_id && loop.knowledge_state_end_id !== loop.knowledge_state_start_id) {
      switch (style.perspective) {
        case 'first_person':
          content = `I ${knowledgeVerb} something new this time.`;
          break;
        case 'second_person':
          content = `You ${knowledgeVerb} something new.`;
          break;
        default:
          content = `They ${knowledgeVerb} something new.`;
      }
    } else {
      // No new knowledge
      switch (style.perspective) {
        case 'first_person':
          content = `Nothing new to show for it.`;
          break;
        case 'second_person':
          content = `Nothing new learned.`;
          break;
        default:
          content = `Nothing new was learned.`;
      }
    }

    return { type: 'reflection', content, weight: 0.5, tags: ['reflection'] };
  }

  // ============================================
  // Composition
  // ============================================

  private composeProse(fragments: ProseFragment[], style: StyleConfig): string {
    // Filter by weight based on detail level
    const threshold = style.detailLevel === 'minimal' ? 0.8 :
                      style.detailLevel === 'standard' ? 0.5 :
                      style.detailLevel === 'detailed' ? 0.3 : 0;

    const included = fragments.filter(f => f.weight >= threshold);

    // Group by paragraph based on style
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (const fragment of included) {
      currentParagraph.push(fragment.content);

      // Break paragraph based on style
      const shouldBreak =
        (style.paragraphStyle === 'short' && currentParagraph.length >= 2) ||
        (style.paragraphStyle === 'medium' && currentParagraph.length >= 4) ||
        (style.paragraphStyle === 'long' && currentParagraph.length >= 6) ||
        fragment.type === 'scene';

      if (shouldBreak) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    // Flush remaining
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    return paragraphs.join('\n\n');
  }

  // ============================================
  // Helpers
  // ============================================

  private getOutcomeVerb(type: OutcomeType, vocab: VocabularySet): string {
    switch (type) {
      case 'death':
        return this.pickRandom(vocab.deathVerbs);
      case 'reset_trigger':
      case 'day_end':
      case 'voluntary_reset':
        return this.pickRandom(vocab.resetVerbs);
      case 'success':
        return 'succeeded';
      case 'failure':
        return 'failed';
      case 'partial':
        return 'partially succeeded';
      case 'sub_loop_exit':
        return 'exited the sub-loop';
      default:
        return 'ended';
    }
  }

  private getNodeLabel(nodeId: string): string {
    if (this.graphContext?.nodeLabels.has(nodeId)) {
      return this.graphContext.nodeLabels.get(nodeId)!;
    }
    // Convert snake_case to Title Case
    return nodeId.split('_').map(w => this.capitalize(w)).join(' ');
  }

  private getNodeDescription(nodeId: string): string | undefined {
    return this.graphContext?.nodeDescriptions.get(nodeId);
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const mod = n % 100;
    return n + (s[(mod - 20) % 10] || s[mod] || s[0]);
  }

  private formatTime(iso: string): string {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }
}

/**
 * Convenience function to narrate a loop with default settings
 */
export function narrateLoop(loop: Loop, style?: Partial<StyleConfig>): NarrationResult {
  const narrator = new LoopNarrator(style);
  return narrator.narrate({ loop, style });
}

/**
 * Generate a quick summary of a loop
 */
export function summarizeLoop(loop: Loop, style?: Partial<StyleConfig>): string {
  const narrator = new LoopNarrator(style);
  return narrator.summarize(loop);
}
