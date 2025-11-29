# Phase 3: Loop Operations

**Agent**: LoopOperator
**Dependencies**: Phase 1 (data), Phase 2 (graph)
**Outputs**: Operator implementations, policy system, loop mutation

---

## Overview
Implement the six core operators that model protagonist behavior across loops. These transform *intent* into *loop generation*.

---

## The Six Operators

| Operator | Intent | Implementation |
|----------|--------|----------------|
| `cause(X)` | Make X happen | Pathfind to maximize P(X) |
| `avoid(X)` | Prevent X | Pathfind to minimize P(X) |
| `trigger(A→B→C)` | Force sequence | Pathfind through checkpoints |
| `relive(L_ref)` | Repeat loop | Minimize distance to reference |
| `slightly_change(L_ref)` | Small tweak | Small Hamming distance |
| `greatly_change(L_ref)` | Big deviation | Large Hamming distance |

---

## Tasks

### 3.1 Operator: cause(event)
- [ ] Define interface: `cause(target_event) → Loop`
- [ ] Implement path search maximizing target probability
- [ ] Handle impossible targets gracefully
- [ ] Track attempts and partial successes
- [ ] Generate decision vector from successful path

### 3.2 Operator: avoid(event)
- [ ] Define interface: `avoid(target_event) → Loop`
- [ ] Implement path search minimizing target probability
- [ ] Identify "safe" paths through graph
- [ ] Handle unavoidable events (some deaths are fate)
- [ ] Generate decision vector avoiding danger zones

### 3.3 Operator: trigger(sequence)
- [ ] Define interface: `trigger([event1, event2, ...]) → Loop`
- [ ] Implement checkpoint-based pathfinding
- [ ] Validate sequence is achievable (ordering, timing)
- [ ] Handle failed sequences (what if B is impossible after A?)
- [ ] Generate decision vector hitting all checkpoints

### 3.4 Operator: relive(loop_ref)
- [ ] Define interface: `relive(reference_loop_id) → Loop`
- [ ] Implement decision vector matching
- [ ] Allow for "close enough" when exact match impossible
- [ ] Track divergence from reference
- [ ] Useful for verification loops ("does this always happen?")

### 3.5 Operator: slightly_change(loop_ref)
- [ ] Define interface: `slightly_change(ref_id, changes=1-2) → Loop`
- [ ] Implement small Hamming distance mutation
- [ ] Select which decisions to flip strategically
- [ ] Explore local neighborhood of a loop
- [ ] Useful for hypothesis testing

### 3.6 Operator: greatly_change(loop_ref)
- [ ] Define interface: `greatly_change(ref_id) → Loop`
- [ ] Implement large Hamming distance mutation
- [ ] Random or strategic major changes
- [ ] Explore distant regions of decision space
- [ ] Useful for chaos/desperation phases

### 3.7 Decision Vector Operations
- [ ] Implement `hamming_distance(vec1, vec2)`
- [ ] Implement `mutate(vec, n_flips)`
- [ ] Implement `crossover(vec1, vec2)` (combine two loops)
- [ ] Implement `random_vector(constraints)`

### 3.8 Policy System
- [ ] Define `Policy` interface
  - Takes: current knowledge, current mood, epoch
  - Returns: which operator to use, with what parameters
- [ ] Implement basic policies:
  - Naive: random exploration
  - Scientist: systematic cause/avoid testing
  - Desperate: greatly_change spam
  - Perfectionist: relive + slightly_change iteration
  - Obsessive: trigger same sequence repeatedly

### 3.9 Loop Generation Pipeline
- [ ] Implement `generate_loop(policy, knowledge_state)`
  - Policy selects operator
  - Operator produces decision vector
  - Graph engine simulates loop
  - Returns completed Loop object with outcomes
- [ ] Support batch generation (generate N loops with policy)
- [ ] Track generation statistics

---

## Acceptance Criteria

1. Each operator produces valid loops
2. `cause(X)` loops actually achieve X more often
3. `avoid(X)` loops actually avoid X more often
4. `relive` produces near-identical loops
5. Hamming distances are calculated correctly
6. Policies produce characteristic loop distributions

---

## Notes for Agent

- Operators are *heuristics*, not guarantees
- `cause(impossible_event)` should fail gracefully, not crash
- Decision vectors should be comparable across loops
- Policies will drive the "feel" of different epochs
- Think of this as protagonist psychology as code

---

## Handoff to Phase 4

Phase 4 (Compression) will need:
- Loop comparison functions
- Outcome hash computation
- Batch loop generation for clustering experiments
