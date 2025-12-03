/**
 * Loop Store
 *
 * Manages loops, equivalence classes, and loop-related operations
 */

import { create } from 'zustand';
import type {
  Loop,
  EquivalenceClass,
  KnowledgeState,
  LoopStatus,
  EmotionalState,
  Decision,
  Outcome,
  SubLoop,
  LoopQuery,
} from '@/types';

interface LoopState {
  // Data
  loops: Loop[];
  equivalenceClasses: EquivalenceClass[];
  knowledgeStates: KnowledgeState[];

  // Loading state
  isLoading: boolean;

  // Loop actions
  setLoops: (loops: Loop[]) => void;
  addLoop: (loop: Omit<Loop, 'id' | 'sequence_number' | 'created_at'>) => string;
  updateLoop: (loopId: string, updates: Partial<Loop>) => void;
  removeLoop: (loopId: string) => void;

  // Loop lifecycle
  startLoop: (epochId: string, graphId: string, knowledgeStateId: string, emotionalState: EmotionalState) => string;
  addDecision: (loopId: string, decision: Omit<Decision, 'id'>) => void;
  completeLoop: (loopId: string, outcome: Omit<Outcome, 'id'>, endEmotionalState?: EmotionalState) => void;
  abortLoop: (loopId: string) => void;

  // Sub-loop actions
  addSubLoop: (loopId: string, subLoop: Omit<SubLoop, 'id'>) => void;

  // Equivalence class actions
  setEquivalenceClasses: (classes: EquivalenceClass[]) => void;
  addEquivalenceClass: (equivClass: Omit<EquivalenceClass, 'id' | 'created_at' | 'updated_at'>) => string;
  updateEquivalenceClass: (classId: string, updates: Partial<EquivalenceClass>) => void;
  assignLoopToClass: (loopId: string, classId: string) => void;

  // Knowledge state actions
  setKnowledgeStates: (states: KnowledgeState[]) => void;
  addKnowledgeState: (state: Omit<KnowledgeState, 'id'>) => string;
  updateKnowledgeState: (stateId: string, updates: Partial<KnowledgeState>) => void;

  // Query helpers
  getLoopsByEpoch: (epochId: string) => Loop[];
  getLoopsByStatus: (status: LoopStatus) => Loop[];
  getLoopsByEquivClass: (classId: string) => Loop[];
  getAnchorLoops: () => Loop[];
  getLoopPath: (loopId: string) => string[];

  // Statistics
  getLoopStats: () => LoopStats;
}

interface LoopStats {
  total: number;
  completed: number;
  inProgress: number;
  aborted: number;
  byOutcomeType: Record<string, number>;
  byEpoch: Record<string, number>;
  averageDecisions: number;
  anchorCount: number;
  equivalenceClassCount: number;
}

export const useLoopStore = create<LoopState>()((set, get) => ({
  // State
  loops: [],
  equivalenceClasses: [],
  knowledgeStates: [],
  isLoading: false,

  // Loop actions
  setLoops: (loops) => set({ loops }),

  addLoop: (loopData) => {
    const { loops } = get();
    const loopId = crypto.randomUUID();
    const sequenceNumber = loops.length > 0
      ? Math.max(...loops.map((l) => l.sequence_number)) + 1
      : 1;

    const loop: Loop = {
      ...loopData,
      id: loopId,
      sequence_number: sequenceNumber,
      created_at: new Date().toISOString(),
    };

    set({ loops: [...loops, loop] });
    return loopId;
  },

  updateLoop: (loopId, updates) => {
    set((state) => ({
      loops: state.loops.map((loop) =>
        loop.id === loopId ? { ...loop, ...updates } : loop
      ),
    }));
  },

  removeLoop: (loopId) => {
    set((state) => ({
      loops: state.loops.filter((loop) => loop.id !== loopId),
    }));
  },

  // Loop lifecycle
  startLoop: (epochId, graphId, knowledgeStateId, emotionalState) => {
    const { addLoop } = get();
    const now = new Date().toISOString();

    return addLoop({
      epoch_id: epochId,
      graph_id: graphId,
      status: 'in_progress',
      started_at: now,
      knowledge_state_start_id: knowledgeStateId,
      emotional_state_start: emotionalState,
      decisions: [],
      decision_vector: [],
      outcome: {
        id: '',
        type: 'death', // Placeholder, will be set on completion
        terminal_node_id: '',
        timestamp: now,
      },
      is_anchor: false,
      tags: [],
    });
  },

  addDecision: (loopId, decisionData) => {
    const decision: Decision = {
      ...decisionData,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      loops: state.loops.map((loop) => {
        if (loop.id !== loopId) return loop;
        return {
          ...loop,
          decisions: [...loop.decisions, decision],
          decision_vector: [...loop.decision_vector, decisionData.choice_index],
        };
      }),
    }));
  },

  completeLoop: (loopId, outcomeData, endEmotionalState) => {
    const outcome: Outcome = {
      ...outcomeData,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      loops: state.loops.map((loop) => {
        if (loop.id !== loopId) return loop;
        return {
          ...loop,
          status: 'completed',
          ended_at: new Date().toISOString(),
          outcome,
          emotional_state_end: endEmotionalState ?? loop.emotional_state_start,
        };
      }),
    }));
  },

  abortLoop: (loopId) => {
    set((state) => ({
      loops: state.loops.map((loop) => {
        if (loop.id !== loopId) return loop;
        return {
          ...loop,
          status: 'aborted',
          ended_at: new Date().toISOString(),
        };
      }),
    }));
  },

  // Sub-loop actions
  addSubLoop: (loopId, subLoopData) => {
    const subLoop: SubLoop = {
      ...subLoopData,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      loops: state.loops.map((loop) => {
        if (loop.id !== loopId) return loop;
        return {
          ...loop,
          sub_loops: [...(loop.sub_loops ?? []), subLoop],
        };
      }),
    }));
  },

  // Equivalence class actions
  setEquivalenceClasses: (classes) => set({ equivalenceClasses: classes }),

  addEquivalenceClass: (classData) => {
    const classId = crypto.randomUUID();
    const now = new Date().toISOString();

    const equivClass: EquivalenceClass = {
      ...classData,
      id: classId,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      equivalenceClasses: [...state.equivalenceClasses, equivClass],
    }));

    return classId;
  },

  updateEquivalenceClass: (classId, updates) => {
    set((state) => ({
      equivalenceClasses: state.equivalenceClasses.map((ec) =>
        ec.id === classId
          ? { ...ec, ...updates, updated_at: new Date().toISOString() }
          : ec
      ),
    }));
  },

  assignLoopToClass: (loopId, classId) => {
    set((state) => ({
      loops: state.loops.map((loop) =>
        loop.id === loopId ? { ...loop, equivalence_class_id: classId } : loop
      ),
      equivalenceClasses: state.equivalenceClasses.map((ec) => {
        if (ec.id !== classId) return ec;
        return {
          ...ec,
          member_count: ec.member_count + 1,
          updated_at: new Date().toISOString(),
        };
      }),
    }));
  },

  // Knowledge state actions
  setKnowledgeStates: (states) => set({ knowledgeStates: states }),

  addKnowledgeState: (stateData) => {
    const stateId = crypto.randomUUID();
    const state: KnowledgeState = { ...stateData, id: stateId };
    set((s) => ({ knowledgeStates: [...s.knowledgeStates, state] }));
    return stateId;
  },

  updateKnowledgeState: (stateId, updates) => {
    set((state) => ({
      knowledgeStates: state.knowledgeStates.map((ks) =>
        ks.id === stateId ? { ...ks, ...updates } : ks
      ),
    }));
  },

  // Query helpers
  getLoopsByEpoch: (epochId) => {
    return get().loops.filter((loop) => loop.epoch_id === epochId);
  },

  getLoopsByStatus: (status) => {
    return get().loops.filter((loop) => loop.status === status);
  },

  getLoopsByEquivClass: (classId) => {
    return get().loops.filter((loop) => loop.equivalence_class_id === classId);
  },

  getAnchorLoops: () => {
    return get().loops.filter((loop) => loop.is_anchor);
  },

  getLoopPath: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    return loop?.path ?? [];
  },

  // Statistics
  getLoopStats: () => {
    const { loops, equivalenceClasses } = get();

    const byOutcomeType: Record<string, number> = {};
    const byEpoch: Record<string, number> = {};
    let totalDecisions = 0;

    for (const loop of loops) {
      // Outcome type
      const outcomeType = loop.outcome.type;
      byOutcomeType[outcomeType] = (byOutcomeType[outcomeType] ?? 0) + 1;

      // Epoch
      byEpoch[loop.epoch_id] = (byEpoch[loop.epoch_id] ?? 0) + 1;

      // Decisions
      totalDecisions += loop.decisions.length;
    }

    return {
      total: loops.length,
      completed: loops.filter((l) => l.status === 'completed').length,
      inProgress: loops.filter((l) => l.status === 'in_progress').length,
      aborted: loops.filter((l) => l.status === 'aborted').length,
      byOutcomeType,
      byEpoch,
      averageDecisions: loops.length > 0 ? totalDecisions / loops.length : 0,
      anchorCount: loops.filter((l) => l.is_anchor).length,
      equivalenceClassCount: equivalenceClasses.length,
    };
  },
}));
