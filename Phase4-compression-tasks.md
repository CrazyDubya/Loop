# Phase 4: Compression & Equivalence

**Agent**: CompressionSpecialist
**Dependencies**: Phase 1-3 (data, graph, operations)
**Outputs**: Equivalence classes, parametric families, montage system

---

## Overview
This is where a million loops become manageable. Implement the compression "cheats" that collapse vast numbers of loops into coherent groupings.

---

## The Big Insight

> Two loops are equivalent if they yield the same outcome_hash AND the same knowledge_id, even if internal micro-steps differ.

A million loops → thousands of classes.

---

## Tasks

### 4.1 Equivalence Relation
- [ ] Implement `loops_equivalent(L1, L2) → bool`
  - Same outcome_hash
  - Same knowledge_id at end
- [ ] Implement `compute_equivalence_key(loop) → Key`
  - Tuple of (outcome_hash, knowledge_id)
- [ ] Prove transitivity: if A~B and B~C then A~C

### 4.2 Equivalence Class Management
- [ ] Implement `LoopClass` container
  ```
  LoopClass {
    id
    equivalence_key
    outcome_hash
    knowledge_delta      # what's learned
    mood_delta           # emotional effect
    count                # how many loops
    representative_id    # one "canonical" loop
    sample_ids[]         # 3-5 example loops
  }
  ```
- [ ] Implement `assign_to_class(loop) → class_id`
  - Find or create appropriate class
- [ ] Implement `get_class(loop) → LoopClass`
- [ ] Implement class merging (if definitions change)

### 4.3 Parametric Families
- [ ] Define family parameters:
  - StrategyType: brute_force | stealth | persuasion | withdrawal
  - RiskLevel: low | medium | high
  - KeyChoiceBits: important decision flags
- [ ] Implement `LoopFamily` grouping
  ```
  LoopFamily {
    strategy_type
    risk_level
    key_choices_pattern   # wildcards allowed
    typical_outcome
    class_ids[]           # equivalence classes in this family
  }
  ```
- [ ] Auto-detect families from loop distributions

### 4.4 Anchor Loop Selection
- [ ] Define anchor criteria:
  - First in epoch
  - Major breakthrough
  - Catastrophic failure
  - Emotionally significant
  - High narrative value
- [ ] Implement `select_anchors(loops, n=100-300) → anchor_ids`
- [ ] Implement anchor quality scoring
- [ ] Support manual anchor designation

### 4.5 Montage Compression
- [ ] Implement `Montage` structure
  ```
  Montage {
    id
    class_id              # which equivalence class
    count                 # loops compressed
    representative_ids[]  # 1-3 detailed loops
    summary_text          # "347 times, same explosion"
    cumulative_knowledge
    cumulative_mood_effect
  }
  ```
- [ ] Implement `create_montage(class_id) → Montage`
- [ ] Select best representatives for narrative
- [ ] Generate summary statistics

### 4.6 Short Loop Handling
- [ ] Identify early-termination loops
  - Death before key events
  - Rage-quit patterns
  - Time-out loops
- [ ] Implement `ShortLoopCluster`
  - death_time
  - death_cause
  - count
- [ ] Auto-cluster short loops
- [ ] Generate "hundreds died before noon" summaries

### 4.7 Sub-Loop Macros
- [ ] Implement `SubLoopMacro` for repeated segments
  ```
  SubLoopMacro {
    id
    parent_loop_id | class_id
    time_window           # t3-t5
    attempts_count
    success_rate
    best_outcome
    knowledge_gained
    emotional_effect      # frustration, mastery, numbness
  }
  ```
- [ ] Detect repeated sub-loop patterns
- [ ] Compress into macros automatically
- [ ] Generate "spent a month in those eight minutes" text

### 4.8 Compression Statistics
- [ ] Track compression ratio: raw_loops / classes
- [ ] Track family coverage: % loops in families
- [ ] Track anchor coverage: narrative density
- [ ] Generate compression report

---

## Acceptance Criteria

1. Loops correctly grouped into equivalence classes
2. Compression ratio > 100:1 for typical distributions
3. Anchors represent key narrative moments
4. Montages correctly summarize loop clusters
5. Sub-loop macros capture nested hell loops
6. Statistics accurately reflect compression

---

## Compression Examples

### Equivalence Class Example
```
Class #47: "Everyone dies in explosion, learn nothing"
- outcome_hash: 0x3f8a...
- knowledge_delta: none
- count: 2,341 loops
- representative: Loop #12
- samples: [#12, #89, #2044]

Narrative: "Two thousand three hundred attempts ended
the same way. Different streets, different words,
same fireball."
```

### Parametric Family Example
```
Family: Stealth-Medium-SaveSister
- strategy: stealth
- risk: medium
- key_choice[SAVE_SISTER]: true
- typical_outcome: "sister survives, villain escapes"
- classes: [#12, #13, #14, #47, #48]
- total_loops: 4,892
```

---

## Notes for Agent

- Compression is both technical and narrative
- The goal is human-understandable groupings
- Anchors should tell the story's spine
- Montages are the prose vehicle for compression
- Sub-loop macros capture the "infinite retry" feeling

---

## Handoff to Phase 5

Phase 5 (Narrative) will need:
- Equivalence classes with counts
- Anchor loop list
- Montage structures
- Sub-loop macros with emotional tags
