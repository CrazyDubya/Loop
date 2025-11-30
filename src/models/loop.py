"""
Core Loop models for the Loop Engine.

This module defines the primary data structures:
- Loop: A single traversal of the day graph
- SubLoop: A nested reset within a single loop
- LoopClass: An equivalence class grouping similar loops
- Tag: Categorization system for loops
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional, Set

from pydantic import BaseModel, Field, field_validator


# === Type Aliases ===
LoopID = str
ClassID = str
NodeID = str
TimeSlot = int


# === Enums ===

class EpochType(str, Enum):
    """Major phases of the protagonist's journey."""
    NAIVE = "naive"
    MAPPING = "mapping"
    OBSESSION = "obsession"
    RUTHLESS = "ruthless"
    SYNTHESIS = "synthesis"


class LoopTag(str, Enum):
    """Common tags for loop categorization."""
    FIRST_LOOP = "first_loop"
    DEATH = "death"
    EXPLOSION = "explosion"
    SISTER_SAVED = "sister_saved"
    SISTER_DEAD = "sister_dead"
    VILLAIN_CAUGHT = "villain_caught"
    VILLAIN_ESCAPED = "villain_escaped"
    BOMB_DEFUSED = "bomb_defused"
    PERFECT_RUN = "perfect_run"
    SHORT_LOOP = "short_loop"
    BREAKTHROUGH = "breakthrough"
    ANCHOR = "anchor"


# === ID Generation ===

def generate_loop_id() -> LoopID:
    """Generate a unique loop ID."""
    return f"loop-{uuid.uuid4().hex[:12]}"


def generate_class_id() -> ClassID:
    """Generate a unique class ID."""
    return f"class-{uuid.uuid4().hex[:12]}"


def generate_subloop_id() -> str:
    """Generate a unique subloop ID."""
    return f"subloop-{uuid.uuid4().hex[:12]}"


# === Hashing Functions ===

def compute_outcome_hash(
    survivors: Set[str],
    deaths: Set[str],
    state_changes: Set[str],
    ending_type: str
) -> str:
    """
    Compute deterministic hash of loop outcome.

    Same inputs MUST produce same hash. This is critical
    for equivalence class assignment.

    Args:
        survivors: Set of character IDs who survived
        deaths: Set of character IDs who died
        state_changes: Set of world state changes
        ending_type: How the loop ended (e.g., "death", "success", "timeout")

    Returns:
        16-character hex hash
    """
    data = {
        "survivors": sorted(survivors),
        "deaths": sorted(deaths),
        "state_changes": sorted(state_changes),
        "ending_type": ending_type
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def compute_knowledge_id(
    facts: Set[str],
    secrets: Set[str],
    skills: Set[str]
) -> str:
    """
    Compute deterministic hash of knowledge state.

    Two loops with same knowledge hash are interchangeable
    for equivalence purposes.

    Args:
        facts: Set of known facts
        secrets: Set of discovered secrets
        skills: Set of gained skills

    Returns:
        16-character hex hash
    """
    data = {
        "facts": sorted(facts),
        "secrets": sorted(secrets),
        "skills": sorted(skills)
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def compute_mood_id(
    baseline: str,
    trauma_markers: Set[str],
    resilience: float
) -> str:
    """
    Compute deterministic hash of mood state.

    Args:
        baseline: Base emotional state
        trauma_markers: Set of trauma indicators
        resilience: Resilience score (0.0 to 1.0)

    Returns:
        16-character hex hash
    """
    data = {
        "baseline": baseline,
        "trauma_markers": sorted(trauma_markers),
        "resilience": round(resilience, 2)
    }
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


# === Decision Vector Operations ===

def hamming_distance(vec1: int, vec2: int) -> int:
    """
    Count differing bits between two decision vectors.

    Args:
        vec1: First decision vector as integer
        vec2: Second decision vector as integer

    Returns:
        Number of bits that differ
    """
    xor = vec1 ^ vec2
    return bin(xor).count('1')


def mutate_vector(vec: int, n_flips: int, max_bits: int = 8) -> int:
    """
    Flip n random bits in a decision vector.

    Args:
        vec: Original decision vector
        n_flips: Number of bits to flip
        max_bits: Maximum bit position to consider

    Returns:
        Mutated vector
    """
    import random
    bits_to_flip = random.sample(range(max_bits), min(n_flips, max_bits))
    result = vec
    for bit in bits_to_flip:
        result ^= (1 << bit)
    return result


def encode_decisions(decision_flags: dict[str, bool], decision_map: dict[str, int]) -> int:
    """
    Convert decision flags to bit vector.

    Args:
        decision_flags: Dict of decision_name -> True/False
        decision_map: Dict of decision_name -> bit_position

    Returns:
        Integer representing the decision vector
    """
    result = 0
    for decision, made in decision_flags.items():
        if made and decision in decision_map:
            result |= (1 << decision_map[decision])
    return result


def decode_decisions(vec: int, decision_map: dict[str, int]) -> List[str]:
    """
    Convert bit vector to list of decision names.

    Args:
        vec: Decision vector as integer
        decision_map: Dict of decision_name -> bit_position

    Returns:
        List of decisions that were made (bit = 1)
    """
    reverse_map = {v: k for k, v in decision_map.items()}
    result = []
    for bit_pos, decision_name in reverse_map.items():
        if vec & (1 << bit_pos):
            result.append(decision_name)
    return sorted(result)


def crossover_vectors(vec1: int, vec2: int, max_bits: int = 8) -> int:
    """
    Combine two decision vectors using single-point crossover.

    Takes bits 0..crossover_point from vec1 and remaining from vec2.

    Args:
        vec1: First parent decision vector
        vec2: Second parent decision vector
        max_bits: Maximum bit position to consider

    Returns:
        Child vector combining both parents
    """
    import random
    crossover_point = random.randint(0, max_bits - 1)

    # Mask for lower bits (from vec1)
    lower_mask = (1 << crossover_point) - 1
    # Mask for upper bits (from vec2)
    upper_mask = ((1 << max_bits) - 1) ^ lower_mask

    return (vec1 & lower_mask) | (vec2 & upper_mask)


def random_vector(max_bits: int = 8, density: float = 0.5) -> int:
    """
    Generate a random decision vector.

    Args:
        max_bits: Number of bits in the vector
        density: Probability of each bit being 1 (default 0.5)

    Returns:
        Random decision vector as integer
    """
    import random
    result = 0
    for i in range(max_bits):
        if random.random() < density:
            result |= (1 << i)
    return result


# === Core Models ===

class Loop(BaseModel):
    """
    A single traversal of the day graph.

    This is the primary data object. Each loop represents one
    complete journey from wake-up to reset.
    """
    id: LoopID = Field(default_factory=generate_loop_id)
    parent_id: Optional[LoopID] = None
    epoch: EpochType = EpochType.NAIVE
    key_choices: int = 0  # Bit vector of decisions
    outcome_hash: str = ""
    knowledge_id: str = ""
    mood_id: str = ""
    tags: List[str] = Field(default_factory=list)
    decision_trace: List[NodeID] = Field(default_factory=list)
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())

    # Optional metadata
    notes: Optional[str] = None
    class_id: Optional[ClassID] = None  # Assigned equivalence class

    @field_validator('tags', mode='before')
    @classmethod
    def ensure_list(cls, v):
        if isinstance(v, str):
            return [v]
        return v or []

    def add_tag(self, tag: str) -> None:
        """Add a tag if not already present."""
        if tag not in self.tags:
            self.tags.append(tag)

    def has_tag(self, tag: str) -> bool:
        """Check if loop has a specific tag."""
        return tag in self.tags

    def is_death_loop(self) -> bool:
        """Check if this loop ended in death."""
        return LoopTag.DEATH.value in self.tags or "death" in self.outcome_hash

    def is_short_loop(self, threshold: int = 4) -> bool:
        """Check if loop terminated early."""
        return len(self.decision_trace) < threshold

    def compute_hashes(
        self,
        survivors: Set[str],
        deaths: Set[str],
        state_changes: Set[str],
        ending_type: str,
        facts: Set[str],
        secrets: Set[str],
        skills: Set[str],
        baseline_mood: str = "neutral",
        trauma: Set[str] = None,
        resilience: float = 0.5
    ) -> None:
        """Compute and set all hash fields."""
        self.outcome_hash = compute_outcome_hash(survivors, deaths, state_changes, ending_type)
        self.knowledge_id = compute_knowledge_id(facts, secrets, skills)
        self.mood_id = compute_mood_id(baseline_mood, trauma or set(), resilience)


class SubLoop(BaseModel):
    """
    A nested reset within a single loop.

    Represents the protagonist rewinding to an earlier point
    within the same day, creating a "loop within a loop."
    """
    id: str = Field(default_factory=generate_subloop_id)
    parent_loop_id: LoopID
    start_time: TimeSlot
    end_time: TimeSlot
    attempts_count: int = 1
    best_outcome_hash: str = ""
    knowledge_gained: List[str] = Field(default_factory=list)
    emotional_effect: str = "neutral"  # frustration, mastery, numbness, etc.

    @field_validator('end_time')
    @classmethod
    def end_after_start(cls, v, info):
        if 'start_time' in info.data and v <= info.data['start_time']:
            raise ValueError('end_time must be greater than start_time')
        return v

    def duration(self) -> int:
        """Time slots in this sub-loop window."""
        return self.end_time - self.start_time

    def is_hell_loop(self, threshold: int = 50) -> bool:
        """Check if this is a 'trapped' scenario."""
        return self.attempts_count >= threshold


class LoopClass(BaseModel):
    """
    An equivalence class grouping similar loops.

    Loops are equivalent if they have the same outcome_hash
    AND knowledge_id. This allows compression of millions
    of loops into manageable groups.
    """
    id: ClassID = Field(default_factory=generate_class_id)
    outcome_hash: str
    knowledge_id: str  # Added for full equivalence
    knowledge_delta: List[str] = Field(default_factory=list)
    mood_delta: str = ""
    count: int = 1
    representative_id: Optional[LoopID] = None
    sample_ids: List[LoopID] = Field(default_factory=list)

    # Metadata
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    notes: Optional[str] = None

    def equivalence_key(self) -> tuple:
        """Return the key used for equivalence comparison."""
        return (self.outcome_hash, self.knowledge_id)

    def add_loop(self, loop_id: LoopID) -> None:
        """Add a loop to this class."""
        self.count += 1
        if len(self.sample_ids) < 5:
            self.sample_ids.append(loop_id)

    def compression_ratio(self) -> float:
        """How many loops this class represents per sample."""
        if not self.sample_ids:
            return 0.0
        return self.count / len(self.sample_ids)


# === Utility Functions ===

def loops_equivalent(loop1: Loop, loop2: Loop) -> bool:
    """
    Check if two loops are equivalent for grouping purposes.

    Two loops are equivalent if they have the same outcome
    AND the same knowledge state at the end.
    """
    return (
        loop1.outcome_hash == loop2.outcome_hash and
        loop1.knowledge_id == loop2.knowledge_id
    )


def create_class_from_loop(loop: Loop) -> LoopClass:
    """Create a new equivalence class from a loop."""
    return LoopClass(
        outcome_hash=loop.outcome_hash,
        knowledge_id=loop.knowledge_id,
        representative_id=loop.id,
        sample_ids=[loop.id],
        count=1
    )
