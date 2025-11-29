# Phase 1: Backend & Data Layer

**Agent**: DataArchitect
**Dependencies**: None (foundational)
**Outputs**: Core data models, storage layer, query interface

---

## Overview
Build the foundational data structures and storage system that all other phases depend on. This is the bedrock.

---

## Tasks

### 1.1 Core Data Models
- [ ] Define `Loop` struct/class with all fields
  - id, parent_id, epoch, key_choices, outcome_hash
  - knowledge_id, mood_id, tags, timestamps
- [ ] Define `SubLoop` struct for nested rewinds
  - parent_loop_id, time window, attempts, outcomes
- [ ] Define `LoopClass` (equivalence class container)
  - class_id, outcome_hash, knowledge_delta, mood_delta
  - count, sample_loop_ids[]
- [ ] Define `KnowledgeProfile` struct
  - id, facts_known[], secrets_discovered[], skills_gained[]
- [ ] Define `MoodProfile` struct
  - id, baseline_emotion, trauma_markers[], resilience_score
- [ ] Define `Tag` enum/system for loop categorization

### 1.2 ID Generation & Hashing
- [ ] Implement UUID generation for loop IDs
- [ ] Implement `outcome_hash` algorithm
  - Must be deterministic: same outcomes = same hash
  - Should capture: who survived, what changed, key state
- [ ] Implement `knowledge_id` derivation
  - Hash of knowledge state for quick comparison
- [ ] Implement decision vector encoding (BitVector)
  - Compact representation of key choices

### 1.3 Storage Layer
- [ ] Choose storage backend (SQLite? JSON files? Custom binary?)
- [ ] Implement loop persistence (save/load)
- [ ] Implement subloop persistence
- [ ] Implement class persistence
- [ ] Design index structures for fast queries:
  - By outcome_hash
  - By epoch
  - By parent_id (lineage)
  - By tags

### 1.4 Query Interface
- [ ] `get_loop(id)` - fetch single loop
- [ ] `get_loops_by_epoch(epoch_id)` - all loops in phase
- [ ] `get_loops_by_outcome(outcome_hash)` - same ending
- [ ] `get_loop_lineage(id)` - trace back through parents
- [ ] `get_class_members(class_id)` - all loops in equivalence class
- [ ] `count_loops_matching(criteria)` - aggregate queries

### 1.5 Validation & Integrity
- [ ] Implement loop validation (required fields, valid refs)
- [ ] Implement parent chain integrity checks
- [ ] Implement epoch ordering validation
- [ ] Create test fixtures with sample loops

---

## Acceptance Criteria

1. Can create, save, and retrieve Loop objects
2. Can create, save, and retrieve SubLoop objects
3. Can group loops into equivalence classes
4. Outcome hashing is deterministic and collision-resistant
5. Queries return correct results with reasonable performance
6. All data survives process restart (persistence works)

---

## Notes for Agent

- Start simple. SQLite or even JSON files are fine initially.
- The outcome_hash is critical - spend time getting it right.
- Key choices should be represented as a bit vector for Hamming distance calculations later.
- Think about scale: eventually millions of loops, but start with hundreds.

---

## Handoff to Phase 2

Phase 2 (Graph Engine) will need:
- Loop creation API
- Ability to set outcome_hash after graph traversal
- Ability to update knowledge_id as events are processed
