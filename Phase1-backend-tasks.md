# Phase 1: Backend Tasks

Setting up the tracking infrastructure for your loop story.

## Overview

Before writing prose, establish the data layer. This phase creates the foundation that makes a million loops tractable.

---

## Task 1: Define Your Day Graph

**Priority:** CRITICAL
**Effort:** 2-4 hours
**Output:** Event list + relationship map

### Steps:
- [ ] Establish loop boundaries (start time, end time, reset trigger)
- [ ] Brainstorm 50-100 possible events
- [ ] Classify each event (critical/gating/color/background/absorbing)
- [ ] Map relationships (enables/prevents/requires)
- [ ] Identify absorbing states (deaths, victories, timeouts)
- [ ] Validate: no orphan events, at least one success path exists

### Deliverable:
Day Graph Event Sheet (see Section 15.3 of StartHere)

---

## Task 2: Define Key Choices

**Priority:** HIGH
**Effort:** 1-2 hours
**Output:** Decision vector schema

### Steps:
- [ ] Identify 5-8 critical binary choices
- [ ] Assign letter codes (A, B, C, D, E...)
- [ ] Document what each choice means
- [ ] Note which choices are independent vs. dependent
- [ ] Create example decision vectors

### Deliverable:
```
KEY CHOICES FOR [YOUR STORY]:
A = [choice description] (0/1)
B = [choice description] (0/1)
...
```

---

## Task 3: Define Epochs

**Priority:** HIGH
**Effort:** 2-3 hours
**Output:** 4-7 epoch definitions

### Steps:
- [ ] Sketch psychological arc (start → worst point → resolution)
- [ ] Define epoch names and loop ranges
- [ ] For each epoch, specify:
  - [ ] Dominant strategy
  - [ ] Dominant outcomes
  - [ ] Knowledge gained
  - [ ] Emotional state
  - [ ] Fatigue state
- [ ] Estimate loop counts per epoch (should sum to ~1,000,000)

### Deliverable:
Epoch Planning Sheets (see Section 15.4 of StartHere)

---

## Task 4: Design Absorbing States

**Priority:** MEDIUM
**Effort:** 1-2 hours
**Output:** Absorbing state registry

### Steps:
- [ ] List all ways the loop can end
- [ ] Categorize: death / success / partial / timeout
- [ ] For each, note:
  - [ ] Time slot when it occurs
  - [ ] Trigger conditions
  - [ ] Whether knowledge can be gained
  - [ ] Estimated frequency
- [ ] Assign state IDs (A01, A02, ...)

### Deliverable:
```
ABSORBING STATES:
A01: [description] - [type] - [time] - [frequency estimate]
A02: ...
```

---

## Task 5: Create Knowledge Taxonomy

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Output:** Knowledge state progression

### Steps:
- [ ] List all learnable facts
- [ ] List all acquirable skills
- [ ] Note dependencies (fact B requires fact A)
- [ ] Define knowledge milestones (K_000 baseline → K_100 partial → K_200 complete)
- [ ] Document which events grant which knowledge

### Deliverable:
Knowledge progression map + Knowledge State definitions

---

## Task 6: Set Up Tracking Sheets

**Priority:** HIGH
**Effort:** 1-2 hours
**Output:** Empty tracking infrastructure

### Steps:
- [ ] Create Master Loop Tracking Sheet
- [ ] Create Equivalence Class Sheet
- [ ] Create Day Graph Event Sheet (populate from Task 1)
- [ ] Create Sub-Loop Macro Sheet
- [ ] Create Epoch Planning Sheets (populate from Task 3)

### Deliverable:
Spreadsheet or database with all required tables

---

## Task 7: Design First 10 Anchors

**Priority:** HIGH
**Effort:** 2-3 hours
**Output:** 10 anchor loop cards

### Steps:
- [ ] Follow Quick-Start Guide (Section 16)
- [ ] Design Loop 1: The Innocent Day
- [ ] Design Loops 2-5: The Dawning
- [ ] Design Loop ~50: First Strategy Shift
- [ ] Design Loop ~200: First Breakthrough
- [ ] Design Loop ~500: The Obsession Begins
- [ ] Design Loop ~2000: The Near Miss
- [ ] Design Loop ~5000: The Breaking Point
- [ ] Design Loop ~50000: The Atrocity
- [ ] Design Loop ~200000: The First Quiet
- [ ] Design Loop 1,000,000: The End

### Deliverable:
10 completed Anchor Loop Design Cards (see Section 15.5)

---

## Task 8: Define Initial Equivalence Classes

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Output:** 20-50 equivalence class definitions

### Steps:
- [ ] For each absorbing state, create at least one class
- [ ] For each anchor loop, define its surrounding class
- [ ] Estimate counts (classes should sum to ~1,000,000)
- [ ] Write narrative summaries for high-count classes
- [ ] Identify sample loops for each class

### Deliverable:
Populated Equivalence Class Sheet

---

## Task 9: Validate the Math

**Priority:** HIGH
**Effort:** 30 minutes
**Output:** Sanity check report

### Steps:
- [ ] Sum all epoch loop counts
- [ ] Sum all equivalence class counts
- [ ] Check: epoch sum ≈ class sum ≈ 1,000,000
- [ ] Identify gaps or overlaps
- [ ] Adjust counts as needed

### Deliverable:
```
MATH CHECK:
Epoch totals: [sum]
Class totals: [sum]
Variance: [difference]
Status: [PASS/ADJUST]
```

---

## Task 10: Document Decisions

**Priority:** LOW (but important)
**Effort:** 1 hour
**Output:** Design decisions log

### Steps:
- [ ] Document why you chose your epoch structure
- [ ] Document why certain events are critical vs. color
- [ ] Document your knowledge progression logic
- [ ] Note any deviations from the standard framework
- [ ] Record questions for later resolution

### Deliverable:
Design decisions document

---

## Phase 1 Complete Checklist

Before moving to Phase 2 (writing prose):

- [ ] Day graph defined and validated
- [ ] Key choices documented
- [ ] All epochs defined with loop counts
- [ ] All absorbing states catalogued
- [ ] Knowledge taxonomy complete
- [ ] Tracking sheets created and populated
- [ ] 10+ anchor loops designed
- [ ] 20+ equivalence classes defined
- [ ] Math validates (~1,000,000 total)
- [ ] Design decisions documented

---

## Next: Phase 2

Phase 2 focuses on prose writing:
- Writing Loop 1 and Loop 1,000,000 first
- Filling in anchor loops by epoch
- Creating montage prose for equivalence classes
- Iterative refinement as gaps emerge

See checklists.md for ongoing tracking during writing.
