# Python Implementation - Algorithm Specifications

**Document Purpose**: Standalone specifications for unique algorithms from the Python implementation, suitable for porting to any language.

**Created**: 2025-12-02
**Source**: `archive/python-implementation` branch
**Target**: TypeScript baseline (or other languages)

---

## Table of Contents

1. [Decision Vector Operations](#decision-vector-operations)
2. [Triple-Hash System](#triple-hash-system)
3. [Emotional Intensity Scoring](#emotional-intensity-scoring)
4. [Anchor Scoring Algorithm](#anchor-scoring-algorithm)
5. [Sub-Loop Macro Detection](#sub-loop-macro-detection)
6. [Parametric Family Pattern Matching](#parametric-family-pattern-matching)

---

## Decision Vector Operations

### Overview

These algorithms treat protagonist decisions as bit vectors, enabling genetic algorithm-style operations for intelligent loop generation.

**Key Insight**: If decisions are binary (warn sister: yes/no, take gun: yes/no), we can encode them as bits and use bit operations for efficient manipulation.

### Data Model

```
Decision Vector: Integer where each bit represents a binary decision

Example with 5 decisions:
Bit 0: Warn sister (0=no, 1=yes)
Bit 1: Take gun (0=no, 1=yes)
Bit 2: Trust stranger (0=no, 1=yes)
Bit 3: Use codeword (0=no, 1=yes)
Bit 4: Direct confrontation (0=stealth, 1=direct)

Vector: 0b10110 = 22 in decimal
Meaning: Direct confrontation, use codeword, trust stranger, don't take gun, don't warn sister
```

### Algorithm 1: Hamming Distance

**Purpose**: Measure how many decisions differ between two loops.

**Input**: Two decision vectors (integers)
**Output**: Count of differing bits (integer)

**Mathematical Definition**:
```
hamming_distance(v1, v2) = popcount(v1 XOR v2)

where:
- XOR gives 1 where bits differ, 0 where same
- popcount counts the number of 1s
```

**Implementation**:
```python
def hamming_distance(vec1: int, vec2: int) -> int:
    xor = vec1 ^ vec2
    return bin(xor).count('1')
```

**Example**:
```
v1 = 0b10110 (22)
v2 = 0b10010 (18)

XOR = 0b00100
popcount = 1
distance = 1 (they differ in bit 2 only)
```

**Applications**:
- Find "similar" loops: `distance <= 2` means "almost the same decisions"
- `relive()` operator: "Repeat this loop but change at most N decisions"
- Exploration radius: "Try all loops within distance 3 of this one"

---

### Algorithm 2: Vector Mutation

**Purpose**: Generate variations by flipping random bits.

**Input**: Vector (int), number of flips (int), max_bits (int)
**Output**: Mutated vector (int)

**Algorithm**:
```
1. Randomly select n_flips distinct bit positions from [0, max_bits-1]
2. For each selected position p:
     result = result XOR (1 << p)  # Toggle bit p
3. Return result
```

**Implementation**:
```python
def mutate_vector(vec: int, n_flips: int, max_bits: int = 8) -> int:
    import random
    bits_to_flip = random.sample(range(max_bits), min(n_flips, max_bits))
    result = vec
    for bit in bits_to_flip:
        result ^= (1 << bit)
    return result
```

**Example**:
```
vec = 0b10110
n_flips = 2
selected bits = [1, 4]

Flip bit 1: 0b10110 XOR 0b00010 = 0b10100
Flip bit 4: 0b10100 XOR 0b10000 = 0b00100

Result: 0b00100 (2 bits flipped)
```

**Applications**:
- `vary(loop, distance=2)`: Mutate 2 bits to explore nearby decision space
- Slight variation: `n_flips=1` for minimal change
- Major variation: `n_flips=max_bits//2` for significant difference

---

### Algorithm 3: Single-Point Crossover

**Purpose**: Combine elements from two successful loops.

**Input**: Two parent vectors (int), max_bits (int)
**Output**: Child vector (int)

**Algorithm**:
```
1. Choose random crossover point c from [0, max_bits-1]
2. Take bits [0..c-1] from vec1
3. Take bits [c..max_bits-1] from vec2
4. Combine using masks
```

**Implementation**:
```python
def crossover_vectors(vec1: int, vec2: int, max_bits: int = 8) -> int:
    import random
    crossover_point = random.randint(0, max_bits - 1)

    # Lower mask: bits [0..crossover_point-1]
    lower_mask = (1 << crossover_point) - 1

    # Upper mask: bits [crossover_point..max_bits-1]
    upper_mask = ((1 << max_bits) - 1) ^ lower_mask

    return (vec1 & lower_mask) | (vec2 & upper_mask)
```

**Example**:
```
vec1 = 0b10110
vec2 = 0b01001
max_bits = 5
crossover_point = 3

lower_mask = (1 << 3) - 1 = 0b00111
upper_mask = 0b11111 ^ 0b00111 = 0b11000

vec1 & lower_mask = 0b10110 & 0b00111 = 0b00110
vec2 & upper_mask = 0b01001 & 0b11000 = 0b01000

Result = 0b00110 | 0b01000 = 0b01110

Interpretation: Bits 0-2 from vec1, bits 3-4 from vec2
```

**Applications**:
- Combine successful strategies from two different loops
- "This loop saves sister, that loop defuses bomb - try a loop that does both approaches"
- Genetic algorithm-style exploration

---

### Algorithm 4: Random Vector Generation

**Purpose**: Generate completely new decision patterns with controlled randomness.

**Input**: max_bits (int), density (float 0.0-1.0)
**Output**: Random vector (int)

**Algorithm**:
```
1. Initialize result = 0
2. For each bit position i in [0, max_bits-1]:
     if random() < density:
         result |= (1 << i)  # Set bit i
3. Return result
```

**Implementation**:
```python
def random_vector(max_bits: int = 8, density: float = 0.5) -> int:
    import random
    result = 0
    for i in range(max_bits):
        if random.random() < density:
            result |= (1 << i)
    return result
```

**Example**:
```
max_bits = 5
density = 0.6

Random draws: [0.3, 0.7, 0.5, 0.4, 0.8]
Bits set: [0=yes, 1=no, 2=yes, 3=yes, 4=no]
Result: 0b01101 = 13
```

**Applications**:
- Pure exploration: Generate completely random loop attempts
- Controlled density: `density=0.3` → cautious (few risky choices)
- Controlled density: `density=0.8` → aggressive (many risky choices)

---

### Algorithm 5: Encode/Decode Decisions

**Purpose**: Convert between human-readable decision names and bit vectors.

**Encode Algorithm**:
```
Input: decision_flags (dict), decision_map (dict)
Output: bit vector (int)

decision_flags = {"warn_sister": True, "take_gun": False, "trust_stranger": True}
decision_map = {"warn_sister": 0, "take_gun": 1, "trust_stranger": 2, ...}

1. Initialize result = 0
2. For each (decision, made) in decision_flags:
     if made and decision in decision_map:
         bit_position = decision_map[decision]
         result |= (1 << bit_position)
3. Return result
```

**Decode Algorithm**:
```
Input: vector (int), decision_map (dict)
Output: list of decision names

1. Create reverse_map = {bit_position: decision_name}
2. Initialize result = []
3. For each (bit_pos, decision_name) in reverse_map:
     if vector & (1 << bit_pos):  # Bit is set
         result.append(decision_name)
4. Return sorted(result)
```

**Example**:
```
Encode:
{"warn_sister": True, "take_gun": True, "trust_stranger": False}
→ bits 0 and 1 set
→ 0b00011 = 3

Decode:
vector = 3 (0b00011)
→ bits 0 and 1 are set
→ ["warn_sister", "take_gun"]
```

---

## Triple-Hash System

### Overview

Complete loop state characterization using three orthogonal hash functions.

**Why Three Hashes?**

Equivalence isn't just about outcome. Two loops can have the same world outcome but:
- Different knowledge gained (one learned a secret, one didn't)
- Different emotional impact (one was traumatic, one was routine)

**Equivalence Rule**:
```
L1 ~ L2  ⟺
    outcome_hash(L1) == outcome_hash(L2) AND
    knowledge_id(L1) == knowledge_id(L2) AND
    mood_id(L1) == mood_id(L2)
```

### Algorithm 6: Outcome Hash

**Purpose**: Deterministic hash of world state outcome.

**Input**:
- survivors: Set of character IDs who survived
- deaths: Set of character IDs who died
- state_changes: Set of world state changes (e.g., "bomb_defused", "building_collapsed")
- ending_type: How loop ended ("death", "success", "timeout", etc.)

**Output**: 16-character hex hash

**Algorithm**:
```
1. Create data structure:
   {
     "survivors": sorted(survivors),
     "deaths": sorted(deaths),
     "state_changes": sorted(state_changes),
     "ending_type": ending_type
   }

2. Serialize deterministically:
   json.dumps(data, sort_keys=True)

3. Hash:
   SHA256(serialized_data)[:16]  # First 16 chars
```

**Critical Properties**:
- **Deterministic**: Same inputs ALWAYS produce same hash
- **Sorted**: Sets must be sorted before hashing for consistency
- **Collision-resistant**: SHA256 ensures different outcomes get different hashes

**Implementation**:
```python
import hashlib
import json

def compute_outcome_hash(
    survivors: Set[str],
    deaths: Set[str],
    state_changes: Set[str],
    ending_type: str
) -> str:
    data = {
        "survivors": sorted(survivors),
        "deaths": sorted(deaths),
        "state_changes": sorted(state_changes),
        "ending_type": ending_type
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

**Example**:
```
Input:
  survivors = {"protagonist", "sister"}
  deaths = {"villain", "guard"}
  state_changes = {"bomb_defused"}
  ending_type = "success"

Output:
  "a1b2c3d4e5f6g7h8"  # 16-char hash
```

---

### Algorithm 7: Knowledge Hash

**Purpose**: Deterministic hash of what protagonist knows.

**Input**:
- facts: Set of discovered facts (e.g., "bomb_location", "password")
- secrets: Set of discovered secrets (e.g., "villain_identity")
- skills: Set of gained skills (e.g., "lockpicking", "combat")

**Output**: 16-character hex hash

**Algorithm**: Identical structure to outcome hash.

**Implementation**:
```python
def compute_knowledge_id(
    facts: Set[str],
    secrets: Set[str],
    skills: Set[str]
) -> str:
    data = {
        "facts": sorted(facts),
        "secrets": sorted(secrets),
        "skills": sorted(skills)
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

---

### Algorithm 8: Mood Hash

**Purpose**: Deterministic hash of emotional state.

**Input**:
- baseline: Base emotional state (e.g., "determined", "numb", "hopeful")
- trauma_markers: Set of trauma indicators (e.g., "witnessed_death", "betrayed")
- resilience: Float from 0.0 (broken) to 1.0 (resilient)

**Output**: 16-character hex hash

**Algorithm**: Similar to above, with resilience rounded to 2 decimal places for stability.

**Implementation**:
```python
def compute_mood_id(
    baseline: str,
    trauma_markers: Set[str],
    resilience: float
) -> str:
    data = {
        "baseline": baseline,
        "trauma_markers": sorted(trauma_markers),
        "resilience": round(resilience, 2)  # Prevent float precision issues
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

**Why Round Resilience?**
Floating-point precision can cause `0.699999999` vs `0.700000001` to hash differently. Rounding to 2 decimals ensures stability.

---

## Emotional Intensity Scoring

### Algorithm 9: Compute Emotional Arc

**Purpose**: Quantify protagonist emotional state across loops for data-driven pacing.

**Input**: List of loops
**Output**: List of EmotionalPoint objects

**Data Structure**:
```python
@dataclass
class EmotionalPoint:
    loop_index: int
    loop_id: str
    emotion: str  # "hope", "determination", "frustration", "despair", "numbness"
    intensity: float  # -1.0 (max despair) to 1.0 (max hope)
```

**Algorithm**:
```
For each loop L at index i:
  1. Initialize intensity = 0.0, emotion = "determination"

  2. Apply tag-based modifiers:
     - Death: -0.3, emotion = "frustration"
     - Short loop: -0.2
     - Trauma tag: -0.4, emotion = "despair"
     - Breakthrough tag: +0.5, emotion = "hope"
     - Success tag: +0.7, emotion = "determination"

  3. Apply fatigue modifiers:
     - If i > 1000: -0.1
     - If i > 10000: -0.2, emotion = "numbness"
     - If i > 100000: -0.3, emotion = "dissociation"

  4. Clamp intensity to [-1.0, 1.0]

  5. Create EmotionalPoint(i, L.id, emotion, intensity)
```

**Implementation**:
```python
def compute_emotional_arc(loops: List[Loop]) -> List[EmotionalPoint]:
    points = []

    for i, loop in enumerate(loops):
        intensity = 0.0
        emotion = "determination"

        # Negative modifiers
        if loop.is_death_loop():
            intensity -= 0.3
            emotion = "frustration"
        if loop.is_short_loop():
            intensity -= 0.2
        if "trauma" in loop.tags:
            intensity -= 0.4
            emotion = "despair"
        if "atrocity" in loop.tags:
            intensity -= 0.6
            emotion = "self_loathing"

        # Positive modifiers
        if "breakthrough" in loop.tags:
            intensity += 0.5
            emotion = "hope"
        if "success" in loop.tags:
            intensity += 0.7
            emotion = "determination"
        if "revelation" in loop.tags:
            intensity += 0.4
            emotion = "hope"

        # Fatigue accumulation
        if i > 1000:
            intensity -= 0.1
        if i > 10000:
            intensity -= 0.2
            if emotion not in ["hope", "determination"]:
                emotion = "numbness"
        if i > 100000:
            intensity -= 0.3
            if intensity < 0:
                emotion = "dissociation"

        # Clamp
        intensity = max(-1.0, min(1.0, intensity))

        points.append(EmotionalPoint(
            loop_index=i,
            loop_id=loop.id,
            emotion=emotion,
            intensity=intensity
        ))

    return points
```

---

### Algorithm 10: Find Emotional Peaks

**Purpose**: Identify hope peaks (local maxima) and despair valleys (local minima).

**Input**: List of EmotionalPoint objects
**Output**: (hope_peak_indices, despair_valley_indices)

**Algorithm**:
```
1. Initialize hope_peaks = [], despair_valleys = []

2. For each point at index i (excluding first and last):
     prev_intensity = points[i-1].intensity
     curr_intensity = points[i].intensity
     next_intensity = points[i+1].intensity

     # Local maximum (hope peak)
     if curr > prev AND curr > next AND curr > 0.3:
         hope_peaks.append(i)

     # Local minimum (despair valley)
     if curr < prev AND curr < next AND curr < -0.3:
         despair_valleys.append(i)

3. Return (hope_peaks, despair_valleys)
```

**Threshold Rationale**:
- `0.3`: Only consider significant hope (not mild optimism)
- `-0.3`: Only consider significant despair (not mild frustration)

**Applications**:
- Pacing analysis: Too many peaks? Story feels repetitive. Too few? Lacks hope.
- Anchor selection: Peaks and valleys are narratively significant
- Arc validation: Ensure emotional journey is varied

---

## Anchor Scoring Algorithm

### Algorithm 11: Score Anchor Candidate

**Purpose**: Transparently score loops for narrative significance.

**Input**: Loop, all loops, epoch first IDs
**Output**: AnchorScore with breakdown

**Criteria and Weights**:
```
first_in_epoch:         +20
major_breakthrough:     +15
unique_outcome:         +12
catastrophic_failure:   +10
narrative_complexity:   +8
emotion_tag:            +5 (per emotional tag)
manually_designated:    +25
```

**Algorithm**:
```
1. Initialize score = AnchorScore(loop_id=loop.id)

2. Check criteria:

   If loop is first in its epoch:
     score.total += 20
     score.criteria_met.append(FIRST_IN_EPOCH)
     score.breakdown["first_in_epoch"] = 20

   If "breakthrough" in loop.tags:
     score.total += 15
     score.criteria_met.append(MAJOR_BREAKTHROUGH)
     score.breakdown["breakthrough"] = 15

   If loop.outcome_hash appears only once in all loops:
     score.total += 12
     score.criteria_met.append(UNIQUE_OUTCOME)
     score.breakdown["unique"] = 12

   If loop is death AND trace_length < 5:
     score.total += 10
     score.criteria_met.append(CATASTROPHIC_FAILURE)
     score.breakdown["catastrophic"] = 10

   If len(loop.decision_trace) > 15:
     score.total += 8
     score.breakdown["narrative_complexity"] = 8

   For each tag in ["trauma", "hope", "revelation", "transformation"]:
     If tag in loop.tags:
       score.total += 5
       score.breakdown[f"emotion_{tag}"] = 5

   If "anchor" in loop.tags (manual designation):
     score.total += 25
     score.criteria_met.append(MANUALLY_DESIGNATED)
     score.breakdown["manual"] = 25

3. Return score
```

**Implementation**:
```python
@dataclass
class AnchorScore:
    loop_id: LoopID
    total_score: float = 0.0
    criteria_met: List[AnchorCriteria] = field(default_factory=list)
    breakdown: Dict[str, float] = field(default_factory=dict)

def score_anchor_candidate(
    loop: Loop,
    all_loops: List[Loop],
    epoch_first_ids: Dict[EpochType, LoopID] = None
) -> AnchorScore:
    score = AnchorScore(loop_id=loop.id)

    # First in epoch
    if epoch_first_ids and loop.id in epoch_first_ids.values():
        score.total_score += 20
        score.criteria_met.append(AnchorCriteria.FIRST_IN_EPOCH)
        score.breakdown["first_in_epoch"] = 20

    # Breakthrough
    if "breakthrough" in loop.tags:
        score.total_score += 15
        score.criteria_met.append(AnchorCriteria.MAJOR_BREAKTHROUGH)
        score.breakdown["breakthrough"] = 15

    # Unique outcome
    outcome_count = sum(1 for l in all_loops if l.outcome_hash == loop.outcome_hash)
    if outcome_count == 1:
        score.total_score += 12
        score.criteria_met.append(AnchorCriteria.UNIQUE_OUTCOME)
        score.breakdown["unique"] = 12

    # Catastrophic failure
    if loop.is_death_loop() and len(loop.decision_trace) < 5:
        score.total_score += 10
        score.criteria_met.append(AnchorCriteria.CATASTROPHIC_FAILURE)
        score.breakdown["catastrophic"] = 10

    # Narrative complexity
    if len(loop.decision_trace) > 15:
        score.total_score += 8
        score.breakdown["narrative_complexity"] = 8

    # Emotional tags
    emotional_tags = ["trauma", "hope", "revelation", "transformation"]
    for tag in emotional_tags:
        if tag in loop.tags:
            score.total_score += 5
            score.breakdown[f"emotion_{tag}"] = 5

    # Manual designation
    if "anchor" in loop.tags:
        score.total_score += 25
        score.criteria_met.append(AnchorCriteria.MANUALLY_DESIGNATED)
        score.breakdown["manual"] = 25

    return score
```

**Tuning**:
Adjust weights based on story needs. Example:
- Emotional story → increase emotion_tag weight to +8
- Plot-driven story → increase unique_outcome weight to +20

---

## Sub-Loop Macro Detection

### Algorithm 12: Detect Sub-Loop Patterns

**Purpose**: Group repeated sub-loop attempts into compressed macros.

**Input**: List of SubLoop objects, min_attempts threshold
**Output**: List of SubLoopMacro objects

**Algorithm**:
```
1. Group sub-loops by key = (parent_id, start_time, end_time)
   groups = defaultdict(list)
   for sl in subloops:
       key = (sl.parent_loop_id, sl.start_time, sl.end_time)
       groups[key].append(sl)

2. For each group with >= min_attempts:
     a. Count attempts = len(group)
     b. Count successes = sum(1 for sl if sl.best_outcome == "success")
     c. success_rate = successes / attempts
     d. emotion = infer_emotion(attempts)
     e. Create SubLoopMacro

3. Return list of macros
```

**Emotion Inference**:
```
def infer_subloop_emotion(attempts: int) -> str:
    if attempts < 10: return "frustration"
    if attempts < 50: return "determination"
    if attempts < 100: return "mastery"
    if attempts < 500: return "numbness"
    return "dissociation"
```

**Rationale**:
- < 10: Initial frustration
- 10-49: Determined practice
- 50-99: Achieving mastery
- 100-499: Becoming numb to repetition
- 500+: Complete dissociation

---

## Parametric Family Pattern Matching

### Algorithm 13: Wildcard Bit Matching

**Purpose**: Match loops to families using pattern with wildcards.

**Concept**:
```
Pattern: "Must take gun, don't care about other decisions"
pattern = 0b00000010  (bit 1 set = take gun)
mask    = 0b00000010  (only check bit 1, ignore others)

Loop 1: 0b10110110  → matches (bit 1 is set)
Loop 2: 0b00000010  → matches (bit 1 is set)
Loop 3: 0b00000000  → doesn't match (bit 1 not set)
```

**Algorithm**:
```
Input:
  - loop.key_choices (int)
  - family.key_choices_pattern (int)
  - family.key_choices_mask (int)

Output: boolean

1. Extract relevant bits from loop:
   masked_loop = loop.key_choices & family.mask

2. Extract relevant bits from pattern:
   masked_pattern = family.pattern & family.mask

3. Compare:
   return masked_loop == masked_pattern
```

**Implementation**:
```python
def matches_loop(family: LoopFamily, loop: Loop) -> bool:
    """Check if loop matches family pattern."""
    masked_loop = loop.key_choices & family.key_choices_mask
    masked_pattern = family.key_choices_pattern & family.key_choices_mask
    return masked_loop == masked_pattern
```

**Example**:
```
Family: "Stealth with gun, any other decisions"
pattern = 0b00000010  (bit 1 = take gun)
mask    = 0b11110010  (check bits 1,4,5,6,7; ignore 0,2,3)

Loop A: 0b10110010 & 0b11110010 = 0b10110010
Pattern: 0b00000010 & 0b11110010 = 0b00000010
Match? 0b10110010 == 0b00000010? NO (bits 4,5 differ)

Wait, let me recalculate:
Loop A: 0b10110010
Mask:   0b11110010
Result: 0b10110010  (all masked bits from loop)

Pattern: 0b00000010
Mask:    0b11110010
Result:  0b00000010  (all masked bits from pattern)

These don't match, so this loop doesn't belong to this family.

Let's try Loop B: 0b00100010
Masked:  0b00100010 & 0b11110010 = 0b00100010
Pattern: 0b00000010 & 0b11110010 = 0b00000010
Match? NO

Actually, the mask determines WHICH bits to check. Let me reconsider:

If mask = 0b00000010 (only bit 1),
then we only care about bit 1.

Loop: 0b10110010 & 0b00000010 = 0b00000010 ✓
Pattern: 0b00000010 & 0b00000010 = 0b00000010 ✓
Match: YES (bit 1 matches, others ignored)
```

---

## Conclusion

These algorithms provide the mathematical foundation for intelligent loop generation, precise compression, and data-driven narrative quality control.

**Porting Priority**:
1. Decision vector operations (critical for loop generation)
2. Triple-hash system (critical for accurate equivalence)
3. Emotional intensity scoring (valuable for narrative quality)
4. Anchor scoring (valuable for debugging)
5. Sub-loop macros, parametric families (nice-to-have)

**Next Steps**:
- Implement in TypeScript with tests
- Validate against Python reference implementation
- Optimize for performance (bit operations are already fast)

---

**See Also**:
- `docs/PYTHON_UNIQUE_FEATURES.md` - Complete feature documentation
- `archive/python-implementation` - Reference implementation
