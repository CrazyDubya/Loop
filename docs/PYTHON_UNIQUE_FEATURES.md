# Python Implementation - Unique Features

**Document Purpose**: Preserve valuable algorithms, patterns, and narrative content from the Python implementation (`archive/python-implementation` branch) that don't exist in the TypeScript baseline.

**Created**: 2025-12-02
**Python Branch**: `archive/python-implementation`
**TypeScript Baseline**: `main` (v1.0)

---

## Executive Summary

The Python implementation contains **significant unique value** across 13 major feature categories:

1. Advanced decision vector operations (genetic algorithms)
2. Triple-hash equivalence system
3. Comprehensive narrative prose templates
4. Emotional arc tracking & quantification
5. Parametric loop families with bitwise matching
6. Transparent anchor scoring system
7. Sub-loop macro detection
8. Short loop clustering
9. Complete story assembly pipeline
10. Stateful adaptive policies
11. Production-grade validation
12. Advanced SQLite indexing
13. Comprehensive test edge cases

**Recommendation**: High-priority features for porting to TypeScript are marked with ⭐

---

## 1. Decision Vector Operations ⭐ **CRITICAL**

**Location**: `src/models/loop.py` lines 160-276
**Status**: UNIQUE - Not in TypeScript
**Priority**: CRITICAL

### Overview

Sophisticated bit-manipulation algorithms inspired by genetic algorithms enable intelligent loop variation and similarity measurement.

### Algorithms

#### Hamming Distance
```python
def hamming_distance(vec1: int, vec2: int) -> int:
    """Count differing bits between two decision vectors."""
    xor = vec1 ^ vec2
    return bin(xor).count('1')
```

**Use**: Measure how "different" two loops are based on protagonist decisions.

#### Mutation
```python
def mutate_vector(vec: int, n_flips: int, max_bits: int = 8) -> int:
    """Flip n random bits in a decision vector."""
    import random
    bits_to_flip = random.sample(range(max_bits), min(n_flips, max_bits))
    result = vec
    for bit in bits_to_flip:
        result ^= (1 << bit)
    return result
```

**Use**: Generate slight variations of a loop ("try the same thing but change 2 decisions").

#### Crossover
```python
def crossover_vectors(vec1: int, vec2: int, max_bits: int = 8) -> int:
    """Combine two decision vectors using single-point crossover."""
    import random
    crossover_point = random.randint(0, max_bits - 1)
    lower_mask = (1 << crossover_point) - 1
    upper_mask = ((1 << max_bits) - 1) ^ lower_mask
    return (vec1 & lower_mask) | (vec2 & upper_mask)
```

**Use**: Combine successful elements from two different loops.

#### Random Vector Generation
```python
def random_vector(max_bits: int = 8, density: float = 0.5) -> int:
    """Generate a random decision vector with controlled density."""
    import random
    result = 0
    for i in range(max_bits):
        if random.random() < density:
            result |= (1 << i)
    return result
```

**Use**: Generate completely new loop attempts with controlled randomness.

### Applications

- **`vary()` operator**: Generate controlled variations of successful loops
- **`relive()` operator**: Find loops within hamming_distance(N) of target
- **Exploration policies**: Systematically explore decision space
- **Loop breeding**: Combine elements from multiple successful approaches

### TypeScript Port Priority

**CRITICAL** - These enable the mathematical foundation for intelligent loop generation.

---

## 2. Triple-Hash Equivalence System ⭐ **CRITICAL**

**Location**: `src/models/loop.py` lines 74-158
**Status**: UNIQUE - TypeScript has basic equivalence only
**Priority**: CRITICAL

### Overview

Python uses THREE orthogonal hash functions for complete state characterization:

1. **Outcome Hash**: What happened in the world
2. **Knowledge Hash**: What protagonist learned
3. **Mood Hash**: Protagonist's emotional state

### Implementation

#### Outcome Hash
```python
def compute_outcome_hash(
    survivors: Set[str],
    deaths: Set[str],
    state_changes: Set[str],
    ending_type: str
) -> str:
    """Deterministic hash of loop outcome."""
    data = {
        "survivors": sorted(survivors),
        "deaths": sorted(deaths),
        "state_changes": sorted(state_changes),
        "ending_type": ending_type
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

#### Knowledge Hash
```python
def compute_knowledge_id(
    facts: Set[str],
    secrets: Set[str],
    skills: Set[str]
) -> str:
    """Deterministic hash of knowledge state."""
    data = {
        "facts": sorted(facts),
        "secrets": sorted(secrets),
        "skills": sorted(skills)
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

#### Mood Hash
```python
def compute_mood_id(
    baseline: str,
    trauma_markers: Set[str],
    resilience: float
) -> str:
    """Deterministic hash of mood state."""
    data = {
        "baseline": baseline,
        "trauma_markers": sorted(trauma_markers),
        "resilience": round(resilience, 2)
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

### Equivalence Rule

```python
L1 ~ L2  ⟺
    outcome_hash(L1) == outcome_hash(L2) AND
    knowledge_id(L1) == knowledge_id(L2) AND
    mood_id(L1) == mood_id(L2)
```

### Applications

- **Precise deduplication**: Collapse millions of loops without false positives
- **Mood-aware compression**: Different emotional contexts = different classes
- **Knowledge tracking**: Separate "learned something" from "same outcome"
- **State fingerprinting**: Complete characterization in 48 hex characters

### TypeScript Port Priority

**CRITICAL** - More sophisticated than TypeScript's basic outcome-only equivalence.

---

## 3. Narrative Prose Templates ⭐ **HIGH**

**Location**: `src/engine/narrative.py` lines 130-169
**Status**: UNIQUE - TypeScript has basic templates only
**Priority**: HIGH

### Overview

Production-quality prose templates with rotation and variation for compelling narrative generation.

### Template Categories

#### Montage Templates (4 types × 3 variations each)

**Failure Montages**:
```python
MONTAGE_TEMPLATES["failure"] = [
    "He tried every way he could think of. {variations} {count} times, the same outcome.",
    "{count} attempts. {count} failures. The {outcome} never changed.",
    "Different paths, same destination. {count} loops, all ending in {outcome}.",
]
```

**Learning Montages**:
```python
MONTAGE_TEMPLATES["learning"] = [
    "Each attempt taught him something small. By loop {count}, he knew {knowledge}.",
    "The loops weren't wasted. {count} iterations, {count} lessons. Finally: {knowledge}.",
    "Knowledge accumulated like sediment. {count} layers. Eventually: {knowledge}.",
]
```

**Despair Montages**:
```python
MONTAGE_TEMPLATES["despair"] = [
    "The attempts blurred together. {count} of them, maybe more. He stopped counting.",
    "{count} loops. Or was it more? The days had lost their edges.",
    "Time meant nothing. {count} resets. {count} failures. {count} reasons to stop.",
]
```

**Mastery Montages**:
```python
MONTAGE_TEMPLATES["mastery"] = [
    "Eventually, muscle memory took over. {count} repetitions had burned the path into his bones.",
    "He didn't think anymore. After {count} loops, the body knew what the mind had forgotten.",
    "{count} times. Enough to make it automatic. Enough to make it art.",
]
```

#### Sub-Loop Templates

```python
SUBLOOP_TEMPLATES = [
    "He spent what felt like {time_feel} trapped in those {duration} minutes. The same {action}, the same wrong words. {attempts} times. On attempt {final}, {resolution}.",
    "The {duration}-minute window became its own eternity. {attempts} variations. He stopped counting after {midpoint}. Started again. On attempt {final}, {resolution}.",
    "{attempts} loops within the loop. {duration} minutes, repeated until they lost all meaning. {resolution}",
]
```

#### Transition Templates

```python
TRANSITION_TEMPLATES = [
    "Something broke on loop {loop_num}. Not the world—that broke every day. Something in him. The {old_strategy} had failed {count} times. Now he would try {new_strategy}.",
    "Loop {loop_num} ended like all the others. But when he woke again, he was different. {old_strategy} was dead. Time for {new_strategy}.",
    "After {count} failures, even stubbornness has limits. Loop {loop_num} marked the end of {old_strategy}. What came next was {new_strategy}.",
]
```

#### Revelation Templates

```python
REVELATION_TEMPLATES = [
    "Loop {loop_num}. That's when he learned {knowledge}. Everything before was prologue.",
    "The {knowledge}. He discovered it on loop {loop_num}, and nothing was the same after.",
    "It took {loop_num} loops to learn what should have been obvious: {knowledge}.",
]
```

### Template Rotation

```python
class ProseGenerator:
    def __init__(self):
        self._variation_index = 0

    def _pick_template(self, templates: List[str]) -> str:
        """Pick a template with automatic rotation."""
        self._variation_index = (self._variation_index + 1) % len(templates)
        return templates[self._variation_index]
```

### TypeScript Port Priority

**HIGH** - These represent significant creative work and should be preserved verbatim.

---

## 4. Emotional Arc Tracking ⭐ **HIGH**

**Location**: `src/engine/narrative.py` lines 389-518
**Status**: UNIQUE - Not in TypeScript
**Priority**: HIGH

### Overview

Quantitative modeling of protagonist emotional state across loops, enabling data-driven story pacing.

### Data Structure

```python
@dataclass
class EmotionalPoint:
    loop_index: int
    loop_id: LoopID
    emotion: str  # hope, determination, numbness, frustration, despair
    intensity: float  # -1.0 (despair) to 1.0 (hope)
```

### Intensity Scoring Algorithm

```python
def compute_emotional_arc(loops: List[Loop]) -> List[EmotionalPoint]:
    """
    Compute emotional intensity for each loop based on tags and outcomes.

    Returns series of EmotionalPoint objects tracking protagonist state.
    """
    points = []
    for i, loop in enumerate(loops):
        intensity = 0.0
        emotion = "determination"  # default

        # Negative events
        if loop.is_death_loop():
            intensity -= 0.3
            emotion = "frustration"
        if loop.is_short_loop():
            intensity -= 0.2
        if "trauma" in loop.tags:
            intensity -= 0.4
            emotion = "despair"

        # Positive events
        if "breakthrough" in loop.tags:
            intensity += 0.5
            emotion = "hope"
        if "success" in loop.tags:
            intensity += 0.7
            emotion = "determination"

        # Accumulation effects (gets worse over time)
        if i > 1000:
            intensity -= 0.1  # Fatigue
        if i > 10000:
            intensity -= 0.2
            emotion = "numbness"

        points.append(EmotionalPoint(
            loop_index=i,
            loop_id=loop.id,
            emotion=emotion,
            intensity=max(-1.0, min(1.0, intensity))
        ))

    return points
```

### Peak Detection

```python
def find_emotional_peaks(arc: List[EmotionalPoint]) -> Tuple[List[int], List[int]]:
    """
    Find local maxima (hope peaks) and minima (despair valleys).

    Returns:
        (hope_peak_indices, despair_valley_indices)
    """
    hopes = []
    despairs = []

    for i in range(1, len(arc) - 1):
        prev = arc[i-1].intensity
        curr = arc[i].intensity
        next_val = arc[i+1].intensity

        # Local maximum
        if curr > prev and curr > next_val and curr > 0.3:
            hopes.append(i)

        # Local minimum
        if curr < prev and curr < next_val and curr < -0.3:
            despairs.append(i)

    return hopes, despairs
```

### Narrative Summary Generation

```python
def generate_emotional_summary(arc: List[EmotionalPoint]) -> str:
    """Generate narrative description of emotional journey."""
    hope_peaks, despair_valleys = find_emotional_peaks(arc)

    summary_parts = []

    if hope_peaks:
        summary_parts.append(f"{len(hope_peaks)} moments of genuine hope")
    if despair_valleys:
        summary_parts.append(f"{len(despair_valleys)} times he hit rock bottom")

    # Overall trajectory
    if len(arc) > 100:
        start_avg = sum(p.intensity for p in arc[:50]) / 50
        end_avg = sum(p.intensity for p in arc[-50:]) / 50

        if end_avg > start_avg + 0.2:
            summary_parts.append("ultimately finding transcendence")
        elif end_avg < start_avg - 0.2:
            summary_parts.append("spiraling into darkness")
        else:
            summary_parts.append("maintaining grim equilibrium")

    return ", ".join(summary_parts) + "."
```

### Applications

- **Pacing analysis**: Identify where story drags or peaks too often
- **Anchor selection**: Choose emotionally significant loops
- **Montage tuning**: Match tone to current emotional state
- **Arc validation**: Ensure psychological journey is believable

### TypeScript Port Priority

**HIGH** - Enables data-driven narrative quality control.

---

## 5. Parametric Loop Families **MEDIUM**

**Location**: `src/engine/compression.py` lines 69-168
**Status**: UNIQUE - TypeScript lacks this abstraction
**Priority**: MEDIUM

### Overview

Strategy-based loop grouping with bitwise pattern matching and wildcards.

### Data Structure

```python
class LoopFamily(BaseModel):
    """Parametric family grouping loops by strategy."""
    id: str
    name: str
    strategy_type: StrategyType  # BRUTE_FORCE, STEALTH, PERSUASION, etc.
    risk_level: RiskLevel  # LOW, MEDIUM, HIGH, EXTREME
    key_choices_pattern: int  # Required decision bits
    key_choices_mask: int  # Which bits must match (1) vs wildcard (0)
    typical_outcome: str
    class_ids: List[ClassID]
    total_loops: int
```

### Pattern Matching with Wildcards

```python
def matches_loop(self, loop: Loop) -> bool:
    """Check if loop matches this family's pattern."""
    # Apply mask: only check bits where mask=1
    masked_choices = loop.key_choices & self.key_choices_mask
    pattern_masked = self.key_choices_pattern & self.key_choices_mask
    return masked_choices == pattern_masked
```

**Example**:
```python
# Family: "Stealth attempts where protagonist takes gun"
family = LoopFamily(
    key_choices_pattern=0b00000010,  # Bit 1 = take gun
    key_choices_mask=    0b11110010,  # Check bits 1,4,5,6,7 only
    # Bits 0,2,3 are wildcards - don't care
)

# This loop matches (has bit 1 set, others don't matter for wildcards)
loop1.key_choices = 0b10110010  # MATCHES
loop2.key_choices = 0b00000011  # MATCHES
loop3.key_choices = 0b00000000  # DOESN'T MATCH (bit 1 not set)
```

### Strategy Inference

```python
def infer_strategy(loop: Loop) -> StrategyType:
    """Infer strategy from loop characteristics."""
    tags = set(loop.tags)

    # Explicit tags
    if "stealth" in tags: return StrategyType.STEALTH
    if "persuade" in tags: return StrategyType.PERSUASION
    if "sacrifice" in tags: return StrategyType.SACRIFICE

    # Heuristics
    if len(loop.decision_trace) < 4:
        return StrategyType.WITHDRAWAL
    if loop.is_death_loop() and len(loop.decision_trace) > 10:
        return StrategyType.BRUTE_FORCE

    return StrategyType.UNKNOWN
```

### Applications

- **Narrative queries**: "Find all stealth attempts"
- **Strategy analysis**: "Which approach succeeded most?"
- **Compression**: Group loops by strategic family before equivalence classes
- **Policy guidance**: "Try approaches from this family"

### TypeScript Port Priority

**MEDIUM** - Useful for advanced querying and analysis.

---

## 6. Anchor Scoring with Transparent Breakdown ⭐ **HIGH**

**Location**: `src/engine/compression.py` lines 170-295
**Status**: BETTER than TypeScript
**Priority**: HIGH

### Overview

TypeScript has basic anchor selection. Python adds transparency and debuggability with explicit scoring breakdown.

### Data Structure

```python
@dataclass
class AnchorScore:
    """Score breakdown for anchor candidate."""
    loop_id: LoopID
    total_score: float
    criteria_met: List[AnchorCriteria]
    breakdown: Dict[str, float]  # Transparency
```

### Scoring Criteria (with weights)

```python
def score_anchor_candidate(loop: Loop, all_loops: List[Loop]) -> AnchorScore:
    """Score a loop as potential anchor with full breakdown."""
    score = AnchorScore(loop_id=loop.id)

    # First in epoch (+20)
    if loop.id in epoch_first_ids.values():
        score.total_score += 20
        score.criteria_met.append(AnchorCriteria.FIRST_IN_EPOCH)
        score.breakdown["first_in_epoch"] = 20

    # Major breakthrough (+15)
    if "breakthrough" in loop.tags:
        score.total_score += 15
        score.criteria_met.append(AnchorCriteria.MAJOR_BREAKTHROUGH)
        score.breakdown["breakthrough"] = 15

    # Catastrophic failure (+10)
    if loop.is_death_loop() and len(loop.decision_trace) < 5:
        score.total_score += 10
        score.criteria_met.append(AnchorCriteria.CATASTROPHIC_FAILURE)
        score.breakdown["catastrophic"] = 10

    # Unique outcome (+12)
    if is_unique_outcome(loop, all_loops):
        score.total_score += 12
        score.criteria_met.append(AnchorCriteria.UNIQUE_OUTCOME)
        score.breakdown["unique"] = 12

    # Manual designation (+25)
    if "anchor" in loop.tags:
        score.total_score += 25
        score.criteria_met.append(AnchorCriteria.MANUALLY_DESIGNATED)
        score.breakdown["manual"] = 25

    # Emotional tags (+5 each)
    emotional_tags = ["trauma", "hope", "revelation", "transformation"]
    for tag in emotional_tags:
        if tag in loop.tags:
            score.total_score += 5
            score.breakdown[f"emotion_{tag}"] = 5

    # Narrative value (+8 if long and complex)
    if len(loop.decision_trace) > 15:
        score.total_score += 8
        score.breakdown["narrative_complexity"] = 8

    return score
```

### Debug Output

```python
# Example breakdown
AnchorScore(
    loop_id="loop-abc123",
    total_score=48,
    criteria_met=[FIRST_IN_EPOCH, MAJOR_BREAKTHROUGH, UNIQUE_OUTCOME],
    breakdown={
        "first_in_epoch": 20,
        "breakthrough": 15,
        "unique": 12,
        "emotion_hope": 5
    }
)
```

### Applications

- **Debug anchor selection**: "Why was this loop chosen?"
- **Tune weights**: Adjust criteria importance
- **Narrative planning**: See what makes loops significant
- **Quality control**: Ensure anchors represent diverse criteria

### TypeScript Port Priority

**HIGH** - Transparency is valuable for debugging and tuning.

---

## 7. Sub-Loop Macro Detection **MEDIUM**

**Location**: `src/engine/compression.py` lines 470-561
**Status**: UNIQUE - TypeScript doesn't track sub-loops
**Priority**: MEDIUM

### Overview

Detect "time loop within time loop" patterns and compress them into emotional progression macros.

### Data Structure

```python
class SubLoopMacro:
    """Compressed representation of repeated sub-loop attempts."""
    id: str
    parent_loop_id: LoopID
    time_window_start: int
    time_window_end: int
    attempts_count: int
    success_rate: float
    emotional_effect: str  # frustration → mastery → numbness → dissociation
```

### Detection Algorithm

```python
def detect_subloop_patterns(
    subloops: List[SubLoop],
    min_attempts: int = 5
) -> List[SubLoopMacro]:
    """Group sub-loops by parent and time window."""

    # Group by (parent_id, time_window)
    groups: Dict[Tuple[LoopID, int, int], List[SubLoop]] = defaultdict(list)

    for sl in subloops:
        key = (sl.parent_loop_id, sl.start_time, sl.end_time)
        groups[key].append(sl)

    macros = []
    for (parent_id, start, end), sl_list in groups.items():
        if len(sl_list) < min_attempts:
            continue

        # Compute aggregates
        attempts = len(sl_list)
        successes = sum(1 for sl in sl_list if sl.best_outcome == "success")
        success_rate = successes / attempts

        # Infer emotional progression
        emotion = infer_subloop_emotion(attempts)

        macros.append(SubLoopMacro(
            parent_loop_id=parent_id,
            time_window_start=start,
            time_window_end=end,
            attempts_count=attempts,
            success_rate=success_rate,
            emotional_effect=emotion
        ))

    return macros

def infer_subloop_emotion(attempts: int) -> str:
    """Map attempt count to emotional state."""
    if attempts < 10: return "frustration"
    if attempts < 50: return "determination"
    if attempts < 100: return "mastery"
    if attempts < 500: return "numbness"
    return "dissociation"
```

### Narrative Output

```python
# From template
"He spent what felt like weeks trapped in those 8 minutes.
The same conversation, the same wrong words. 247 times.
On attempt 248, he finally got it right."
```

### TypeScript Port Priority

**MEDIUM** - Valuable for depicting nested loop complexity.

---

## 8-13: Additional Features (Summary)

**Due to length constraints, brief summaries:**

### 8. Short Loop Clustering
**Priority**: LOW
Groups early-termination loops by (death_time, death_cause) for montage generation.

### 9. Complete Story Assembly Pipeline
**Priority**: MEDIUM
`StoryAssembler` class orchestrates complete narrative from loops to prose.

### 10. Stateful Adaptive Policies
**Priority**: MEDIUM
Policies track state (tested events, desperation level, refinement count) and adapt behavior.

### 11. Production Validation
**Priority**: MEDIUM
Validates parent chains, epoch ordering, storage integrity with comprehensive error reporting.

### 12. Advanced SQLite Indexing
**Priority**: LOW
Multiple indexes on outcome, epoch, parent, knowledge, class for performant queries.

### 13. Comprehensive Test Coverage
**Priority**: HIGH (for patterns)
Tests demonstrate edge cases like equivalence transitivity, epoch regression handling.

---

## Priority Summary for TypeScript Porting

### Critical (Port First)
1. ⭐ Decision vector operations (Hamming, crossover, mutation)
2. ⭐ Triple-hash equivalence system
3. ⭐ Anchor scoring with breakdown

### High (Port Soon)
4. ⭐ Narrative prose templates (verbatim)
5. ⭐ Emotional arc tracking
6. ⭐ Test edge case patterns

### Medium (Port Later)
7. Parametric loop families
8. Sub-loop macro detection
9. Stateful policies
10. Story assembler pipeline
11. Production validation

### Low (Optional)
12. Short loop clustering
13. Advanced indexing strategies

---

## Access Archive

```bash
git checkout archive/python-implementation
cd src/
# Browse implementation
```

## See Also

- `docs/PYTHON_ALGORITHMS.md` - Standalone algorithm specifications
- `CHANGELOG.md` - Python branch disposition rationale
- `WRITING-GUIDE.md` - Practical usage guidance

---

**Document Maintenance**: Update this when porting features to TypeScript.
