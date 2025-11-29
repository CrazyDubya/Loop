# Phase 2: Graph Engine

**Agent**: GraphEngineer
**Dependencies**: Phase 1 (data models)
**Outputs**: Day graph system, event nodes, pathfinding

---

## Overview
Build the "day graph" - the underlying world structure that all loops traverse. Events as nodes, transitions as edges, time as a constraint.

---

## Tasks

### 2.1 Time System
- [ ] Define `TimeSlot` type (t0, t1, t2, ... tN)
- [ ] Implement time slot arithmetic (duration, ordering)
- [ ] Define day boundaries (when does reset happen?)
- [ ] Implement time constraints for edges

### 2.2 Event Node System
- [ ] Define `EventNode` struct
  - id, name, description
  - time_slot (when can this happen)
  - node_type: Critical | Soft | Death | Revelation
  - preconditions (what must be true to enter)
  - effects (what changes when this happens)
- [ ] Implement node creation and validation
- [ ] Create taxonomy of event types:
  - Location events ("at bank", "at home")
  - Interaction events ("talk to X", "fight Y")
  - Discovery events ("learn secret", "find item")
  - Death events (loop terminators)

### 2.3 Edge System
- [ ] Define `Transition` struct
  - from_node, to_node
  - time_cost (how many slots consumed)
  - conditions (knowledge required, items needed)
  - probability (some transitions are uncertain)
- [ ] Implement edge creation and validation
- [ ] Support conditional edges (only available if X is known)
- [ ] Support probabilistic outcomes

### 2.4 Graph Construction
- [ ] Implement `DayGraph` container
- [ ] Add/remove nodes
- [ ] Add/remove edges
- [ ] Validate graph integrity (no orphans, time consistency)
- [ ] Serialize/deserialize graph to storage

### 2.5 World State
- [ ] Define `WorldState` at each time slot
  - Who is where
  - What has happened
  - What is known
- [ ] Implement state transitions based on events
- [ ] Track state diffs efficiently

### 2.6 Pathfinding & Traversal
- [ ] Implement `find_paths(start, goal, constraints)`
  - Given start state, find ways to reach goal event
- [ ] Implement `simulate_loop(decisions)`
  - Walk the graph with given choices, return outcome
- [ ] Implement `valid_choices(state, time)`
  - What can protagonist do right now?
- [ ] Implement path feasibility checking

### 2.7 Graph Analysis Tools
- [ ] Identify critical nodes (high connectivity, required for goals)
- [ ] Identify choke points (unavoidable for certain outcomes)
- [ ] Calculate reachability maps (what's achievable from here?)
- [ ] Export graph for visualization

---

## Acceptance Criteria

1. Can define a day with 20-60 event nodes
2. Can connect events with valid transitions
3. Can traverse graph with a decision sequence
4. Traversal correctly updates world state
5. Pathfinding finds valid routes to goals
6. Graph can be saved and reloaded

---

## Sample Day Graph Sketch

```
t0: Wake up
    ├─→ t1: Go to bank
    │       ├─→ t3: Robbery starts (CRITICAL)
    │       └─→ t2: Meet contact
    └─→ t1: Stay home
            └─→ t2: Phone rings (REVELATION)
                    └─→ t3: Learn about sister

t3: Robbery OR home path converge...
    ├─→ t4: Explosion (DEATH node)
    └─→ t4: Escape via back door
            └─→ t5: Chase scene...
```

---

## Notes for Agent

- The graph represents *possibility space*, not a single story
- Critical nodes are where the million loops diverge
- Soft nodes are flavor - they affect mood/texture but not outcomes
- Death nodes are absorbing states that end the loop
- Time must always move forward (no cycles within a single loop)

---

## Handoff to Phase 3

Phase 3 (Loop Operations) will need:
- Pathfinding API to implement operators
- State simulation to calculate outcomes
- Node queries (find all death nodes, etc.)
