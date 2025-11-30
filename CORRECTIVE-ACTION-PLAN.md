# Corrective Action Plan: Loop Engine

**Created:** 2025-11-30
**Purpose:** Transform vague design doc into working system
**Approach:** Phased implementation with concrete deliverables

---

## Guiding Principles

1. **No prose without code** - Every concept must have implementation
2. **Schema first** - Define data structures before behaviors
3. **Test as you go** - No phase complete without validation
4. **Honest scope** - Stop pretending about "a million loops"

---

# Phase 1: Foundation (Data Layer)

**Goal:** Establish concrete, consistent data structures

## Tasks

### 1.1 Unified Loop Schema
- [ ] Create `/schemas/loop.schema.json` with JSON Schema
- [ ] Reconcile the two conflicting Loop definitions into ONE canonical structure
- [ ] Define required vs optional fields
- [ ] Add field types, constraints, and validation rules

**Deliverable:** `loop.schema.json`

```
Required fields:
- id: string (UUID)
- parent_id: string | null
- epoch_id: string (FK to epochs)
- created_at: timestamp
- decision_vector: array of decision objects
- outcome: outcome object (not just a hash)
- knowledge_state_start: string (FK)
- knowledge_state_end: string (FK)
- emotional_state: enum
- tags: array of strings
- status: enum (complete, aborted, in_progress)
```

### 1.2 Day Graph Schema
- [ ] Create `/schemas/day-graph.schema.json`
- [ ] Define Node structure (id, type, time_slot, description, critical flag)
- [ ] Define Edge structure (source, target, weight, conditions)
- [ ] Define Graph container (nodes, edges, metadata)

**Deliverable:** `day-graph.schema.json`

### 1.3 Supporting Schemas
- [ ] `/schemas/epoch.schema.json` - Phases of the looper's journey
- [ ] `/schemas/knowledge-state.schema.json` - What the character knows
- [ ] `/schemas/decision.schema.json` - Individual choice structure
- [ ] `/schemas/outcome.schema.json` - Result structure (not just hash)
- [ ] `/schemas/equivalence-class.schema.json` - Loop groupings
- [ ] `/schemas/sub-loop.schema.json` - Nested loop segments

### 1.4 Schema Validation
- [ ] Create `/src/validators/` directory
- [ ] Implement schema validation functions
- [ ] Write tests for all schemas

**Phase 1 Exit Criteria:**
- All schemas defined and documented
- Validation functions working
- 100% test coverage on validators
- No ambiguity in data structures

---

# Phase 2: Graph Engine

**Goal:** Make the "day graph" real and traversable

## Tasks

### 2.1 Graph Data Structure
- [ ] Create `/src/graph/DayGraph.ts` class
- [ ] Implement node management (add, remove, get, query)
- [ ] Implement edge management (add, remove, get, query)
- [ ] Add graph serialization/deserialization (JSON, YAML)

### 2.2 Graph Operations
- [ ] Implement path finding (A*, Dijkstra)
- [ ] Implement reachability analysis (can X lead to Y?)
- [ ] Implement critical path detection
- [ ] Implement subgraph extraction

### 2.3 Graph Validation
- [ ] Validate graph is DAG where required (time flows forward)
- [ ] Validate all nodes are reachable from start
- [ ] Validate no orphan edges
- [ ] Detect cycles and report them

### 2.4 Graph Visualization (Optional but useful)
- [ ] Export to DOT format for Graphviz
- [ ] Export to Mermaid format for docs
- [ ] Basic ASCII visualization for CLI

**Phase 2 Exit Criteria:**
- DayGraph class fully functional
- All graph operations tested
- Sample graph created and visualized
- Performance benchmarks established

---

# Phase 3: Loop Management

**Goal:** Create, store, query, and relate loops

## Tasks

### 3.1 Loop Storage
- [ ] Create `/src/storage/LoopStore.ts` interface
- [ ] Implement in-memory store for development
- [ ] Implement SQLite store for persistence
- [ ] Define indexing strategy (by epoch, outcome, knowledge state)

### 3.2 Loop Creation
- [ ] Create `/src/loop/LoopFactory.ts`
- [ ] Implement `createLoop(parent, decisions)` function
- [ ] Validate loop against schema on creation
- [ ] Auto-generate IDs, timestamps

### 3.3 Loop Queries
- [ ] Query by epoch
- [ ] Query by outcome
- [ ] Query by tag
- [ ] Query by knowledge delta
- [ ] Query by parent chain (ancestry)
- [ ] Full-text search on decision descriptions

### 3.4 Equivalence Classes
- [ ] Create `/src/loop/EquivalenceEngine.ts`
- [ ] Implement equivalence detection algorithm
- [ ] Auto-assign loops to classes on creation
- [ ] Merge/split classes when definitions change
- [ ] Track class counts and representative loops

### 3.5 Loop Relationships
- [ ] Parent-child relationships
- [ ] Equivalence class membership
- [ ] "Similar to" soft relationships
- [ ] Causal chain tracking

**Phase 3 Exit Criteria:**
- CRUD operations for loops working
- Query system functional
- Equivalence classes auto-computed
- 1000-loop stress test passing

---

# Phase 4: Operators & Policies

**Goal:** Implement the cause/avoid/trigger/relive operators for real

## Tasks

### 4.1 Operator Framework
- [ ] Create `/src/operators/Operator.ts` base interface
- [ ] Define operator input/output contracts
- [ ] Create operator registry

### 4.2 Core Operators
- [ ] `cause(event)` - Find/generate paths that maximize P(event)
  - Uses graph traversal + probability weights
  - Returns ranked list of decision vectors
- [ ] `avoid(event)` - Find/generate paths that minimize P(event)
  - Inverse of cause
  - May report "impossible to avoid" cases
- [ ] `trigger(sequence)` - Find paths through specific nodes in order
  - Constraint satisfaction problem
  - Returns valid orderings or "impossible"
- [ ] `relive(loop_ref)` - Generate loop minimizing distance from reference
  - Requires distance metric on decision space
- [ ] `vary(loop_ref, magnitude)` - Generate loop at specified distance
  - magnitude: small | medium | large
  - Uses Hamming distance on decision vector

### 4.3 Policy System
- [ ] Create `/src/policies/Policy.ts`
- [ ] Policies combine operators with goals
- [ ] Support policy phases (first 100 loops: explore, next 500: exploit)
- [ ] Policy transitions based on knowledge state

### 4.4 Probability Model
- [ ] Define how event probabilities are calculated
- [ ] Edge weights contribute to path probability
- [ ] Decision choices affect downstream probabilities
- [ ] Document all assumptions

**Phase 4 Exit Criteria:**
- All operators implemented and tested
- Probability model documented and validated
- Policy system working
- Integration tests with graph + loop store

---

# Phase 5: Consistency & Validation

**Goal:** Make sure the system can't produce nonsense

## Tasks

### 5.1 Invariant System
- [ ] Create `/src/validation/Invariants.ts`
- [ ] Define core invariants:
  - Knowledge is monotonic (or explicitly decremented)
  - Outcomes are reachable from decisions
  - Time flows forward within a loop
  - Sub-loops don't exceed parent bounds

### 5.2 Contradiction Detection
- [ ] Detect when knowledge states contradict
- [ ] Detect when outcomes are impossible given graph
- [ ] Detect when equivalence classes have inconsistent members

### 5.3 Consistency Checker
- [ ] Create `/src/validation/ConsistencyChecker.ts`
- [ ] Run on demand
- [ ] Run automatically on loop creation
- [ ] Generate detailed error reports

### 5.4 Repair Suggestions
- [ ] When inconsistency found, suggest fixes
- [ ] "Loop X claims outcome Y but decisions don't support it"
- [ ] "Knowledge state Z contradicts state W from same class"

**Phase 5 Exit Criteria:**
- Invariant violations caught before persistence
- Contradiction detection working
- Repair suggestions useful
- No silent data corruption possible

---

# Phase 6: Narrative Bridge

**Goal:** Connect loop data to actual story output

## Tasks

### 6.1 Template System
- [ ] Create `/src/narrative/TemplateEngine.ts`
- [ ] Define template format for loop descriptions
- [ ] Support variable interpolation
- [ ] Support conditional sections

### 6.2 Montage Generator
- [ ] Create `/src/narrative/MontageGenerator.ts`
- [ ] Input: equivalence class with N loops
- [ ] Output: prose summarizing the class
- [ ] Configurable detail level (terse, normal, verbose)

### 6.3 Loop Narrator
- [ ] Create `/src/narrative/LoopNarrator.ts`
- [ ] Input: single loop
- [ ] Output: prose describing that loop
- [ ] Uses graph nodes for scene details

### 6.4 Epoch Summarizer
- [ ] Create `/src/narrative/EpochSummarizer.ts`
- [ ] Input: epoch with all its loops
- [ ] Output: chapter-level summary
- [ ] Highlights anchor loops, references montages

### 6.5 Tone/Style Configuration
- [ ] Per-epoch tone settings
- [ ] Character voice parameters
- [ ] Pacing preferences

**Phase 6 Exit Criteria:**
- Templates working
- Montage generation produces readable prose
- Single loop narration working
- Epoch summaries coherent

---

# Phase 7: Tooling & Workflow

**Goal:** Make the system usable by humans

## Tasks

### 7.1 CLI Tool
- [ ] Create `/src/cli/loop-cli.ts`
- [ ] Commands:
  - `loop init` - Create new project
  - `loop graph create/edit/visualize`
  - `loop add` - Add a new loop
  - `loop query` - Search loops
  - `loop validate` - Run consistency checks
  - `loop narrate` - Generate prose
  - `loop export` - Export to various formats

### 7.2 Graph Editor
- [ ] Simple TUI for editing day graphs
- [ ] Or: well-documented JSON/YAML format with examples

### 7.3 Loop Browser
- [ ] TUI for browsing loops
- [ ] Filter, sort, inspect
- [ ] View relationships

### 7.4 Documentation
- [ ] User guide
- [ ] API reference
- [ ] Tutorial: "Your first 100 loops"
- [ ] Examples directory

**Phase 7 Exit Criteria:**
- CLI functional for all core operations
- Documentation complete
- Tutorial tested by fresh user

---

# Phase 8: Scaling & Performance

**Goal:** Handle realistic workloads (NOT "a million loops" - be honest)

## Tasks

### 8.1 Performance Analysis
- [ ] Benchmark current implementation
- [ ] Identify bottlenecks
- [ ] Set realistic targets (10K loops? 50K? 100K?)

### 8.2 Optimization
- [ ] Index optimization for common queries
- [ ] Caching for equivalence class computation
- [ ] Lazy loading for large datasets

### 8.3 Storage Scaling
- [ ] Evaluate PostgreSQL for larger datasets
- [ ] Consider graph database for complex queries
- [ ] Document storage recommendations by scale

### 8.4 Honest Limits
- [ ] Document actual limits of the system
- [ ] Provide guidance on when to shard/split
- [ ] No more "million loop" fantasy

**Phase 8 Exit Criteria:**
- Performance benchmarks documented
- Optimization applied
- Honest capacity documented
- Scaling guidance written

---

# File Structure (Target)

```
/Loop
├── schemas/
│   ├── loop.schema.json
│   ├── day-graph.schema.json
│   ├── epoch.schema.json
│   ├── knowledge-state.schema.json
│   ├── decision.schema.json
│   ├── outcome.schema.json
│   ├── equivalence-class.schema.json
│   └── sub-loop.schema.json
├── src/
│   ├── graph/
│   │   ├── DayGraph.ts
│   │   ├── Node.ts
│   │   ├── Edge.ts
│   │   └── PathFinder.ts
│   ├── loop/
│   │   ├── Loop.ts
│   │   ├── LoopFactory.ts
│   │   ├── EquivalenceEngine.ts
│   │   └── SubLoop.ts
│   ├── storage/
│   │   ├── LoopStore.ts
│   │   ├── MemoryStore.ts
│   │   └── SQLiteStore.ts
│   ├── operators/
│   │   ├── Operator.ts
│   │   ├── CauseOperator.ts
│   │   ├── AvoidOperator.ts
│   │   ├── TriggerOperator.ts
│   │   ├── ReliveOperator.ts
│   │   └── VaryOperator.ts
│   ├── policies/
│   │   ├── Policy.ts
│   │   └── PolicyEngine.ts
│   ├── validation/
│   │   ├── SchemaValidator.ts
│   │   ├── Invariants.ts
│   │   └── ConsistencyChecker.ts
│   ├── narrative/
│   │   ├── TemplateEngine.ts
│   │   ├── MontageGenerator.ts
│   │   ├── LoopNarrator.ts
│   │   └── EpochSummarizer.ts
│   └── cli/
│       └── loop-cli.ts
├── tests/
│   ├── schemas/
│   ├── graph/
│   ├── loop/
│   ├── operators/
│   ├── validation/
│   └── narrative/
├── docs/
│   ├── user-guide.md
│   ├── api-reference.md
│   └── tutorial.md
├── examples/
│   ├── simple-day/
│   └── complex-story/
├── CRITIQUE-StartHere.md
├── CORRECTIVE-ACTION-PLAN.md
└── StartHere (original - archive)
```

---

# Phase Checklist Files

Each phase should have its own tracking file:

- [ ] `Phase1-Foundation-Tasks.md`
- [ ] `Phase2-Graph-Tasks.md`
- [ ] `Phase3-LoopManagement-Tasks.md`
- [ ] `Phase4-Operators-Tasks.md`
- [ ] `Phase5-Validation-Tasks.md`
- [ ] `Phase6-Narrative-Tasks.md`
- [ ] `Phase7-Tooling-Tasks.md`
- [ ] `Phase8-Scaling-Tasks.md`

---

# Success Metrics

| Phase | Metric |
|-------|--------|
| 1 | All schemas validate, 100% test coverage |
| 2 | Graph ops < 10ms for 1000 nodes |
| 3 | 1000 loops CRUD in < 1s |
| 4 | All operators produce valid results |
| 5 | Zero consistency violations possible |
| 6 | Generated prose is grammatically correct |
| 7 | New user completes tutorial in < 30min |
| 8 | Documented, honest capacity limits |

---

# What This Plan Does NOT Include

Being honest about scope:

1. **AI/ML generation** - No automatic loop generation from prompts
2. **Natural language queries** - CLI and structured queries only
3. **Collaboration features** - Single-user system initially
4. **Cloud deployment** - Local-first
5. **GUI** - CLI/TUI only

These can be Phase 9+ if the foundation is solid.

---

# Next Action

**Start Phase 1 immediately:**

1. Create `/schemas/` directory
2. Write `loop.schema.json` with unified, unambiguous structure
3. Write validation tests
4. Iterate until schema is tight

No more hand-waving. No more "imagine." Build it or don't.
