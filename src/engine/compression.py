"""
Compression System for the Loop Engine.

Implements the compression "cheats" that collapse vast numbers of loops
into coherent groupings:

- Equivalence classes: loops with same outcome_hash + knowledge_id
- Parametric families: strategy-based groupings
- Anchor selection: narratively important loops
- Montage compression: narrative summaries of loop clusters
- Short loop clustering: early termination patterns
- Sub-loop macros: repeated segment compression
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Set, Tuple, TYPE_CHECKING

from pydantic import BaseModel, Field

from src.models import (
    Loop,
    LoopID,
    LoopClass,
    ClassID,
    NodeID,
    SubLoop,
    EpochType,
    loops_equivalent,
    create_class_from_loop,
    hamming_distance,
)

if TYPE_CHECKING:
    from src.engine.storage import LoopStorage


# === Equivalence Key ===

def compute_equivalence_key(loop: Loop) -> Tuple[str, str]:
    """
    Compute the equivalence key for a loop.

    Two loops with the same key are equivalent.

    Args:
        loop: The loop to compute key for

    Returns:
        Tuple of (outcome_hash, knowledge_id)
    """
    return (loop.outcome_hash, loop.knowledge_id)


def loops_in_same_class(loop1: Loop, loop2: Loop) -> bool:
    """
    Check if two loops belong to the same equivalence class.

    This is an alias for loops_equivalent with clearer semantics.
    """
    return loops_equivalent(loop1, loop2)


# === Parametric Families ===

class StrategyType(str, Enum):
    """Strategy categories for loop families."""
    BRUTE_FORCE = "brute_force"
    STEALTH = "stealth"
    PERSUASION = "persuasion"
    WITHDRAWAL = "withdrawal"
    SACRIFICE = "sacrifice"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    """Risk level categories."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class LoopFamily(BaseModel):
    """
    A parametric family grouping loops by strategy and characteristics.

    Families help identify patterns across equivalence classes.
    """
    id: str = Field(default_factory=lambda: f"family-{hashlib.md5(str(id({})).encode()).hexdigest()[:8]}")
    name: str = ""
    strategy_type: StrategyType = StrategyType.UNKNOWN
    risk_level: RiskLevel = RiskLevel.MEDIUM
    key_choices_pattern: int = 0  # Bit pattern for required choices
    key_choices_mask: int = 0  # Which bits matter (wildcards = 0)
    typical_outcome: str = ""
    class_ids: List[ClassID] = Field(default_factory=list)
    total_loops: int = 0

    def matches_loop(self, loop: Loop) -> bool:
        """Check if a loop matches this family's pattern."""
        # Apply mask and check pattern
        masked_choices = loop.key_choices & self.key_choices_mask
        return masked_choices == (self.key_choices_pattern & self.key_choices_mask)

    def add_class(self, class_id: ClassID, loop_count: int = 0) -> None:
        """Add a class to this family."""
        if class_id not in self.class_ids:
            self.class_ids.append(class_id)
        self.total_loops += loop_count


def infer_strategy(loop: Loop, death_nodes: Set[NodeID] = None) -> StrategyType:
    """
    Infer the strategy type from a loop's characteristics.

    This is a heuristic based on decision trace and tags.
    """
    trace = set(loop.decision_trace)
    tags = set(loop.tags)

    # Check for withdrawal (short loops, early exits)
    if len(loop.decision_trace) < 4:
        return StrategyType.WITHDRAWAL

    # Check for sacrifice (specific tags)
    if "sacrifice" in tags or "self_sacrifice" in tags:
        return StrategyType.SACRIFICE

    # Check tags for explicit strategies
    if "stealth" in tags or "sneak" in tags:
        return StrategyType.STEALTH
    if "persuade" in tags or "talk" in tags or "negotiate" in tags:
        return StrategyType.PERSUASION
    if "force" in tags or "fight" in tags or "brute" in tags:
        return StrategyType.BRUTE_FORCE

    # Default heuristic based on trace length and outcome
    if loop.is_death_loop():
        # Deaths with long traces suggest brute force
        if len(loop.decision_trace) > 10:
            return StrategyType.BRUTE_FORCE

    return StrategyType.UNKNOWN


def infer_risk_level(loop: Loop) -> RiskLevel:
    """
    Infer risk level from loop characteristics.
    """
    # Death loops are high risk by definition
    if loop.is_death_loop():
        if len(loop.decision_trace) < 5:
            return RiskLevel.EXTREME
        return RiskLevel.HIGH

    # Short successful loops suggest low risk
    if len(loop.decision_trace) < 6:
        return RiskLevel.LOW

    # Long loops with success suggest medium risk
    return RiskLevel.MEDIUM


# === Anchor Selection ===

class AnchorCriteria(str, Enum):
    """Criteria for selecting anchor loops."""
    FIRST_IN_EPOCH = "first_in_epoch"
    MAJOR_BREAKTHROUGH = "major_breakthrough"
    CATASTROPHIC_FAILURE = "catastrophic_failure"
    EMOTIONALLY_SIGNIFICANT = "emotionally_significant"
    HIGH_NARRATIVE_VALUE = "high_narrative_value"
    UNIQUE_OUTCOME = "unique_outcome"
    MANUALLY_DESIGNATED = "manually_designated"


@dataclass
class AnchorScore:
    """Score breakdown for an anchor candidate."""
    loop_id: LoopID
    total_score: float = 0.0
    criteria_met: List[AnchorCriteria] = field(default_factory=list)
    breakdown: Dict[str, float] = field(default_factory=dict)


def score_anchor_candidate(
    loop: Loop,
    all_loops: List[Loop],
    epoch_first_ids: Dict[EpochType, LoopID] = None
) -> AnchorScore:
    """
    Score a loop as a potential anchor.

    Higher scores indicate more narratively important loops.
    """
    score = AnchorScore(loop_id=loop.id)

    # First in epoch bonus
    if epoch_first_ids and epoch_first_ids.get(loop.epoch) == loop.id:
        score.total_score += 20
        score.criteria_met.append(AnchorCriteria.FIRST_IN_EPOCH)
        score.breakdown["first_in_epoch"] = 20

    # Breakthrough tags
    breakthrough_tags = {"breakthrough", "revelation", "discovery", "success"}
    if any(tag in loop.tags for tag in breakthrough_tags):
        score.total_score += 15
        score.criteria_met.append(AnchorCriteria.MAJOR_BREAKTHROUGH)
        score.breakdown["breakthrough"] = 15

    # Catastrophic failure
    if loop.is_death_loop() and len(loop.decision_trace) > 8:
        score.total_score += 10
        score.criteria_met.append(AnchorCriteria.CATASTROPHIC_FAILURE)
        score.breakdown["catastrophic_failure"] = 10

    # Emotional significance (tags)
    emotional_tags = {"trauma", "grief", "joy", "rage", "despair", "hope"}
    emotional_count = sum(1 for tag in loop.tags if tag in emotional_tags)
    if emotional_count > 0:
        bonus = emotional_count * 5
        score.total_score += bonus
        score.criteria_met.append(AnchorCriteria.EMOTIONALLY_SIGNIFICANT)
        score.breakdown["emotional"] = bonus

    # Unique outcome bonus
    if all_loops:
        outcome_counts = defaultdict(int)
        for l in all_loops:
            outcome_counts[l.outcome_hash] += 1
        if outcome_counts[loop.outcome_hash] == 1:
            score.total_score += 12
            score.criteria_met.append(AnchorCriteria.UNIQUE_OUTCOME)
            score.breakdown["unique_outcome"] = 12

    # Manual designation
    if "anchor" in loop.tags:
        score.total_score += 25
        score.criteria_met.append(AnchorCriteria.MANUALLY_DESIGNATED)
        score.breakdown["manual"] = 25

    # Narrative value heuristics
    # Long, non-death loops are often narratively interesting
    if not loop.is_death_loop() and len(loop.decision_trace) > 10:
        score.total_score += 8
        score.criteria_met.append(AnchorCriteria.HIGH_NARRATIVE_VALUE)
        score.breakdown["narrative_length"] = 8

    return score


def select_anchors(
    loops: List[Loop],
    n: int = 100,
    min_score: float = 5.0
) -> List[LoopID]:
    """
    Select anchor loops from a collection.

    Args:
        loops: All loops to consider
        n: Maximum number of anchors to select (100-300 typical)
        min_score: Minimum score to qualify as anchor

    Returns:
        List of anchor loop IDs
    """
    if not loops:
        return []

    # Determine first loop in each epoch
    epoch_first: Dict[EpochType, LoopID] = {}
    for loop in sorted(loops, key=lambda l: l.created_at):
        if loop.epoch not in epoch_first:
            epoch_first[loop.epoch] = loop.id

    # Score all loops
    scores = [
        score_anchor_candidate(loop, loops, epoch_first)
        for loop in loops
    ]

    # Filter and sort by score
    qualified = [s for s in scores if s.total_score >= min_score]
    qualified.sort(key=lambda s: s.total_score, reverse=True)

    # Take top N
    return [s.loop_id for s in qualified[:n]]


# === Montage Compression ===

class Montage(BaseModel):
    """
    A montage compresses many similar loops into a narrative unit.

    This is the primary vehicle for prose generation of compressed loops.
    """
    id: str = Field(default_factory=lambda: f"montage-{hashlib.md5(str(id({})).encode()).hexdigest()[:8]}")
    class_id: ClassID
    count: int = 0
    representative_ids: List[LoopID] = Field(default_factory=list)
    summary_text: str = ""
    cumulative_knowledge: Set[str] = Field(default_factory=set)
    cumulative_mood_effect: str = "neutral"
    tags: List[str] = Field(default_factory=list)

    model_config = {"arbitrary_types_allowed": True}

    def generate_summary(self) -> str:
        """Generate a default summary text."""
        if self.count == 1:
            return "Once."
        elif self.count < 10:
            return f"{self.count} times, same result."
        elif self.count < 100:
            return f"Dozens of attempts. {self.count} to be exact. All ending the same way."
        elif self.count < 1000:
            return f"{self.count} times. Hundreds of attempts, each one ending identically."
        else:
            return f"{self.count:,} loops. Thousands of attempts blurring into one. Same explosion. Same failure. Same reset."


def create_montage(
    loop_class: LoopClass,
    loops: List[Loop],
    max_representatives: int = 3
) -> Montage:
    """
    Create a montage from an equivalence class.

    Args:
        loop_class: The equivalence class
        loops: Loops in this class
        max_representatives: Maximum representative loops

    Returns:
        Montage object
    """
    montage = Montage(
        class_id=loop_class.id,
        count=loop_class.count
    )

    # Select representatives
    # Prefer: longest traces, most tags, varied decision traces
    if loops:
        # Sort by narrative interest
        sorted_loops = sorted(
            loops,
            key=lambda l: (len(l.decision_trace), len(l.tags)),
            reverse=True
        )

        representatives = []
        traces_seen = set()

        for loop in sorted_loops:
            trace_key = tuple(loop.decision_trace[:5])  # First 5 decisions
            if trace_key not in traces_seen or len(representatives) < max_representatives:
                representatives.append(loop.id)
                traces_seen.add(trace_key)
            if len(representatives) >= max_representatives:
                break

        montage.representative_ids = representatives

        # Aggregate knowledge and tags
        all_knowledge = set()
        all_tags = set()
        for loop in loops:
            all_tags.update(loop.tags)

        montage.tags = list(all_tags)
        montage.cumulative_knowledge = all_knowledge

    # Generate summary
    montage.summary_text = montage.generate_summary()

    return montage


# === Short Loop Clustering ===

@dataclass
class ShortLoopCluster:
    """
    Clusters of short/early-termination loops.

    Groups loops that died before significant events.
    """
    id: str = ""
    death_time: int = 0  # Time slot of death
    death_cause: str = ""  # Common death cause
    count: int = 0
    sample_ids: List[LoopID] = field(default_factory=list)

    def generate_summary(self) -> str:
        """Generate narrative summary."""
        if self.count == 1:
            return f"Once, died at time {self.death_time}."

        time_desc = {
            0: "before even leaving the room",
            1: "in the first hour",
            2: "before midday",
            3: "in the afternoon",
        }.get(self.death_time, f"at time slot {self.death_time}")

        if self.count < 10:
            return f"{self.count} times, dead {time_desc}."
        elif self.count < 100:
            return f"Dozens died {time_desc}. {self.count} attempts that never made it past the beginning."
        else:
            return f"{self.count:,} loops ended {time_desc}. Hundreds never saw the afternoon."


def cluster_short_loops(
    loops: List[Loop],
    max_trace_length: int = 4
) -> List[ShortLoopCluster]:
    """
    Cluster short loops by death time and cause.

    Args:
        loops: All loops to analyze
        max_trace_length: Maximum trace length to consider "short"

    Returns:
        List of short loop clusters
    """
    # Filter short loops
    short_loops = [l for l in loops if len(l.decision_trace) <= max_trace_length]

    # Group by (trace_length, death_tag)
    clusters_map: Dict[Tuple[int, str], List[Loop]] = defaultdict(list)

    for loop in short_loops:
        trace_len = len(loop.decision_trace)
        death_cause = "unknown"
        for tag in loop.tags:
            if "death" in tag.lower() or tag in ["explosion", "shot", "fall"]:
                death_cause = tag
                break

        key = (trace_len, death_cause)
        clusters_map[key].append(loop)

    # Create cluster objects
    clusters = []
    for (trace_len, death_cause), cluster_loops in clusters_map.items():
        cluster = ShortLoopCluster(
            id=f"short-{trace_len}-{death_cause[:8]}",
            death_time=trace_len,
            death_cause=death_cause,
            count=len(cluster_loops),
            sample_ids=[l.id for l in cluster_loops[:5]]
        )
        clusters.append(cluster)

    return sorted(clusters, key=lambda c: c.count, reverse=True)


# === Sub-Loop Macros ===

class SubLoopMacro(BaseModel):
    """
    A macro representing a repeated segment within loops.

    Captures the "infinite retry" feeling of repeated sub-sections.
    """
    id: str = Field(default_factory=lambda: f"macro-{hashlib.md5(str(id({})).encode()).hexdigest()[:8]}")
    parent_loop_id: Optional[LoopID] = None
    parent_class_id: Optional[ClassID] = None
    time_window_start: int = 0
    time_window_end: int = 0
    attempts_count: int = 1
    success_rate: float = 0.0
    best_outcome: str = ""
    knowledge_gained: List[str] = Field(default_factory=list)
    emotional_effect: str = "neutral"  # frustration, mastery, numbness

    def generate_summary(self) -> str:
        """Generate narrative summary."""
        duration = self.time_window_end - self.time_window_start

        time_desc = f"those {duration} {'minute' if duration == 1 else 'minutes'}"
        if duration > 5:
            time_desc = "that hour"

        if self.attempts_count < 10:
            return f"Repeated {time_desc} {self.attempts_count} times."
        elif self.attempts_count < 50:
            return f"Spent what felt like days in {time_desc}. {self.attempts_count} attempts."
        elif self.attempts_count < 100:
            return f"A month in {time_desc}. {self.attempts_count} resets, each one burning a little more sanity."
        else:
            return f"An eternity in {time_desc}. {self.attempts_count} loops. {self.emotional_effect.capitalize()}."


def detect_subloop_patterns(
    subloops: List[SubLoop],
    min_attempts: int = 5
) -> List[SubLoopMacro]:
    """
    Detect repeated sub-loop patterns and create macros.

    Args:
        subloops: All sub-loops to analyze
        min_attempts: Minimum attempts to qualify as a pattern

    Returns:
        List of sub-loop macros
    """
    # Group subloops by time window and parent
    patterns: Dict[Tuple[LoopID, int, int], List[SubLoop]] = defaultdict(list)

    for sl in subloops:
        key = (sl.parent_loop_id, sl.start_time, sl.end_time)
        patterns[key].append(sl)

    macros = []
    for (parent_id, start, end), group in patterns.items():
        total_attempts = sum(sl.attempts_count for sl in group)

        if total_attempts >= min_attempts:
            # Determine emotional effect based on attempts
            if total_attempts < 10:
                effect = "frustration"
            elif total_attempts < 50:
                effect = "determination"
            elif total_attempts < 100:
                effect = "numbness"
            else:
                effect = "dissociation"

            # Calculate success rate
            successes = sum(1 for sl in group if "success" in sl.best_outcome_hash.lower())
            success_rate = successes / len(group) if group else 0.0

            macro = SubLoopMacro(
                parent_loop_id=parent_id,
                time_window_start=start,
                time_window_end=end,
                attempts_count=total_attempts,
                success_rate=success_rate,
                emotional_effect=effect,
                knowledge_gained=[
                    k for sl in group for k in sl.knowledge_gained
                ]
            )
            macros.append(macro)

    return sorted(macros, key=lambda m: m.attempts_count, reverse=True)


# === Compression Manager ===

@dataclass
class CompressionStats:
    """Statistics about compression effectiveness."""
    total_loops: int = 0
    total_classes: int = 0
    total_families: int = 0
    total_anchors: int = 0
    total_montages: int = 0
    short_loop_count: int = 0
    subloop_macro_count: int = 0

    @property
    def compression_ratio(self) -> float:
        """Raw loops per class."""
        return self.total_loops / self.total_classes if self.total_classes else 0

    @property
    def family_coverage(self) -> float:
        """Percentage of loops in families."""
        # This would need actual data to compute properly
        return 0.0

    @property
    def anchor_density(self) -> float:
        """Anchors per 1000 loops."""
        return (self.total_anchors * 1000) / self.total_loops if self.total_loops else 0

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "total_loops": self.total_loops,
            "total_classes": self.total_classes,
            "total_families": self.total_families,
            "total_anchors": self.total_anchors,
            "total_montages": self.total_montages,
            "short_loop_count": self.short_loop_count,
            "subloop_macro_count": self.subloop_macro_count,
            "compression_ratio": round(self.compression_ratio, 2),
            "anchor_density": round(self.anchor_density, 2),
        }


class CompressionManager:
    """
    Manages the compression pipeline for loops.

    Coordinates equivalence classes, families, anchors, and montages.
    """

    def __init__(self, storage: Optional['LoopStorage'] = None):
        self.storage = storage
        self.families: Dict[str, LoopFamily] = {}
        self.anchors: Set[LoopID] = set()
        self.montages: Dict[ClassID, Montage] = {}
        self.short_clusters: List[ShortLoopCluster] = []
        self.subloop_macros: List[SubLoopMacro] = []

    def compress_loops(
        self,
        loops: List[Loop],
        anchor_count: int = 100
    ) -> CompressionStats:
        """
        Run the full compression pipeline on a set of loops.

        Args:
            loops: Loops to compress
            anchor_count: Number of anchors to select

        Returns:
            Compression statistics
        """
        stats = CompressionStats(total_loops=len(loops))

        # 1. Group into equivalence classes
        classes = self._build_equivalence_classes(loops)
        stats.total_classes = len(classes)

        # 2. Build families
        families = self._build_families(loops, classes)
        self.families = {f.id: f for f in families}
        stats.total_families = len(families)

        # 3. Select anchors
        anchor_ids = select_anchors(loops, n=anchor_count)
        self.anchors = set(anchor_ids)
        stats.total_anchors = len(anchor_ids)

        # 4. Create montages
        for class_id, loop_class in classes.items():
            class_loops = [l for l in loops if compute_equivalence_key(l) == loop_class.equivalence_key()]
            montage = create_montage(loop_class, class_loops)
            self.montages[class_id] = montage
        stats.total_montages = len(self.montages)

        # 5. Cluster short loops
        self.short_clusters = cluster_short_loops(loops)
        stats.short_loop_count = sum(c.count for c in self.short_clusters)

        return stats

    def _build_equivalence_classes(
        self,
        loops: List[Loop]
    ) -> Dict[ClassID, LoopClass]:
        """Build equivalence classes from loops."""
        classes: Dict[Tuple[str, str], LoopClass] = {}

        for loop in loops:
            key = compute_equivalence_key(loop)

            if key not in classes:
                classes[key] = create_class_from_loop(loop)
            else:
                classes[key].add_loop(loop.id)

        return {c.id: c for c in classes.values()}

    def _build_families(
        self,
        loops: List[Loop],
        classes: Dict[ClassID, LoopClass]
    ) -> List[LoopFamily]:
        """Build parametric families from loops."""
        # Group by strategy and risk
        family_map: Dict[Tuple[StrategyType, RiskLevel], LoopFamily] = {}

        for loop in loops:
            strategy = infer_strategy(loop)
            risk = infer_risk_level(loop)
            key = (strategy, risk)

            if key not in family_map:
                family_map[key] = LoopFamily(
                    name=f"{strategy.value}-{risk.value}",
                    strategy_type=strategy,
                    risk_level=risk
                )

            family_map[key].total_loops += 1

        # Link families to classes
        loop_to_class: Dict[LoopID, ClassID] = {}
        for class_id, lc in classes.items():
            if lc.representative_id:
                loop_to_class[lc.representative_id] = class_id
            for sample_id in lc.sample_ids:
                loop_to_class[sample_id] = class_id

        for loop in loops:
            strategy = infer_strategy(loop)
            risk = infer_risk_level(loop)
            key = (strategy, risk)

            if loop.id in loop_to_class:
                class_id = loop_to_class[loop.id]
                if class_id not in family_map[key].class_ids:
                    family_map[key].class_ids.append(class_id)

        return list(family_map.values())

    def get_compression_report(self) -> str:
        """Generate a human-readable compression report."""
        lines = [
            "=== Compression Report ===",
            "",
            f"Families: {len(self.families)}",
        ]

        for fam in sorted(self.families.values(), key=lambda f: f.total_loops, reverse=True)[:5]:
            lines.append(f"  - {fam.name}: {fam.total_loops} loops, {len(fam.class_ids)} classes")

        lines.extend([
            "",
            f"Anchors: {len(self.anchors)}",
            f"Montages: {len(self.montages)}",
            "",
            "Short Loop Clusters:",
        ])

        for cluster in self.short_clusters[:3]:
            lines.append(f"  - Time {cluster.death_time}: {cluster.count} loops")

        return "\n".join(lines)

    def is_anchor(self, loop_id: LoopID) -> bool:
        """Check if a loop is an anchor."""
        return loop_id in self.anchors

    def get_montage(self, class_id: ClassID) -> Optional[Montage]:
        """Get montage for a class."""
        return self.montages.get(class_id)

    def get_family(self, family_id: str) -> Optional[LoopFamily]:
        """Get a family by ID."""
        return self.families.get(family_id)
