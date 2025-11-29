# Loop Engine Architecture

## Vision
A computational narrative engine capable of tracking, compressing, and generating stories across a million time loops without losing coherence or going insane.

---

## Core Concepts

### 1. The Loop Object
```
Loop {
  id: UUID
  parent_id: UUID | null
  epoch: EpochID           # broad phase of journey
  key_choices: BitVector   # compressed decision vector
  outcome_hash: Hash       # what ultimately changed
  knowledge_id: KnowledgeProfileID
  mood_id: MoodProfileID
  tags: Tag[]
  created_at: Timestamp
}
```

### 2. The Day Graph
The underlying structure all loops traverse:
- **Nodes**: Events or states (e.g., "bank at 10:05", "argument at dinner")
- **Edges**: Possible transitions with conditions
- **Critical Nodes**: Branch points, revelations, deaths
- **Soft Nodes**: Color moments, flavor

### 3. Equivalence Classes
The key compression insight:
```
L1 ~ L2 if:
  Outcome(L1) == Outcome(L2) AND
  KnowledgeEnd(L1) == KnowledgeEnd(L2)
```

A million loops collapse into ~thousands of classes.

### 4. Loop Operators (Protagonist Behaviors)
- `cause(event)` - maximize probability of X occurring
- `avoid(event)` - remove paths to X
- `trigger(sequence)` - force A→B→C chain
- `relive(loop_ref)` - minimize distance to prior loop
- `slightly_change(loop_ref)` - small Hamming distance
- `greatly_change(loop_ref)` - large deviation

### 5. Sub-Loops
Nested rewinds within a single day:
```
SubLoop {
  parent_loop_id: UUID
  start_time: TimeSlot
  end_time: TimeSlot
  attempts_count: int
  best_outcome: OutcomeHash
  knowledge_gained: KnowledgeID
  emotional_effect: MoodDelta
}
```

---

## System Layers

```
┌─────────────────────────────────────────────────┐
│           NARRATIVE LAYER                       │
│  Anchor loops, montages, prose generation       │
├─────────────────────────────────────────────────┤
│           COMPRESSION LAYER                     │
│  Equivalence classes, parametric families       │
├─────────────────────────────────────────────────┤
│           OPERATIONS LAYER                      │
│  Operators, policies, loop mutation             │
├─────────────────────────────────────────────────┤
│           GRAPH LAYER                           │
│  Day graph, events, transitions, time slots     │
├─────────────────────────────────────────────────┤
│           DATA LAYER                            │
│  Loop storage, indexes, queries                 │
└─────────────────────────────────────────────────┘
```

---

## Project Phases

| Phase | Domain | Focus |
|-------|--------|-------|
| 1 | Backend | Data structures, storage, core Loop/SubLoop models |
| 2 | Graph Engine | Day graph, events, transitions, pathfinding |
| 3 | Operations | Loop operators, policies, mutation logic |
| 4 | Compression | Equivalence classes, montages, parametric families |
| 5 | Narrative | Anchor selection, prose generation, epoch structuring |

---

## Agent Roles

Each phase requires specialized agents:

- **DataArchitect**: Schema design, storage optimization
- **GraphEngineer**: Day graph construction, pathfinding
- **LoopOperator**: Operator implementation, policy design
- **CompressionSpecialist**: Equivalence classes, clustering
- **NarrativeWeaver**: Story generation, montage crafting
- **Orchestrator**: Cross-phase coordination, consistency

---

## Key Metrics

- **Loop Count**: Raw number of loops generated
- **Class Count**: Number of equivalence classes
- **Compression Ratio**: Loops / Classes
- **Anchor Density**: Anchor loops / Total loops
- **Knowledge Coverage**: % of discoverable knowledge found
- **Epoch Distribution**: Loops per narrative phase

---

## File Structure
```
/Loop
├── ARCHITECTURE.md          # This file
├── StartHere                 # Original design doc
├── checklists.md            # Master progress tracking
├── agent-roles.md           # Specialist definitions
├── Phase1-backend-tasks.md
├── Phase2-graph-engine-tasks.md
├── Phase3-loop-operations-tasks.md
├── Phase4-compression-tasks.md
├── Phase5-narrative-tasks.md
└── src/                     # Implementation (future)
```
