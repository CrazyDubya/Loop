# Writing Stories With Loop Engine

A comprehensive guide to using Loop Engine for crafting time-loop narratives.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Pre-Writing: Story Planning](#pre-writing-story-planning)
4. [Building Your Day Graph](#building-your-day-graph)
5. [Designing Anchor Loops](#designing-anchor-loops)
6. [Creating Equivalence Classes](#creating-equivalence-classes)
7. [Writing Workflows](#writing-workflows)
8. [Checklists](#checklists)
9. [Best Practices](#best-practices)

---

## Overview

Loop Engine is a computational tool, but its purpose is storytelling. This guide shows you how to use the engine to manage the complexity of million-loop narratives while keeping your sanity and your narrative coherence intact.

### The Core Insight

You don't write a million loops individually. You:
1. **Design a day graph** - The event structure all loops traverse
2. **Create anchor loops** - 100-300 key moments written in full detail
3. **Define equivalence classes** - Group similar loops by outcome and knowledge
4. **Generate narrative** - Use the engine to produce prose from compressed data

---

## Getting Started

### Initialize Your Project

```bash
npm run loop -- init "My Time Loop Story"
```

This creates the project structure and prepares the engine for your story.

### The Three-Phase Workflow

1. **Planning Phase** - Design your world before coding
2. **Implementation Phase** - Build the graph and loops in the engine
3. **Writing Phase** - Generate and refine narrative prose

---

## Pre-Writing: Story Planning

Before touching the engine, answer these questions on paper:

### Essential Questions

1. **Loop boundaries**: When does the day start? When does it end? What triggers the reset?
2. **Victory condition**: What ends the loops permanently? Is it achievable?
3. **Protagonist**: Who are they? What do they value? How will they break psychologically?
4. **Antagonist/obstacle**: What's preventing success? Is it a person, a system, fate itself?
5. **Emotional arc**: What's the psychological journey? (naive → desperate → broken → transcendent?)

### Scale Planning

Decide your target loop count:
- **Small scale**: 1,000-10,000 loops (novella, focused story)
- **Medium scale**: 10,000-100,000 loops (novel, detailed psychological journey)
- **Large scale**: 100,000-1,000,000+ loops (epic, civilization-scale time investment)

The engine scales, but your narrative focus should match your chosen scope.

---

## Building Your Day Graph

The day graph is the skeleton all loops hang on. It's a directed acyclic graph (DAG) of events and transitions.

### Task 1: Brainstorm Events

**Priority:** CRITICAL
**Effort:** 2-4 hours
**Output:** Event list + relationship map

#### Steps:

1. **Establish loop boundaries**
   - Start time (e.g., 08:00 AM - alarm rings)
   - End time (e.g., Midnight - day ends)
   - Reset trigger (death, midnight, specific event)

2. **Brainstorm 50-100 possible events**
   - Critical events (bank robbery, confrontation, revelation)
   - Gating events (locked doors, guard checkpoints)
   - Color events (conversations, observations, flavor)
   - Background events (traffic, weather, background characters)
   - Absorbing states (deaths, victories, timeouts)

3. **Classify each event**
   - **Critical**: Must be resolved to progress
   - **Gating**: Blocks access to later events
   - **Color**: Adds depth but not mechanically required
   - **Background**: Atmosphere and world-building
   - **Absorbing**: Ends the loop immediately

4. **Map relationships**
   - Enables: Event A makes Event B possible
   - Prevents: Event A makes Event B impossible
   - Requires: Event B needs Event A first
   - Timing: Events have temporal ordering

5. **Validate**
   - No orphan events (unreachable from start)
   - At least one path to success exists
   - Multiple failure paths exist
   - Graph is acyclic (no time paradoxes in single loop)

### Implementation

```bash
# Add nodes (events)
npm run loop -- graph add-node wake_up scene 08:00 "Wake to alarm"
npm run loop -- graph add-node breakfast scene 08:30 "Breakfast at cafe"
npm run loop -- graph add-node bank_entrance scene 10:00 "Arrive at bank"
npm run loop -- graph add-node confrontation scene 10:15 "Face the villain"
npm run loop -- graph add-node death_explosion terminal 10:20 "Explosion kills everyone"
npm run loop -- graph add-node victory terminal 10:25 "Successfully defuse bomb"

# Add edges (transitions)
npm run loop -- graph add-edge e1 wake_up breakfast
npm run loop -- graph add-edge e2 breakfast bank_entrance
npm run loop -- graph add-edge e3 bank_entrance confrontation
npm run loop -- graph add-edge e4 confrontation death_explosion
npm run loop -- graph add-edge e5 confrontation victory

# Visualize
npm run loop -- graph visualize --format mermaid
```

---

## Designing Anchor Loops

Anchor loops are the detailed moments you'll write in full prose. Everything else is compressed relative to these.

### Task 2: Define Key Choices

**Priority:** HIGH
**Effort:** 1-2 hours
**Output:** Decision vector schema

#### Steps:

1. **Identify 5-8 critical binary choices**
   - A = "Warn the sister" (0/1)
   - B = "Take the gun" (0/1)
   - C = "Trust the stranger" (0/1)
   - D = "Use the codeword" (0/1)
   - E = "Confront villain directly" (0/1)

2. **Document each choice**
   ```
   KEY CHOICES FOR [YOUR STORY]:
   A = Warn sister before 09:00 (0 = no, 1 = yes)
   B = Take gun from drawer at home (0 = no, 1 = yes)
   C = Trust the mysterious woman (0 = no, 1 = yes)
   D = Use the codeword "Phoenix" (0 = no, 1 = yes)
   E = Direct confrontation vs stealth (0 = stealth, 1 = direct)
   ```

3. **Note dependencies**
   - Choice D only matters if Choice C = 1 (can't use codeword without trusting her)
   - Choice B enables certain paths in the confrontation
   - Some combinations are impossible (document these)

### Task 3: Define Epochs

**Priority:** HIGH
**Effort:** 2-3 hours
**Output:** 4-7 epoch definitions

Epochs are psychological phases of the journey.

#### Example Epoch Structure:

| Epoch | Loop Range | Strategy | Emotional State |
|-------|------------|----------|-----------------|
| **Naive** | 1-100 | Straightforward attempts | Confused, determined |
| **Mapping** | 101-5,000 | Systematic exploration | Obsessive, analytical |
| **Ruthless** | 5,001-50,000 | Willing to sacrifice anything | Numb, pragmatic |
| **Synthesis** | 50,001-1,000,000 | Holistic, creative solutions | Transcendent, wise |

#### For Each Epoch, Define:

- **Dominant strategy**: How does the protagonist approach the problem?
- **Dominant outcomes**: What failures and successes occur?
- **Knowledge gained**: What do they learn in this phase?
- **Emotional state**: How do they feel?
- **Fatigue state**: How worn down are they?
- **Loop count estimate**: Should sum to your target total

### Task 4: Design First 10 Anchors

**Priority:** HIGH
**Effort:** 2-3 hours
**Output:** 10 anchor loop cards

These are your narrative tent poles:

1. **Loop 1: The Innocent Day**
   - First occurrence, no knowledge, full experience
   - Establishes baseline and initial failure

2. **Loops 2-5: The Dawning**
   - Realization of the loop, first experiments
   - Emotional impact of realization

3. **Loop ~50: First Strategy Shift**
   - Abandoning naive approach
   - First systematic attempt

4. **Loop ~200: First Breakthrough**
   - Major piece of knowledge gained
   - Genuine hope

5. **Loop ~500: The Obsession Begins**
   - Losing perspective, tunnel vision
   - Personal relationships strain

6. **Loop ~2000: The Near Miss**
   - Almost succeeded, devastating failure
   - Emotional breaking point

7. **Loop ~5000: The Breaking Point**
   - Moral nadir, atrocity, or complete breakdown
   - Transformation moment

8. **Loop ~50000: The Atrocity**
   - Desperate measures, cross a line
   - Aftermath and reckoning

9. **Loop ~200000: The First Quiet**
   - Finding peace despite endless repetition
   - Changed perspective

10. **Loop 1,000,000: The End**
    - Resolution (success, acceptance, or transcendence)
    - Character transformation complete

---

## Creating Equivalence Classes

Most loops are variations of the same outcome. Equivalence classes compress millions of loops into thousands of groups.

### Task 5: Define Initial Classes

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Output:** 20-50 equivalence class definitions

#### Equivalence Rule:

Two loops are equivalent if:
```
L1 ~ L2  ⟺  Outcome(L1) = Outcome(L2)  ∧  KnowledgeEnd(L1) = KnowledgeEnd(L2)
```

#### Example Classes:

**Class C_001: "Everyone Dies in Explosion"**
- **Outcome**: `everyone_dies_explosion_10:20`
- **Knowledge gained**: None
- **Mood delta**: -5 (despair)
- **Estimated count**: 45,000 loops
- **Sample loops**: L_001, L_005, L_012, L_027, L_091
- **Narrative summary**: *"He tried every approach he could think of. Different words, different timing, different strategies. Forty-five thousand times, the same explosion, the same screaming, the same silence."*

**Class C_012: "Sister Saved, Villain Escapes"**
- **Outcome**: `sister_survives_villain_escapes`
- **Knowledge gained**: `K_050` (basic geography of day)
- **Mood delta**: +3 (partial success)
- **Estimated count**: 12,000 loops
- **Sample loops**: L_143, L_289, L_445
- **Narrative summary**: *"A dozen thousand variations on the same pyrrhic victory. She lived. That was something. But the bomb still existed, and tomorrow would come again."*

### Implementation

```bash
# The engine automatically detects equivalence classes as you create loops
# You can query them:
npm run loop -- list --outcome everyone_dies_explosion
npm run loop -- stats  # Shows class distribution
```

---

## Writing Workflows

### Daily Writing Session

**Before each session:**
- [ ] Review current epoch's anchor list
- [ ] Check which loops are marked "to write"
- [ ] Review relevant equivalence classes
- [ ] Note current fatigue_state for continuity

**After each session:**
- [ ] Update tracking with any new loops created
- [ ] Mark written loops as complete
- [ ] Note any new equivalence classes discovered
- [ ] Update loop counts if needed
- [ ] Record any continuity questions for later

### Writing Anchor Loops

Use the narrative engine to generate prose, then refine:

```bash
# Generate narrative for a loop in different tones
npm run loop -- narrate loop-abc123 --tone dramatic
npm run loop -- narrate loop-abc123 --tone weary
npm run loop -- narrate loop-abc123 --tone reflective

# Compare and choose the tone that fits the epoch
```

Available tones:
- **clinical** - Detached, analytical (good for mapping epoch)
- **dramatic** - Heightened emotion (good for breakthrough moments)
- **sardonic** - Dark humor (good for mid-journey coping)
- **hopeful** - Optimistic despite repetition (good for early epoch)
- **weary** - Exhausted, numb (good for late middle epoch)
- **detached** - Dissociated observation (good for breaking point)
- **frantic** - Panicked desperation (good for near-miss failures)
- **reflective** - Contemplative wisdom (good for synthesis epoch)

### Writing Montage Passages

For equivalence classes, use the narrative summarization:

```bash
npm run loop -- summarize class-c001
```

Then refine the generated montage to include:
- The count (for verisimilitude)
- At least one specific detail
- The emotional/psychological effect
- Connection to surrounding narrative

---

## Checklists

### New Anchor Loop Checklist

When creating a new anchor loop:
- [ ] Assign LoopID following convention
- [ ] Determine epoch placement
- [ ] Set parent_id (if derived from another loop)
- [ ] Define key_choices vector
- [ ] Determine outcome_hash
- [ ] Assign/create knowledge_id
- [ ] Assign/create mood_id
- [ ] Add relevant tags
- [ ] Calculate subjective_duration (if sub-loops involved)
- [ ] Write narrative_hook (one line summary)
- [ ] Assign to equivalence class
- [ ] Update class count

### New Equivalence Class Checklist

When creating a new equivalence class:
- [ ] Assign ClassID following convention (C_XXX)
- [ ] Define outcome_hash
- [ ] Define knowledge_delta (if any)
- [ ] Set mood_delta (-10 to +10)
- [ ] Estimate count
- [ ] List sample_loops (1-5)
- [ ] Determine epoch_distribution
- [ ] Write narrative_summary
- [ ] Verify it doesn't duplicate existing class

### Epoch Transition Checklist

When writing an epoch transition loop:
- [ ] Confirm fatigue_state change makes sense
- [ ] Check knowledge prerequisites are met
- [ ] Verify emotional continuity from prior epoch
- [ ] Tag as "epoch_transition"
- [ ] Ensure psychological shift is dramatized
- [ ] Check this transition against others for consistency

### Continuity Check Checklist

Run periodically to catch errors:
- [ ] Knowledge states are consistent (can't use what isn't learned)
- [ ] Fatigue states progress logically (no unexplained jumps)
- [ ] Mood transitions are gradual (except at breaking points)
- [ ] Loop IDs are sequential within reason
- [ ] Parent loops exist before children reference them
- [ ] Equivalence class counts sum to target total
- [ ] All anchor loops are assigned to classes
- [ ] No orphan classes (classes with no sample loops)

### Final Review Checklist

Before considering the story complete:
- [ ] All mandatory anchors written (Loop 1, Loop 1M, transitions)
- [ ] Each epoch has sufficient anchor coverage
- [ ] Montage passages reference accurate counts
- [ ] Psychological arc is traceable through text
- [ ] No unexplained knowledge appearances
- [ ] Fatigue states progress believably
- [ ] Reader can feel the weight of the loops
- [ ] Character transformation is earned
- [ ] Ending resolves character arc (not just plot)
- [ ] Math validates (counts add up correctly)

---

## Best Practices

### Do:

- **Start with Loop 1 and Loop 1,000,000 first** - Bookends define the arc
- **Design your day graph thoroughly** - Changes later are costly
- **Use equivalence classes ruthlessly** - Don't write variations individually
- **Let epochs guide tone** - Each phase has a different emotional color
- **Validate frequently** - Use `npm run loop -- validate` often
- **Export regularly** - Keep backups of your work
- **Trust the compression** - Montages are powerful when done well

### Don't:

- **Don't write loops in chronological order** - Write anchors by importance
- **Don't skip the math** - If counts don't add up, something's wrong
- **Don't ignore psychological continuity** - Character must evolve believably
- **Don't over-detail** - Not every loop needs prose, most should be compressed
- **Don't lose the human story** - Technical correctness serves emotional truth
- **Don't forget the reader** - They need to feel the weight, not just know the count

---

## Quick Reference: Conventions

### Tag Conventions

Standard tags for loops:
- `anchor` - Key loop, written in detail
- `first` - First occurrence of something
- `breakthrough` - Major progress moment
- `moral_nadir` - Lowest ethical point
- `atrocity` - Deliberately harmful action
- `epoch_transition` - Marks shift between epochs
- `sub_loop_intensive` - Heavy sub-loop activity
- `return_to_humanity` - Recovery/reconnection moment
- `emotional` - Primarily emotional significance

### Outcome Hash Conventions

Standard outcome patterns:
- `[target]_dies_[cause]` - Death outcome
- `[target]_survives_[condition]` - Survival with qualifier
- `arrested_[location]` - Arrest outcome
- `success_[type]` - Victory variant
- `timeout_[state]` - Day ends without resolution

### Knowledge ID Milestones

Suggested milestone knowledge states:
- `K_000` - Baseline (loop 1 knowledge)
- `K_050` - Basic geography of the day
- `K_100` - Key NPCs identified
- `K_150` - Core conspiracy/problem understood
- `K_200` - Full technical knowledge
- `K_250` - Mastery (knows everything learnable)

Adapt to your story's specifics.

### Mood ID Anchors

Suggested mood anchors:
- `M_001` - Baseline normal
- `M_010` - First shock/grief
- `M_025` - Determined
- `M_050` - Obsessive
- `M_075` - Numb
- `M_100` - Self-loathing
- `M_125` - Dissociated
- `M_150` - Bittersweet peace
- `M_175` - Transcendent

Fill in intermediate states as needed.

---

## Additional Resources

- **StartHere** - Original design document with theoretical foundation
- **ARCHITECTURE.md** - Technical architecture details
- **CRITIQUE-StartHere.md** - Self-critique showing thought process
- **REFLECTION-Phase9.md** - Implementation reflection and lessons learned

---

## Getting Help

If you're stuck:

1. **Check the validation**: `npm run loop -- validate`
2. **Review your statistics**: `npm run loop -- stats`
3. **Examine your graph**: `npm run loop -- graph visualize --format mermaid`
4. **Export your data**: `npm run loop -- export --format json`
5. **Start small**: Build a 100-loop story first to learn the workflow

---

**Remember**: Loop Engine is a tool to manage complexity. Your creativity, your emotional truth, your character arc - these are what make the story worth reading. The engine exists to let you focus on what matters: the human story at the heart of infinite repetition.
