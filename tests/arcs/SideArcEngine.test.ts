/**
 * Comprehensive tests for the Side Arc System
 */

import {
  SideArcEngine,
  SideArcDefinition,
  ArcTier,
  ResolubilityClass,
  LooperOnlyClass,
  ArcMetaLevel,
  ResolutionMode,
  ArcConflictRule,
} from '../../src/arcs';

// ============================================
// Test Fixtures
// ============================================

/**
 * Create a simple B-story arc for testing
 */
function createBStoryArc(id: string = 'b-story-romance'): SideArcDefinition {
  return {
    meta: {
      id,
      name: 'Coffee Shop Romance',
      tier: 'B',
      resolubility: 'MULTI_PASS_OBSERVATION',
      looperClass: 'NORMAL',
      priorityWeight: 80,
      tags: ['romance', 'personal'],
    },
    states: [
      { id: 'UNSEEN', label: 'Unnoticed', description: 'Haven\'t noticed the person', isTerminal: false },
      { id: 'NOTICED', label: 'First Contact', description: 'Made eye contact', isTerminal: false },
      { id: 'INTERESTED', label: 'Getting Closer', description: 'Exchanged words', isTerminal: false },
      { id: 'GOOD', label: 'Connection Made', description: 'Established relationship', isTerminal: true, outcomeType: 'GOOD' },
      { id: 'AWKWARD', label: 'Made It Weird', description: 'Said something wrong', isTerminal: true, outcomeType: 'BAD' },
    ],
    transitions: [
      {
        id: 't1',
        from: 'UNSEEN',
        to: 'NOTICED',
        trigger: { requiredTimeSlots: ['08:00'], requiredLocations: ['COFFEE_SHOP'] },
        priority: 1,
      },
      {
        id: 't2',
        from: 'NOTICED',
        to: 'INTERESTED',
        trigger: { requiredActions: ['TALK_BARISTA'] },
        priority: 1,
      },
      {
        id: 't3',
        from: 'INTERESTED',
        to: 'GOOD',
        trigger: { requiredActions: ['GIVE_GIFT'], requiredKnowledgeFlags: ['KNOWS_FAVORITE_DRINK'] },
        priority: 1,
      },
      {
        id: 't4',
        from: 'INTERESTED',
        to: 'AWKWARD',
        trigger: { requiredActions: ['SAY_WRONG_THING'] },
        priority: 1,
      },
    ],
    timeWindows: [
      { arcId: id, windowId: 'MORNING', activeSlots: ['08:00', '08:30', '09:00'], locations: ['COFFEE_SHOP'] },
    ],
    resolutionProfile: {
      arcId: id,
      availableModes: ['ONSITE_HEAVY', 'ONSITE_LIGHT'],
      modeRequirements: [
        {
          mode: 'ONSITE_HEAVY',
          requiredTimeSlots: ['08:00', '08:30'],
          requiredLocations: ['COFFEE_SHOP'],
          requiredKnowledgeFlags: [],
          minArcMetaLevel: 'UNTOUCHED',
          riskLevel: 30,
        },
        {
          mode: 'ONSITE_LIGHT',
          requiredTimeSlots: ['08:00'],
          requiredLocations: ['COFFEE_SHOP'],
          requiredKnowledgeFlags: ['KNOWS_FAVORITE_DRINK'],
          minArcMetaLevel: 'PATTERN_OBSERVED',
          riskLevel: 10,
        },
      ],
      defaultMode: 'ONSITE_HEAVY',
    },
    knowledgeFlagsProduced: ['KNOWS_FAVORITE_DRINK', 'KNOWS_BARISTA_NAME'],
    initialStateId: 'UNSEEN',
  };
}

/**
 * Create a C-story arc for testing
 */
function createCStoryArc(id: string = 'c-story-help-stranger'): SideArcDefinition {
  return {
    meta: {
      id,
      name: 'Help a Stranger',
      tier: 'C',
      resolubility: 'SINGLE_PASS',
      looperClass: 'NORMAL',
      priorityWeight: 50,
      tags: ['kindness', 'quick'],
    },
    states: [
      { id: 'UNAWARE', label: 'Unaware', description: 'Haven\'t seen the stranger', isTerminal: false },
      { id: 'WITNESSED', label: 'Witnessed', description: 'Saw the stranger in trouble', isTerminal: false },
      { id: 'HELPED', label: 'Helped', description: 'Successfully helped', isTerminal: true, outcomeType: 'GOOD' },
      { id: 'IGNORED', label: 'Ignored', description: 'Walked away', isTerminal: true, outcomeType: 'NEUTRAL' },
    ],
    transitions: [
      {
        id: 't1',
        from: 'UNAWARE',
        to: 'WITNESSED',
        trigger: { requiredTimeSlots: ['10:00'], requiredLocations: ['PARK'] },
      },
      {
        id: 't2',
        from: 'WITNESSED',
        to: 'HELPED',
        trigger: { requiredActions: ['HELP_STRANGER'] },
      },
      {
        id: 't3',
        from: 'WITNESSED',
        to: 'IGNORED',
        trigger: { requiredActions: ['WALK_AWAY'] },
      },
    ],
    timeWindows: [
      { arcId: id, windowId: 'MIDDAY', activeSlots: ['10:00', '10:30'] },
    ],
    resolutionProfile: {
      arcId: id,
      availableModes: ['ONSITE_LIGHT', 'REMOTE_SIMPLE'],
      modeRequirements: [
        {
          mode: 'ONSITE_LIGHT',
          requiredTimeSlots: ['10:00'],
          requiredLocations: ['PARK'],
          requiredKnowledgeFlags: [],
          minArcMetaLevel: 'UNTOUCHED',
          riskLevel: 5,
        },
        {
          mode: 'REMOTE_SIMPLE',
          requiredTimeSlots: [],
          requiredLocations: [],
          requiredKnowledgeFlags: ['STRANGER_PHONE_NUMBER'],
          minArcMetaLevel: 'MECHANIC_KNOWN',
          riskLevel: 0,
        },
      ],
      defaultMode: 'ONSITE_LIGHT',
    },
    knowledgeFlagsProduced: ['STRANGER_PHONE_NUMBER'],
    initialStateId: 'UNAWARE',
  };
}

/**
 * Create a looper-only arc for testing
 */
function createLooperOnlyArc(id: string = 'looper-puzzle'): SideArcDefinition {
  return {
    meta: {
      id,
      name: 'Time-Locked Puzzle',
      tier: 'C',
      resolubility: 'MULTI_PASS_INTERVENTION',
      looperClass: 'LOOPER_ONLY',
      priorityWeight: 70,
      tags: ['puzzle', 'looper'],
    },
    states: [
      { id: 'UNKNOWN', label: 'Unknown', description: 'Puzzle not discovered', isTerminal: false },
      { id: 'FOUND', label: 'Found', description: 'Discovered the puzzle', isTerminal: false },
      { id: 'PARTIAL', label: 'Partial', description: 'Some pieces collected', isTerminal: false },
      { id: 'SOLVED', label: 'Solved', description: 'Puzzle completed', isTerminal: true, outcomeType: 'GOOD' },
    ],
    transitions: [
      {
        id: 't1',
        from: 'UNKNOWN',
        to: 'FOUND',
        trigger: { requiredTimeSlots: ['14:00'], requiredLocations: ['LIBRARY'] },
      },
      {
        id: 't2',
        from: 'FOUND',
        to: 'PARTIAL',
        trigger: { requiredActions: ['EXAMINE_PUZZLE'] },
      },
      {
        id: 't3',
        from: 'PARTIAL',
        to: 'SOLVED',
        trigger: {
          requiredActions: ['SOLVE_PUZZLE'],
          requiredKnowledgeFlags: ['CLUE_A', 'CLUE_B', 'CLUE_C'],
        },
      },
    ],
    timeWindows: [
      { arcId: id, windowId: 'AFTERNOON_A', activeSlots: ['14:00'], locations: ['LIBRARY'] },
      { arcId: id, windowId: 'AFTERNOON_B', activeSlots: ['15:00'], locations: ['MUSEUM'] },
      { arcId: id, windowId: 'AFTERNOON_C', activeSlots: ['16:00'], locations: ['PARK'] },
    ],
    resolutionProfile: {
      arcId: id,
      availableModes: ['ONSITE_HEAVY'],
      modeRequirements: [
        {
          mode: 'ONSITE_HEAVY',
          requiredTimeSlots: ['14:00'],
          requiredLocations: ['LIBRARY'],
          requiredKnowledgeFlags: ['CLUE_A', 'CLUE_B', 'CLUE_C'],
          minArcMetaLevel: 'MECHANIC_KNOWN',
          riskLevel: 20,
        },
      ],
      defaultMode: 'ONSITE_HEAVY',
    },
    looperConstraint: {
      arcId: id,
      observationRequirements: ['CLUE_A', 'CLUE_B', 'CLUE_C'],
      maxObservationsPerLoop: 1,
      resolutionFlags: ['CLUE_A', 'CLUE_B', 'CLUE_C'],
      rationale: 'Each clue can only be found at one time/location per loop',
    },
    knowledgeFlagsProduced: ['CLUE_A', 'CLUE_B', 'CLUE_C', 'PUZZLE_SOLVED'],
    initialStateId: 'UNKNOWN',
  };
}

// ============================================
// Tests
// ============================================

describe('SideArcEngine', () => {
  let engine: SideArcEngine;

  beforeEach(() => {
    engine = new SideArcEngine();
  });

  describe('Arc Registration', () => {
    it('should register a B-story arc', () => {
      const arc = createBStoryArc();
      engine.registerArc(arc);

      const registry = engine.getRegistry();
      expect(registry.has(arc.meta.id)).toBe(true);
      expect(registry.get(arc.meta.id)).toEqual(arc);
    });

    it('should register multiple arcs', () => {
      const bArc = createBStoryArc();
      const cArc = createCStoryArc();

      engine.registerArcs([bArc, cArc]);

      const registry = engine.getRegistry();
      expect(registry.size).toBe(2);
      expect(registry.has(bArc.meta.id)).toBe(true);
      expect(registry.has(cArc.meta.id)).toBe(true);
    });

    it('should reject duplicate arc IDs', () => {
      const arc = createBStoryArc();
      engine.registerArc(arc);

      expect(() => engine.registerArc(arc)).toThrow();
    });

    it('should unregister an arc', () => {
      const arc = createBStoryArc();
      engine.registerArc(arc);

      const removed = engine.unregisterArc(arc.meta.id);
      expect(removed).toBe(true);
      expect(engine.getRegistry().has(arc.meta.id)).toBe(false);
    });

    it('should validate arcs on registration', () => {
      const invalidArc: SideArcDefinition = {
        ...createBStoryArc(),
        initialStateId: 'NON_EXISTENT_STATE',
      };

      expect(() => engine.registerArc(invalidArc)).toThrow();
    });
  });

  describe('Loop Lifecycle', () => {
    beforeEach(() => {
      engine.registerArc(createBStoryArc());
      engine.registerArc(createCStoryArc());
    });

    it('should initialize a loop', () => {
      const state = engine.initializeLoop('loop-1');

      expect(state.loopId).toBe('loop-1');
      expect(state.arcStates.size).toBe(2);
    });

    it('should step arcs based on actions', () => {
      engine.initializeLoop('loop-1');

      // Action that matches B-story transition
      const results = engine.stepArcs({
        action: 'ENTER',
        timeSlot: '08:00',
        location: 'COFFEE_SHOP',
      });

      expect(results.size).toBe(2);
      const bResult = results.get('b-story-romance');
      expect(bResult?.changed).toBe(true);
      expect(bResult?.newState).toBe('NOTICED');
    });

    it('should finalize a loop and update cross-loop state', () => {
      engine.initializeLoop('loop-1');

      engine.stepArcs({
        action: 'ENTER',
        timeSlot: '08:00',
        location: 'COFFEE_SHOP',
      });

      const outcome = engine.finalizeLoop();

      expect(outcome.loopId).toBe('loop-1');
      expect(outcome.finalArcStates.get('b-story-romance')).toBe('NOTICED');

      // Cross-loop state should be updated
      const crossState = engine.getCrossLoopState();
      expect(crossState.totalLoops).toBe(1);

      const meta = crossState.metas.get('b-story-romance');
      expect(meta?.observations).toBe(1);
      expect(meta?.level).toBe('SEEN_ONCE');
    });

    it('should track multiple loops', () => {
      // Loop 1
      engine.initializeLoop('loop-1');
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();

      // Loop 2
      engine.initializeLoop('loop-2');
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();

      // Loop 3
      engine.initializeLoop('loop-3');
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();

      const crossState = engine.getCrossLoopState();
      expect(crossState.totalLoops).toBe(3);

      const meta = crossState.metas.get('b-story-romance');
      expect(meta?.observations).toBe(3);
      expect(meta?.level).toBe('PATTERN_OBSERVED');
    });
  });

  describe('Arc Status and Queries', () => {
    beforeEach(() => {
      engine.registerArc(createBStoryArc());
      engine.registerArc(createCStoryArc());
    });

    it('should get arc status', () => {
      const status = engine.getArcStatus('b-story-romance');

      expect(status.arcId).toBe('b-story-romance');
      expect(status.metaLevel).toBe('UNTOUCHED');
      expect(status.observations).toBe(0);
      expect(status.isLooperOnly).toBe(false);
    });

    it('should get progress report', () => {
      const report = engine.getProgressReport();

      expect(report.totalArcs).toBe(2);
      expect(report.totalLoops).toBe(0);
      expect(report.metaLevelDistribution['UNTOUCHED']).toBe(2);
    });

    it('should get resolution costs', () => {
      const costs = engine.getResolutionCosts();

      expect(costs.size).toBe(2);
      const bCosts = costs.get('b-story-romance');
      expect(bCosts).toBeDefined();
      expect(bCosts!.length).toBeGreaterThan(0);
    });
  });

  describe('Resolution Modes and Trivialization', () => {
    beforeEach(() => {
      engine.registerArc(createBStoryArc());
    });

    it('should track trivialization progress', () => {
      const status = engine.getArcStatus('b-story-romance');
      expect(status.trivializationPercent).toBeDefined();
    });

    it('should unlock cheaper modes with more knowledge', () => {
      // Start with default mode
      let status = engine.getArcStatus('b-story-romance');
      expect(status.bestMode).toBe('ONSITE_HEAVY');

      // Add knowledge and simulate loops to reach PATTERN_OBSERVED
      engine.addKnowledgeFlags(['KNOWS_FAVORITE_DRINK']);

      // Simulate 3 loops to reach PATTERN_OBSERVED
      for (let i = 0; i < 3; i++) {
        engine.initializeLoop(`loop-${i}`);
        engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
        engine.finalizeLoop();
      }

      status = engine.getArcStatus('b-story-romance');
      expect(status.bestMode).toBe('ONSITE_LIGHT');
    });
  });

  describe('Looper-Only Arcs', () => {
    beforeEach(() => {
      engine.registerArc(createLooperOnlyArc());
    });

    it('should identify looper-only arcs', () => {
      const status = engine.getArcStatus('looper-puzzle');
      expect(status.isLooperOnly).toBe(true);
      expect(status.looperStatus).toBeDefined();
    });

    it('should track observation requirements', () => {
      const looperStatus = engine.getLooperOnlyStatus();

      expect(looperStatus.length).toBe(1);
      expect(looperStatus[0].arcId).toBe('looper-puzzle');
      expect(looperStatus[0].observationsNeeded.length).toBe(3);
      expect(looperStatus[0].canResolveThisLoop).toBe(false);
    });

    it('should validate looper-only design', () => {
      const validations = engine.validateLooperOnlyArcs();

      expect(validations.length).toBe(1);
      // The design should be valid (requires multiple loops)
    });

    it('should require multiple loops to resolve', () => {
      // Add clues one at a time
      engine.addKnowledgeFlags(['CLUE_A']);

      let status = engine.getLooperOnlyStatus()[0];
      expect(status.observationsAcquired.length).toBe(1);
      expect(status.canResolveThisLoop).toBe(false);

      engine.addKnowledgeFlags(['CLUE_B']);
      status = engine.getLooperOnlyStatus()[0];
      expect(status.observationsAcquired.length).toBe(2);
      expect(status.canResolveThisLoop).toBe(false);

      engine.addKnowledgeFlags(['CLUE_C']);
      status = engine.getLooperOnlyStatus()[0];
      expect(status.observationsAcquired.length).toBe(3);
      expect(status.canResolveThisLoop).toBe(true);
    });
  });

  describe('Scheduling and Conflicts', () => {
    beforeEach(() => {
      engine.registerArc(createBStoryArc('b-arc'));
      engine.registerArc(createCStoryArc('c-arc'));
    });

    it('should check feasibility of arc combinations', () => {
      const arcModes = new Map<string, ResolutionMode>([
        ['b-arc', 'ONSITE_HEAVY'],
        ['c-arc', 'ONSITE_LIGHT'],
      ]);

      const result = engine.checkFeasibility(arcModes, ['12:00']);
      expect(result.feasible).toBe(true);
    });

    it('should detect conflicts with main arc', () => {
      const arcModes = new Map<string, ResolutionMode>([
        ['b-arc', 'ONSITE_HEAVY'],
      ]);

      // Main arc uses the same slot as B-arc
      const result = engine.checkFeasibility(arcModes, ['08:00']);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should add and check conflict rules', () => {
      const rule: ArcConflictRule = {
        arcId1: 'b-arc',
        arcId2: 'c-arc',
        conflictType: 'NARRATIVE',
        mutuallyExclusive: true,
        details: { description: 'Cannot do both in same loop' },
      };

      engine.addConflictRule(rule);

      const arcModes = new Map<string, ResolutionMode>([
        ['b-arc', 'ONSITE_HEAVY'],
        ['c-arc', 'ONSITE_LIGHT'],
      ]);

      const result = engine.checkFeasibility(arcModes, []);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].conflictType).toBe('NARRATIVE');
    });

    it('should compute optimal arc set', () => {
      const result = engine.computeOptimalArcSet(['12:00']);

      expect(result.selectedArcs.size).toBeGreaterThan(0);
      expect(result.narrativeValue).toBeGreaterThan(0);
    });

    it('should build a schedule', () => {
      const arcModes = new Map<string, ResolutionMode>([
        ['b-arc', 'ONSITE_HEAVY'],
      ]);

      const schedule = engine.buildSchedule(arcModes, ['12:00']);

      expect(schedule.includedArcs).toContain('b-arc');
      expect(schedule.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('State Serialization', () => {
    beforeEach(() => {
      engine.registerArc(createBStoryArc());
    });

    it('should serialize state', () => {
      // Make some progress
      engine.initializeLoop('loop-1');
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();

      const json = engine.serializeState();
      expect(json).toBeTruthy();
      expect(typeof json).toBe('string');
    });

    it('should deserialize and restore state', () => {
      // Make some progress
      engine.initializeLoop('loop-1');
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();

      const json = engine.serializeState();

      // Create new engine and restore
      const newEngine = new SideArcEngine();
      newEngine.registerArc(createBStoryArc());
      newEngine.deserializeState(json);

      const crossState = newEngine.getCrossLoopState();
      expect(crossState.totalLoops).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate all registered arcs', () => {
      engine.registerArc(createBStoryArc());
      engine.registerArc(createCStoryArc());

      const results = engine.validateAllArcs();

      expect(results.length).toBe(2);
      expect(results.every((r) => r.valid)).toBe(true);
    });
  });
});

describe('ArcRegistry', () => {
  let engine: SideArcEngine;

  beforeEach(() => {
    engine = new SideArcEngine();
    engine.registerArc(createBStoryArc('b-1'));
    engine.registerArc(createCStoryArc('c-1'));
    engine.registerArc(createLooperOnlyArc('looper-1'));
  });

  it('should filter by tier', () => {
    const registry = engine.getRegistry();

    const bStories = registry.getBStories();
    expect(bStories.length).toBe(1);
    expect(bStories[0].meta.tier).toBe('B');

    const cStories = registry.getCStories();
    expect(cStories.length).toBe(2); // C-story and looper arc are tier C
  });

  it('should filter by looper class', () => {
    const registry = engine.getRegistry();

    const looperOnly = registry.getLooperOnlyArcs();
    expect(looperOnly.length).toBe(1);
    expect(looperOnly[0].meta.id).toBe('looper-1');
  });

  it('should filter by resolubility', () => {
    const registry = engine.getRegistry();

    const singlePass = registry.getSinglePassArcs();
    expect(singlePass.length).toBe(1);

    const multiPass = registry.getMultiPassArcs();
    expect(multiPass.length).toBe(2);
  });

  it('should sort by importance', () => {
    const registry = engine.getRegistry();
    const sorted = registry.getSortedByImportance();

    // B-tier should come first
    expect(sorted[0].meta.tier).toBe('B');
  });

  it('should query with multiple filters', () => {
    const registry = engine.getRegistry();

    const results = registry.query({
      tier: 'C',
      looperClass: 'LOOPER_ONLY',
    });

    expect(results.length).toBe(1);
    expect(results[0].meta.id).toBe('looper-1');
  });
});

describe('ArcFSM', () => {
  let engine: SideArcEngine;

  beforeEach(() => {
    engine = new SideArcEngine();
    engine.registerArc(createBStoryArc());
  });

  it('should initialize arc states', () => {
    const fsm = engine.getFSM();
    const states = fsm.initializeArcStates();

    expect(states.size).toBe(1);
    expect(states.get('b-story-romance')?.currentStateId).toBe('UNSEEN');
  });

  it('should find available transitions', () => {
    const fsm = engine.getFSM();
    const context = {
      action: 'ENTER',
      timeSlot: '08:00',
      location: 'COFFEE_SHOP',
      knowledgeFlags: new Set<string>(),
      arcMetaLevels: new Map<string, ArcMetaLevel>(),
      otherArcStates: new Map<string, string>(),
    };

    const transitions = fsm.getAvailableTransitions('b-story-romance', 'UNSEEN', context);
    expect(transitions.length).toBe(1);
    expect(transitions[0].to).toBe('NOTICED');
  });

  it('should detect terminal states', () => {
    const fsm = engine.getFSM();

    expect(fsm.isTerminalState('b-story-romance', 'GOOD')).toBe(true);
    expect(fsm.isTerminalState('b-story-romance', 'NOTICED')).toBe(false);
  });

  it('should find paths between states', () => {
    const fsm = engine.getFSM();
    const path = fsm.findPath('b-story-romance', 'UNSEEN', 'GOOD');

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('should check reachability', () => {
    const fsm = engine.getFSM();

    expect(fsm.isReachable('b-story-romance', 'UNSEEN', 'GOOD')).toBe(true);
    expect(fsm.isReachable('b-story-romance', 'GOOD', 'UNSEEN')).toBe(false);
  });
});

describe('ArcLoopMetaManager', () => {
  let engine: SideArcEngine;

  beforeEach(() => {
    engine = new SideArcEngine();
    engine.registerArc(createBStoryArc());
  });

  it('should initialize meta states', () => {
    const crossState = engine.getCrossLoopState();

    expect(crossState.metas.size).toBe(1);
    const meta = crossState.metas.get('b-story-romance');
    expect(meta?.level).toBe('UNTOUCHED');
    expect(meta?.observations).toBe(0);
  });

  it('should promote meta level based on observations', () => {
    // Make several loops
    for (let i = 0; i < 5; i++) {
      engine.initializeLoop(`loop-${i}`);
      engine.stepArcs({ action: 'ENTER', timeSlot: '08:00', location: 'COFFEE_SHOP' });
      engine.finalizeLoop();
    }

    const meta = engine.getCrossLoopState().metas.get('b-story-romance');
    expect(meta?.observations).toBe(5);
    // Should have progressed beyond PATTERN_OBSERVED
  });

  it('should check if arc can be resolved', () => {
    const manager = engine.getMetaManager();
    const meta = engine.getCrossLoopState().metas.get('b-story-romance')!;
    const flags = engine.getCrossLoopState().knowledgeFlags;

    const result = manager.canResolve('b-story-romance', meta, flags);
    // With no flags, should be able to resolve via ONSITE_HEAVY
    expect(result.canResolve).toBe(true);
  });
});

describe('ResolutionModeManager', () => {
  let engine: SideArcEngine;

  beforeEach(() => {
    engine = new SideArcEngine();
    engine.registerArc(createBStoryArc());
    engine.registerArc(createCStoryArc());
  });

  it('should get available modes', () => {
    const manager = engine.getResolutionManager();
    const meta = engine.getCrossLoopState().metas.get('b-story-romance')!;
    const flags = engine.getCrossLoopState().knowledgeFlags;

    const modes = manager.getAvailableModes('b-story-romance', meta, flags);
    expect(modes.length).toBeGreaterThan(0);
    expect(modes).toContain('ONSITE_HEAVY');
  });

  it('should compute resolution costs', () => {
    const manager = engine.getResolutionManager();
    const meta = engine.getCrossLoopState().metas.get('b-story-romance')!;
    const flags = engine.getCrossLoopState().knowledgeFlags;

    const costs = manager.computeResolutionCosts('b-story-romance', meta, flags);
    expect(costs.length).toBeGreaterThan(0);
    expect(costs[0].isOptimal).toBe(true);
  });

  it('should track trivialization progress', () => {
    const manager = engine.getResolutionManager();
    const meta = engine.getCrossLoopState().metas.get('b-story-romance')!;
    const flags = engine.getCrossLoopState().knowledgeFlags;

    const progress = manager.getTrivializationProgress('b-story-romance', meta, flags);
    expect(progress.progressPercent).toBeDefined();
    expect(progress.currentBestMode).toBeDefined();
    expect(progress.optimalMode).toBeDefined();
  });
});
