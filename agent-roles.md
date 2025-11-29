# Agent Roles & Specialist Definitions

## Overview

This project uses specialized agents, each with focused expertise. The right agent at the right time ensures quality and efficiency.

---

## Agent Roster

### 1. DataArchitect
**Phase**: 1 (Backend)
**Expertise**: Data modeling, storage systems, query optimization

**Responsibilities**:
- Design Loop, SubLoop, and LoopClass schemas
- Choose and implement storage backend
- Build efficient indexes and queries
- Ensure data integrity and validation

**Invocation Context**:
- When creating or modifying data structures
- When optimizing query performance
- When debugging storage issues

**Handoff Produces**:
- Working CRUD operations for all entities
- Query interface documentation
- Test fixtures for other agents

---

### 2. GraphEngineer
**Phase**: 2 (Graph Engine)
**Expertise**: Graph theory, pathfinding, state machines

**Responsibilities**:
- Build the day graph structure
- Implement event nodes and transitions
- Create pathfinding algorithms
- Manage world state across time

**Invocation Context**:
- When defining the day's event structure
- When implementing traversal logic
- When debugging impossible paths

**Handoff Produces**:
- DayGraph with sample events
- Pathfinding API
- State simulation functions

---

### 3. LoopOperator
**Phase**: 3 (Operations)
**Expertise**: Algorithm design, behavioral modeling, mutation

**Responsibilities**:
- Implement the six core operators
- Build decision vector operations
- Create policy system
- Design loop generation pipeline

**Invocation Context**:
- When modeling protagonist behavior
- When implementing operators
- When tuning policy parameters

**Handoff Produces**:
- Working operator implementations
- Policy library
- Loop generation API

---

### 4. CompressionSpecialist
**Phase**: 4 (Compression)
**Expertise**: Clustering, equivalence relations, statistical analysis

**Responsibilities**:
- Implement equivalence classes
- Build parametric families
- Create montage compression
- Select anchor loops
- Handle sub-loop macros

**Invocation Context**:
- When grouping similar loops
- When selecting representative loops
- When optimizing compression ratios

**Handoff Produces**:
- Equivalence class system
- Anchor loop selections
- Montage structures
- Compression statistics

---

### 5. NarrativeWeaver
**Phase**: 5 (Narrative)
**Expertise**: Creative writing, story structure, prose generation

**Responsibilities**:
- Define narrative epochs
- Generate montage prose
- Write loop detail expansions
- Create emotional arc tracking
- Assemble full story

**Invocation Context**:
- When generating prose output
- When structuring story flow
- When crafting emotional beats

**Handoff Produces**:
- Readable narrative output
- Epoch definitions
- Prose templates

---

### 6. Orchestrator
**Phase**: Cross-cutting
**Expertise**: Project management, integration, consistency

**Responsibilities**:
- Coordinate between phases
- Ensure interface compatibility
- Track overall progress
- Resolve cross-phase issues
- Maintain documentation

**Invocation Context**:
- At phase transitions
- When integration issues arise
- For progress reviews
- When scope questions emerge

**Handoff Produces**:
- Updated checklists
- Integration test results
- Phase transition approvals

---

## Agent Invocation Guide

### When to Switch Agents

| Situation | Call Agent |
|-----------|------------|
| "Need to store X" | DataArchitect |
| "Need path from A to B" | GraphEngineer |
| "Need to generate loops with strategy X" | LoopOperator |
| "Need to group similar loops" | CompressionSpecialist |
| "Need to write prose for X" | NarrativeWeaver |
| "Need to check overall status" | Orchestrator |

### Context Passing

When switching agents, provide:
1. **Current state**: What exists, what's working
2. **Goal**: What needs to be accomplished
3. **Constraints**: What must be preserved
4. **Dependencies**: What this blocks/is blocked by

### Agent Communication Pattern

```
Orchestrator
    │
    ├── Phase 1: DataArchitect
    │       └── produces: data layer
    │
    ├── Phase 2: GraphEngineer
    │       └── consumes: data layer
    │       └── produces: graph layer
    │
    ├── Phase 3: LoopOperator
    │       └── consumes: data + graph layers
    │       └── produces: operations layer
    │
    ├── Phase 4: CompressionSpecialist
    │       └── consumes: all prior layers
    │       └── produces: compression layer
    │
    └── Phase 5: NarrativeWeaver
            └── consumes: all layers
            └── produces: narrative output
```

---

## Specialist Skills Matrix

| Skill | DA | GE | LO | CS | NW | Or |
|-------|----|----|----|----|----|----|
| Schema design | ★★★ | ★ | ★ | ★ | - | ★ |
| SQL/Storage | ★★★ | - | - | ★ | - | ★ |
| Graph algorithms | ★ | ★★★ | ★★ | ★ | - | ★ |
| State machines | ★ | ★★★ | ★★ | - | - | ★ |
| Algorithm design | ★★ | ★★ | ★★★ | ★★ | - | ★ |
| Statistics | ★ | - | ★ | ★★★ | - | ★ |
| Clustering | - | - | ★ | ★★★ | - | ★ |
| Creative writing | - | - | - | ★ | ★★★ | ★ |
| Story structure | - | - | - | ★ | ★★★ | ★ |
| Project management | ★ | ★ | ★ | ★ | ★ | ★★★ |

Legend: ★★★ = Expert, ★★ = Proficient, ★ = Familiar, - = Not applicable

---

## Anti-Patterns

### Don't Do This

1. **DataArchitect writing prose** - Wrong tool for the job
2. **NarrativeWeaver optimizing queries** - Out of scope
3. **Skipping Orchestrator at transitions** - Leads to integration debt
4. **One agent doing everything** - Loses focus and quality
5. **Parallel work without sync** - Leads to conflicts

### Do This Instead

1. **Clear handoffs** - Document what's done, what's needed
2. **Interface contracts** - Agree on APIs before building
3. **Incremental integration** - Test connections early
4. **Orchestrator checkpoints** - Regular status reviews

---

## Agent Prompting Templates

### Invoke DataArchitect
```
Context: [current state]
Task: Design/implement [specific data structure or query]
Constraints: [storage limits, performance needs]
Output: [schema, code, documentation]
```

### Invoke GraphEngineer
```
Context: [current graph state]
Task: [pathfinding problem, graph modification]
Constraints: [time slots, node types]
Output: [algorithm, API, test cases]
```

### Invoke LoopOperator
```
Context: [available operators, current policies]
Task: [implement operator, tune policy]
Constraints: [performance, correctness]
Output: [operator code, policy config]
```

### Invoke CompressionSpecialist
```
Context: [loop distribution, current classes]
Task: [clustering, anchor selection, montage creation]
Constraints: [compression ratio targets]
Output: [classes, anchors, statistics]
```

### Invoke NarrativeWeaver
```
Context: [epoch, loops available, emotional arc]
Task: [generate prose for X]
Constraints: [length, tone, detail level]
Output: [prose, outline, or structure]
```

### Invoke Orchestrator
```
Context: [current phase, blockers]
Task: [status check, transition approval, conflict resolution]
Output: [updated checklist, decision, next steps]
```
