import {
  TemplateEngine,
  createTemplateEngine,
  BUILT_IN_TEMPLATES,
  LoopNarrator,
  narrateLoop,
  summarizeLoop,
  MontageGenerator,
  generateMontage,
  briefMontage,
  EpochSummarizer,
  summarizeEpoch,
  briefEpochSummary,
  StyleConfig,
  DEFAULT_STYLE,
  VOCABULARY,
  Loop,
  EquivalenceClass,
  EpochContext,
} from '../../src';

describe('TemplateEngine', () => {
  describe('variable interpolation', () => {
    it('should interpolate simple variables', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('Hello, {{name}}!', {
        style: DEFAULT_STYLE,
        custom: { name: 'World' },
      } as any);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, World!');
    });

    it('should interpolate nested paths', () => {
      const engine = new TemplateEngine();
      // Access nested paths through custom
      const result = engine.renderString('{{name}} is {{age}} years old.', {
        style: DEFAULT_STYLE,
        custom: { name: 'Alice', age: 30 },
      } as any);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Alice is 30 years old.');
    });

    it('should handle missing variables', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('Hello, {{missing}}!', {
        style: DEFAULT_STYLE,
      } as any);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, !');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('filters', () => {
    it('should apply uppercase filter', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('{{name | uppercase}}', {
        style: DEFAULT_STYLE,
        custom: { name: 'hello' },
      } as any);

      expect(result.output).toBe('HELLO');
    });

    it('should apply capitalize filter', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('{{name | capitalize}}', {
        style: DEFAULT_STYLE,
        custom: { name: 'HELLO' },
      } as any);

      expect(result.output).toBe('Hello');
    });

    it('should apply length filter', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('{{items | length}} items', {
        style: DEFAULT_STYLE,
        custom: { items: [1, 2, 3, 4, 5] },
      } as any);

      expect(result.output).toBe('5 items');
    });

    it('should apply join filter', () => {
      const engine = new TemplateEngine();
      // Default join uses ", "
      const result = engine.renderString('{{items | join}}', {
        style: DEFAULT_STYLE,
        custom: { items: ['a', 'b', 'c'] },
      } as any);

      expect(result.output).toBe('a, b, c');
    });

    it('should apply pluralize filter', () => {
      const engine = new TemplateEngine();

      const result1 = engine.renderString('{{count}} item{{count | pluralize}}', {
        style: DEFAULT_STYLE,
        custom: { count: 1 },
      } as any);
      expect(result1.output).toBe('1 item');

      const result2 = engine.renderString('{{count}} item{{count | pluralize}}', {
        style: DEFAULT_STYLE,
        custom: { count: 5 },
      } as any);
      expect(result2.output).toBe('5 items');
    });
  });

  describe('conditionals', () => {
    it('should process if blocks', () => {
      const engine = new TemplateEngine();

      const result1 = engine.renderString('{{#if show}}Visible{{/if}}', {
        style: DEFAULT_STYLE,
        custom: { show: true },
      } as any);
      expect(result1.output).toBe('Visible');

      const result2 = engine.renderString('{{#if show}}Visible{{/if}}', {
        style: DEFAULT_STYLE,
        custom: { show: false },
      } as any);
      expect(result2.output).toBe('');
    });

    it('should process if-else blocks', () => {
      const engine = new TemplateEngine();

      const result = engine.renderString('{{#if active}}Yes{{else}}No{{/if}}', {
        style: DEFAULT_STYLE,
        custom: { active: false },
      } as any);
      expect(result.output).toBe('No');
    });

    it('should process unless blocks', () => {
      const engine = new TemplateEngine();

      const result = engine.renderString('{{#unless empty}}Has content{{/unless}}', {
        style: DEFAULT_STYLE,
        custom: { empty: false },
      } as any);
      expect(result.output).toBe('Has content');
    });

    it('should support comparison operators', () => {
      const engine = new TemplateEngine();

      const result = engine.renderString('{{#if count > 5}}Many{{/if}}', {
        style: DEFAULT_STYLE,
        custom: { count: 10 },
      } as any);
      expect(result.output).toBe('Many');
    });
  });

  describe('each loops', () => {
    it('should iterate arrays', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('{{#each items}}[{{this}}]{{/each}}', {
        style: DEFAULT_STYLE,
        custom: { items: ['a', 'b', 'c'] },
      } as any);

      expect(result.output).toBe('[a][b][c]');
    });

    it('should provide @index', () => {
      const engine = new TemplateEngine();
      const result = engine.renderString('{{#each items}}{{@index}}:{{this}} {{/each}}', {
        style: DEFAULT_STYLE,
        custom: { items: ['x', 'y'] },
      } as any);

      expect(result.output).toContain('0:x');
      expect(result.output).toContain('1:y');
    });
  });

  describe('template registration', () => {
    it('should register and render templates', () => {
      const engine = new TemplateEngine();

      engine.registerTemplate({
        id: 'greeting',
        name: 'Greeting',
        template: 'Hello, {{name}}!',
        variables: [{ name: 'name', type: 'string', required: true }],
      });

      const result = engine.render('greeting', {
        style: DEFAULT_STYLE,
        custom: { name: 'Test' },
      } as any);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, Test!');
    });

    it('should include built-in templates', () => {
      const engine = createTemplateEngine();

      expect(engine.getTemplate('loop-summary-brief')).toBeDefined();
      expect(engine.getTemplate('loop-summary-standard')).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should detect unclosed tags', () => {
      const engine = new TemplateEngine();

      const result1 = engine.validate('{{#if true}}content');
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('if'))).toBe(true);

      const result2 = engine.validate('{{#each items}}item');
      expect(result2.valid).toBe(false);
    });

    it('should pass valid templates', () => {
      const engine = new TemplateEngine();

      const result = engine.validate('{{#if show}}{{name}}{{/if}}');
      expect(result.valid).toBe(true);
    });
  });
});

describe('LoopNarrator', () => {
  function createTestLoop(): Loop {
    return {
      id: 'loop-1',
      sequence_number: 5,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      knowledge_state_end_id: 'ks-1',
      emotional_state_start: 'hopeful',
      emotional_state_end: 'frustrated',
      decisions: [
        { id: 'd1', node_id: 'bank', choice_index: 0, choice_label: 'Rob the vault', timestamp: '2024-01-01T10:00:00Z' },
      ],
      decision_vector: [0],
      path: ['start', 'bank', 'vault', 'explosion'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'explosion',
        timestamp: '2024-01-01T18:00:00Z',
        cause: 'The vault exploded',
      },
      is_anchor: false,
      tags: ['exploration', 'bank'],
    };
  }

  describe('narrate', () => {
    it('should generate prose for a loop', () => {
      const narrator = new LoopNarrator();
      const loop = createTestLoop();

      const result = narrator.narrate({ loop });

      expect(result.success).toBe(true);
      expect(result.prose.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.metadata.inputType).toBe('loop');
    });

    it('should respect perspective setting', () => {
      const loop = createTestLoop();

      const firstPerson = narrateLoop(loop, { perspective: 'first_person' });
      expect(firstPerson.prose).toMatch(/\bI\b/);

      const secondPerson = narrateLoop(loop, { perspective: 'second_person' });
      expect(secondPerson.prose).toMatch(/\byou\b/i);

      const thirdPerson = narrateLoop(loop, { perspective: 'third_person' });
      expect(thirdPerson.prose).toMatch(/\b[Tt]hey\b/);
    });

    it('should include timestamps when configured', () => {
      const loop = createTestLoop();

      const result = narrateLoop(loop, { includeTimestamps: true });
      expect(result.prose).toMatch(/\[\d{1,2}:\d{2}/);
    });

    it('should apply tone vocabulary', () => {
      const loop = createTestLoop();

      // Desperate tone uses specific vocabulary
      const desperate = narrateLoop(loop, { tone: 'desperate' });
      expect(desperate.success).toBe(true);

      // Clinical tone uses different vocabulary
      const clinical = narrateLoop(loop, { tone: 'clinical' });
      expect(clinical.success).toBe(true);
    });
  });

  describe('summarize', () => {
    it('should generate a one-line summary', () => {
      const narrator = new LoopNarrator();
      const loop = createTestLoop();

      const summary = narrator.summarize(loop);

      expect(summary).toContain('Loop 5');
      expect(summary.split('\n').length).toBe(1);
    });
  });
});

describe('MontageGenerator', () => {
  function createTestEquivalenceClass(): EquivalenceClass {
    return {
      id: 'ec-1',
      outcome_hash: 'hash1',
      knowledge_end_hash: 'hash2',
      composite_hash: 'hash3',
      representative_loop_id: 'loop-1',
      sample_loop_ids: ['loop-1', 'loop-2', 'loop-3'],
      member_count: 15,
      epoch_distribution: { 'epoch-1': 10, 'epoch-2': 5 },
      outcome_summary: 'death: explosion at vault',
      knowledge_delta_summary: 'Learned vault code',
      common_tags: ['bank', 'vault'],
      decision_vector_centroid: [0, 1],
      decision_vector_variance: 0.5,
      first_occurrence_loop_id: 'loop-1',
      last_occurrence_loop_id: 'loop-15',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };
  }

  function createTestLoops(): Loop[] {
    const base: Loop = {
      id: 'loop-1',
      sequence_number: 1,
      epoch_id: 'epoch-1',
      graph_id: 'test-graph',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T06:00:00Z',
      ended_at: '2024-01-01T18:00:00Z',
      duration_story_minutes: 720,
      knowledge_state_start_id: 'ks-0',
      knowledge_state_end_id: 'ks-1',
      emotional_state_start: 'hopeful',
      emotional_state_end: 'frustrated',
      decisions: [{ id: 'd1', node_id: 'bank', choice_index: 0, timestamp: '' }],
      decision_vector: [0],
      path: ['start', 'bank', 'vault', 'explosion'],
      outcome: {
        id: 'o1',
        type: 'death',
        terminal_node_id: 'explosion',
        timestamp: '',
      },
      is_anchor: false,
      tags: [],
    };

    return [
      { ...base, id: 'loop-1', sequence_number: 1 },
      { ...base, id: 'loop-2', sequence_number: 2, decision_vector: [0] },
      { ...base, id: 'loop-3', sequence_number: 3, decision_vector: [1] },
    ];
  }

  describe('generate', () => {
    it('should generate a montage for an equivalence class', () => {
      const generator = new MontageGenerator();
      const ec = createTestEquivalenceClass();
      const loops = createTestLoops();

      const result = generator.generate({ equivalenceClass: ec, sampleLoops: loops });

      expect(result.success).toBe(true);
      expect(result.prose.length).toBeGreaterThan(0);
      expect(result.metadata.inputType).toBe('montage');
    });

    it('should mention the loop count', () => {
      const ec = createTestEquivalenceClass();
      const loops = createTestLoops();

      const result = generateMontage(ec, loops);

      expect(result.prose).toMatch(/15/);
    });

    it('should respect style settings', () => {
      const ec = createTestEquivalenceClass();
      const loops = createTestLoops();

      const desperate = generateMontage(ec, loops, { tone: 'desperate' });
      const clinical = generateMontage(ec, loops, { tone: 'clinical' });

      // Different tones should produce different prose
      expect(desperate.prose).not.toEqual(clinical.prose);
    });
  });

  describe('brief', () => {
    it('should generate a one-sentence summary', () => {
      const generator = new MontageGenerator();
      const ec = createTestEquivalenceClass();

      const brief = generator.brief(ec);

      expect(brief.length).toBeLessThan(200);
      expect(brief).toContain('15');
    });

    it('should handle single-loop class', () => {
      const ec = createTestEquivalenceClass();
      ec.member_count = 1;

      const brief = briefMontage(ec);

      expect(brief).toContain('One');
    });
  });
});

describe('EpochSummarizer', () => {
  function createTestEpoch(): EpochContext {
    return {
      id: 'epoch-1',
      name: 'The Bank Phase',
      description: 'Attempting to rob the bank',
      loopCount: 50,
      anchorLoops: [],
      dominantTone: 'desperate',
    };
  }

  function createTestLoops(count: number): Loop[] {
    const loops: Loop[] = [];
    for (let i = 0; i < count; i++) {
      loops.push({
        id: `loop-${i}`,
        sequence_number: i + 1,
        epoch_id: 'epoch-1',
        graph_id: 'test-graph',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T06:00:00Z',
        ended_at: '2024-01-01T18:00:00Z',
        duration_story_minutes: 720,
        knowledge_state_start_id: 'ks-0',
        knowledge_state_end_id: 'ks-1',
        emotional_state_start: 'hopeful',
        emotional_state_end: i < count * 0.8 ? 'frustrated' : 'determined',
        decisions: [{ id: 'd1', node_id: 'bank', choice_index: i % 3, timestamp: '' }],
        decision_vector: [i % 3],
        path: ['start', 'bank', 'vault'],
        outcome: {
          id: `o-${i}`,
          type: i < count * 0.7 ? 'death' : 'reset_trigger',
          terminal_node_id: i < count * 0.7 ? 'explosion' : 'day_end',
          timestamp: '',
        },
        is_anchor: i === 10 || i === 25,
        tags: ['bank'],
      });
    }
    return loops;
  }

  describe('summarize', () => {
    it('should generate an epoch summary', () => {
      const summarizer = new EpochSummarizer();
      const epoch = createTestEpoch();
      const loops = createTestLoops(50);

      const result = summarizer.summarize({
        epoch,
        loops,
        equivalenceClasses: [],
      });

      expect(result.success).toBe(true);
      expect(result.prose.length).toBeGreaterThan(0);
      expect(result.metadata.inputType).toBe('epoch');
    });

    it('should include title', () => {
      const epoch = createTestEpoch();
      const loops = createTestLoops(10);

      const result = summarizeEpoch({ epoch, loops, equivalenceClasses: [] });

      expect(result.prose).toContain('The Bank Phase');
    });

    it('should include statistics when requested', () => {
      const epoch = createTestEpoch();
      const loops = createTestLoops(50);

      const result = summarizeEpoch({
        epoch,
        loops,
        equivalenceClasses: [],
        includeStatistics: true,
      });

      expect(result.prose).toContain('Statistics');
      expect(result.prose).toMatch(/Total loops: \d+/);
    });

    it('should mention anchor loops', () => {
      const epoch = createTestEpoch();
      const loops = createTestLoops(50);
      epoch.anchorLoops = loops.filter(l => l.is_anchor);

      const result = summarizeEpoch({ epoch, loops, equivalenceClasses: [] });

      expect(result.prose).toContain('Anchor');
    });
  });

  describe('brief', () => {
    it('should generate a brief summary', () => {
      const summarizer = new EpochSummarizer();
      const epoch = createTestEpoch();
      const loops = createTestLoops(50);

      const brief = summarizer.brief(epoch, loops);

      expect(brief.length).toBeLessThan(300);
      expect(brief).toContain('The Bank Phase');
      expect(brief).toContain('50');
    });
  });
});

describe('Vocabulary', () => {
  it('should have all tones defined', () => {
    const tones = ['hopeful', 'desperate', 'clinical', 'melancholic', 'dark_humor', 'philosophical', 'terse', 'poetic'];

    for (const tone of tones) {
      expect(VOCABULARY[tone as keyof typeof VOCABULARY]).toBeDefined();
      expect(VOCABULARY[tone as keyof typeof VOCABULARY].deathVerbs.length).toBeGreaterThan(0);
      expect(VOCABULARY[tone as keyof typeof VOCABULARY].resetVerbs.length).toBeGreaterThan(0);
    }
  });

  it('should have emotional adjectives for all emotional states', () => {
    const emotions = ['hopeful', 'curious', 'frustrated', 'desperate', 'numb', 'determined', 'broken', 'calm', 'angry', 'resigned'];

    for (const vocab of Object.values(VOCABULARY)) {
      for (const emotion of emotions) {
        expect(vocab.emotionalAdjectives[emotion as keyof typeof vocab.emotionalAdjectives]).toBeDefined();
        expect(vocab.emotionalAdjectives[emotion as keyof typeof vocab.emotionalAdjectives].length).toBeGreaterThan(0);
      }
    }
  });
});
