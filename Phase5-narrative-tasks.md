# Phase 5: Narrative Generation

**Agent**: NarrativeWeaver
**Dependencies**: Phase 1-4 (full stack)
**Outputs**: Story generation, epoch structuring, prose output

---

## Overview
Transform the mathematical machinery into compelling narrative. This is where loops become story.

---

## The Three Layers in Prose

| Layer | Data | Prose |
|-------|------|-------|
| Math | Equivalence classes, operators | Hidden from reader |
| Logic | Policies, epochs, causation | Felt but not stated |
| Narrative | Anchor loops, montages | What reader experiences |

---

## Tasks

### 5.1 Epoch Definition
- [ ] Define canonical epochs:
  1. **Naive/Denial** - "This can't be happening"
  2. **Mapping/Experimenting** - "What are the rules?"
  3. **Obsession/Escalation** - "I can fix everything"
  4. **Ruthlessness/Burnout** - "Nothing matters"
  5. **Synthesis/Transcendence** - Resolution (open)
- [ ] Implement `Epoch` struct
  ```
  Epoch {
    id
    name
    description
    loop_range        # which loops belong here
    dominant_policy   # what drives behavior
    emotional_arc     # trajectory within epoch
    anchor_loops[]
    key_revelations[]
  }
  ```
- [ ] Support custom epoch definitions

### 5.2 Anchor Loop Selection for Story
- [ ] Implement `select_story_anchors(epoch) → loops[]`
- [ ] Criteria:
  - First attempt in epoch
  - Major breakthrough
  - Rock bottom
  - Turning point
  - Emotional peak
- [ ] Balance: 5-20 anchors per epoch
- [ ] Ensure narrative flow between anchors

### 5.3 Montage Prose Generation
- [ ] Implement `generate_montage_text(montage) → prose`
- [ ] Templates by montage type:
  - Failure montage: "347 times, same explosion"
  - Learning montage: "Each loop taught something small"
  - Despair montage: "The attempts blurred together"
  - Mastery montage: "Eventually, muscle memory took over"
- [ ] Include statistics naturally
- [ ] Vary prose to avoid repetition

### 5.4 Loop Detail Generation
- [ ] Implement `narrate_loop(loop_id) → prose`
- [ ] Detail levels:
  - Full: complete scene-by-scene
  - Summary: key beats only
  - Flash: single paragraph
- [ ] Include:
  - Decision points
  - Emotional state
  - Knowledge gained
  - Outcome

### 5.5 Sub-Loop Hell Sequences
- [ ] Implement `narrate_subloop_macro(macro) → prose`
- [ ] Convey:
  - Time dilation ("felt like a month")
  - Repetition trauma
  - Micro-variations
  - Breaking through or giving up
- [ ] Example output:
  ```
  "He spent what felt like a month trapped in those
  eight minutes. The same conversation, the same
  wrong words, the same look in her eyes. Two
  hundred and fourteen times. On attempt two
  fifteen, something shifted."
  ```

### 5.6 Epoch Transition Scenes
- [ ] Identify epoch boundary loops
- [ ] Generate transition prose:
  - What triggered the shift
  - Emotional state change
  - New strategy emerging
- [ ] Connect epochs narratively

### 5.7 Knowledge Revelation Scenes
- [ ] Track knowledge discovery moments
- [ ] Generate "aha" scenes:
  - What was learned
  - How it was learned
  - Impact on protagonist
- [ ] Build knowledge graph visualization

### 5.8 Emotional Arc Tracking
- [ ] Implement `mood_trajectory(loops[]) → curve`
- [ ] Identify:
  - Hope peaks
  - Despair valleys
  - Numbness plateaus
  - Breakthrough moments
- [ ] Generate emotional summary prose

### 5.9 Full Story Assembly
- [ ] Implement `assemble_story(epochs[]) → narrative`
- [ ] Structure:
  1. Opening (first loop)
  2. Per-epoch:
     - Anchor loops (detailed)
     - Montages (compressed)
     - Transitions
  3. Resolution
- [ ] Balance detail vs. compression
- [ ] Maintain reader engagement

### 5.10 Output Formats
- [ ] Prose output (markdown)
- [ ] Outline output (structural view)
- [ ] Timeline output (chronological loop list)
- [ ] Statistics output (compression data)

---

## Acceptance Criteria

1. Epochs have clear narrative identity
2. Anchor loops are compelling when expanded
3. Montages compress without losing impact
4. Sub-loop hells convey repetition trauma
5. Transitions feel earned, not arbitrary
6. Full story is readable and engaging

---

## Narrative Templates

### Montage: Failure
```
"He tried every way he could think of to [GOAL].
[VARIATIONS]. [COUNT] times, [SAME_OUTCOME]."
```

### Montage: Learning
```
"Each attempt taught him something. Loop [N]: [LESSON1].
Loop [N+X]: [LESSON2]. By loop [M], he knew [KNOWLEDGE]."
```

### Epoch Transition
```
"Something broke on loop [N]. Not the world—that broke
every day. Something in him. The [OLD_STRATEGY] had
failed [COUNT] times. Now he would try [NEW_STRATEGY]."
```

### Sub-Loop Hell
```
"The [DURATION] window became its own eternity.
[ATTEMPTS] variations of the same [ACTION].
He stopped counting after [N]. Started again at [M].
On attempt [FINAL], [BREAKTHROUGH_OR_SURRENDER]."
```

---

## Notes for Agent

- The reader should *feel* a million loops, not count them
- Statistics should serve emotion, not replace it
- Vary prose rhythm: dense detail → compressed montage → detail
- Silence and white space are narrative tools
- The ending is open by design

---

## Integration Points

- Pull equivalence classes from Phase 4
- Pull anchor lists from Phase 4
- Pull montage structures from Phase 4
- Pull loop details from Phase 1-2
- Pull emotional data from Phase 3 policies
