"""
Knowledge and Mood models for the Loop Engine.

This module defines:
- KnowledgeProfile: What the protagonist knows
- MoodProfile: Psychological/emotional state
- Discovery tracking and knowledge progression
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import List, Optional, Set

from pydantic import BaseModel, Field


# === Enums ===

class EmotionalBaseline(str, Enum):
    """Primary emotional states."""
    NEUTRAL = "neutral"
    HOPEFUL = "hopeful"
    DESPERATE = "desperate"
    NUMB = "numb"
    DETERMINED = "determined"
    CURIOUS = "curious"
    TRAUMATIZED = "traumatized"
    RESIGNED = "resigned"
    TRIUMPHANT = "triumphant"
    PARANOID = "paranoid"


class TraumaMarker(str, Enum):
    """Types of psychological trauma from loop experiences."""
    WITNESSED_DEATH = "witnessed_death"
    CAUSED_DEATH = "caused_death"
    FAILED_SAVE = "failed_save"
    BETRAYED = "betrayed"
    TORTURED = "tortured"
    ISOLATION = "isolation"
    HELPLESSNESS = "helplessness"
    REPETITION_FATIGUE = "repetition_fatigue"
    MORAL_INJURY = "moral_injury"


class SkillType(str, Enum):
    """Skills that can be gained through loops."""
    COMBAT = "combat"
    STEALTH = "stealth"
    PERSUASION = "persuasion"
    BOMB_DEFUSAL = "bomb_defusal"
    LOCKPICKING = "lockpicking"
    FIRST_AID = "first_aid"
    DRIVING = "driving"
    HACKING = "hacking"


# === Knowledge Profile ===

class KnowledgeProfile(BaseModel):
    """
    Represents what the protagonist knows.

    Knowledge accumulates across loops. Facts are general information,
    secrets are hidden truths, and skills are learned abilities.
    """
    id: str = ""
    facts_known: Set[str] = Field(default_factory=set)
    secrets_discovered: Set[str] = Field(default_factory=set)
    skills_gained: Set[str] = Field(default_factory=set)

    # Metadata
    loop_count_at_acquisition: dict = Field(default_factory=dict)  # fact -> loop#

    def compute_id(self) -> str:
        """Compute and set the knowledge hash ID."""
        data = {
            "facts": sorted(self.facts_known),
            "secrets": sorted(self.secrets_discovered),
            "skills": sorted(self.skills_gained)
        }
        serialized = json.dumps(data, sort_keys=True)
        self.id = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return self.id

    def learn_fact(self, fact: str, loop_number: Optional[int] = None) -> bool:
        """
        Learn a new fact. Returns True if this is new knowledge.
        """
        if fact in self.facts_known:
            return False
        self.facts_known.add(fact)
        if loop_number is not None:
            self.loop_count_at_acquisition[fact] = loop_number
        return True

    def discover_secret(self, secret: str, loop_number: Optional[int] = None) -> bool:
        """
        Discover a new secret. Returns True if this is new.
        """
        if secret in self.secrets_discovered:
            return False
        self.secrets_discovered.add(secret)
        if loop_number is not None:
            self.loop_count_at_acquisition[secret] = loop_number
        return True

    def gain_skill(self, skill: str, loop_number: Optional[int] = None) -> bool:
        """
        Gain a new skill. Returns True if this is new.
        """
        if skill in self.skills_gained:
            return False
        self.skills_gained.add(skill)
        if loop_number is not None:
            self.loop_count_at_acquisition[skill] = loop_number
        return True

    def knows(self, item: str) -> bool:
        """Check if protagonist knows a fact, secret, or skill."""
        return (
            item in self.facts_known or
            item in self.secrets_discovered or
            item in self.skills_gained
        )

    def total_knowledge(self) -> int:
        """Total number of known items."""
        return len(self.facts_known) + len(self.secrets_discovered) + len(self.skills_gained)

    def knowledge_delta(self, other: 'KnowledgeProfile') -> 'KnowledgeProfile':
        """
        Return what this profile knows that other doesn't.
        """
        return KnowledgeProfile(
            facts_known=self.facts_known - other.facts_known,
            secrets_discovered=self.secrets_discovered - other.secrets_discovered,
            skills_gained=self.skills_gained - other.skills_gained
        )

    def merge(self, other: 'KnowledgeProfile') -> 'KnowledgeProfile':
        """
        Combine knowledge from two profiles.
        """
        return KnowledgeProfile(
            facts_known=self.facts_known | other.facts_known,
            secrets_discovered=self.secrets_discovered | other.secrets_discovered,
            skills_gained=self.skills_gained | other.skills_gained
        )

    @classmethod
    def empty(cls) -> 'KnowledgeProfile':
        """Create an empty knowledge profile."""
        return cls()

    @classmethod
    def from_sets(
        cls,
        facts: Set[str] = None,
        secrets: Set[str] = None,
        skills: Set[str] = None
    ) -> 'KnowledgeProfile':
        """Create a profile from sets."""
        profile = cls(
            facts_known=facts or set(),
            secrets_discovered=secrets or set(),
            skills_gained=skills or set()
        )
        profile.compute_id()
        return profile


# === Mood Profile ===

class MoodProfile(BaseModel):
    """
    Represents the protagonist's psychological/emotional state.

    Mood evolves based on loop experiences. Trauma accumulates,
    resilience can grow or diminish, and baseline emotions shift.
    """
    id: str = ""
    baseline_emotion: EmotionalBaseline = EmotionalBaseline.NEUTRAL
    trauma_markers: Set[str] = Field(default_factory=set)
    resilience_score: float = Field(default=0.5, ge=0.0, le=1.0)

    # Detailed tracking
    hope_level: float = Field(default=0.5, ge=0.0, le=1.0)
    despair_level: float = Field(default=0.0, ge=0.0, le=1.0)
    numbness_level: float = Field(default=0.0, ge=0.0, le=1.0)
    determination_level: float = Field(default=0.5, ge=0.0, le=1.0)

    # History
    loops_since_last_success: int = 0
    total_deaths_witnessed: int = 0
    total_deaths_caused: int = 0

    def compute_id(self) -> str:
        """Compute and set the mood hash ID."""
        data = {
            "baseline": self.baseline_emotion.value,
            "trauma_markers": sorted(self.trauma_markers),
            "resilience": round(self.resilience_score, 2)
        }
        serialized = json.dumps(data, sort_keys=True)
        self.id = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return self.id

    def add_trauma(self, marker: str) -> None:
        """Add a trauma marker."""
        self.trauma_markers.add(marker)
        # Trauma reduces resilience
        self.resilience_score = max(0.0, self.resilience_score - 0.05)

    def witness_death(self) -> None:
        """Record witnessing a death."""
        self.total_deaths_witnessed += 1
        if self.total_deaths_witnessed > 10:
            self.add_trauma(TraumaMarker.WITNESSED_DEATH.value)

    def cause_death(self) -> None:
        """Record causing a death."""
        self.total_deaths_caused += 1
        self.add_trauma(TraumaMarker.CAUSED_DEATH.value)

    def record_failure(self) -> None:
        """Record a failed loop."""
        self.loops_since_last_success += 1
        self.hope_level = max(0.0, self.hope_level - 0.02)
        self.despair_level = min(1.0, self.despair_level + 0.01)

        if self.loops_since_last_success > 100:
            self.numbness_level = min(1.0, self.numbness_level + 0.1)
            self.add_trauma(TraumaMarker.REPETITION_FATIGUE.value)

    def record_success(self) -> None:
        """Record a successful loop."""
        self.loops_since_last_success = 0
        self.hope_level = min(1.0, self.hope_level + 0.1)
        self.despair_level = max(0.0, self.despair_level - 0.05)
        self.resilience_score = min(1.0, self.resilience_score + 0.02)

    def update_baseline(self) -> None:
        """Update baseline emotion based on current levels."""
        if self.numbness_level > 0.7:
            self.baseline_emotion = EmotionalBaseline.NUMB
        elif self.despair_level > 0.7:
            self.baseline_emotion = EmotionalBaseline.DESPERATE
        elif self.hope_level > 0.7:
            self.baseline_emotion = EmotionalBaseline.HOPEFUL
        elif self.determination_level > 0.7:
            self.baseline_emotion = EmotionalBaseline.DETERMINED
        elif len(self.trauma_markers) > 3:
            self.baseline_emotion = EmotionalBaseline.TRAUMATIZED
        else:
            self.baseline_emotion = EmotionalBaseline.NEUTRAL

    def is_broken(self) -> bool:
        """Check if protagonist is psychologically broken."""
        return (
            self.numbness_level > 0.9 or
            self.despair_level > 0.9 or
            len(self.trauma_markers) > 5
        )

    def can_continue(self) -> bool:
        """Check if protagonist can keep going."""
        return not self.is_broken() and (
            self.hope_level > 0.1 or
            self.determination_level > 0.3 or
            self.resilience_score > 0.2
        )

    @classmethod
    def fresh(cls) -> 'MoodProfile':
        """Create a fresh, neutral mood profile."""
        return cls()

    @classmethod
    def hardened(cls) -> 'MoodProfile':
        """Create a profile for someone who's been through many loops."""
        return cls(
            baseline_emotion=EmotionalBaseline.DETERMINED,
            resilience_score=0.8,
            numbness_level=0.3,
            hope_level=0.4,
            determination_level=0.9
        )


# === Convenience Functions ===

def empty_knowledge() -> KnowledgeProfile:
    """Create empty knowledge profile."""
    return KnowledgeProfile.empty()


def fresh_mood() -> MoodProfile:
    """Create fresh mood profile."""
    return MoodProfile.fresh()
