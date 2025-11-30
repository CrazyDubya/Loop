"""
Narrative Generation for the Loop Engine.

Transforms the mathematical machinery into compelling narrative.
This is where loops become story.

Three layers:
- Math: Equivalence classes, operators (hidden from reader)
- Logic: Policies, epochs, causation (felt but not stated)
- Narrative: Anchor loops, montages (what reader experiences)
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Set, Tuple, TYPE_CHECKING

from pydantic import BaseModel, Field

from src.models import (
    Loop,
    LoopID,
    LoopClass,
    EpochType,
    MoodProfile,
    EmotionalBaseline,
)
from src.engine.compression import (
    Montage,
    ShortLoopCluster,
    SubLoopMacro,
    CompressionManager,
)

if TYPE_CHECKING:
    from src.engine.storage import LoopStorage


# === Detail Levels ===

class DetailLevel(str, Enum):
    """Level of detail for loop narration."""
    FULL = "full"      # Complete scene-by-scene
    SUMMARY = "summary"  # Key beats only
    FLASH = "flash"    # Single paragraph


# === Epoch System ===

class NarrativeEpoch(BaseModel):
    """
    A narrative epoch with story structure.

    Extends the basic EpochType with narrative metadata.
    """
    id: str
    name: str
    epoch_type: EpochType
    description: str = ""
    tagline: str = ""  # "This can't be happening"
    loop_range: Tuple[int, int] = (0, 0)  # Start/end loop indices
    dominant_policy: str = ""
    emotional_arc: str = ""  # Trajectory description
    anchor_loop_ids: List[LoopID] = Field(default_factory=list)
    key_revelations: List[str] = Field(default_factory=list)
    loop_count: int = 0

    model_config = {"arbitrary_types_allowed": True}


# Canonical epoch definitions
CANONICAL_EPOCHS = {
    EpochType.NAIVE: NarrativeEpoch(
        id="epoch-naive",
        name="Denial",
        epoch_type=EpochType.NAIVE,
        description="The protagonist refuses to accept the reality of the loop",
        tagline="This can't be happening",
        dominant_policy="naive",
        emotional_arc="shock → disbelief → desperate hope → crushing realization"
    ),
    EpochType.MAPPING: NarrativeEpoch(
        id="epoch-mapping",
        name="The Scientist",
        epoch_type=EpochType.MAPPING,
        description="Systematic exploration of the day's possibilities",
        tagline="What are the rules?",
        dominant_policy="scientist",
        emotional_arc="curiosity → methodical calm → frustration → breakthrough"
    ),
    EpochType.OBSESSION: NarrativeEpoch(
        id="epoch-obsession",
        name="The Perfectionist",
        epoch_type=EpochType.OBSESSION,
        description="Driven to fix everything, save everyone",
        tagline="I can fix everything",
        dominant_policy="obsessive",
        emotional_arc="determination → tunnel vision → exhaustion → failure"
    ),
    EpochType.RUTHLESS: NarrativeEpoch(
        id="epoch-ruthless",
        name="The Void",
        epoch_type=EpochType.RUTHLESS,
        description="Nihilism sets in, nothing seems to matter",
        tagline="Nothing matters anymore",
        dominant_policy="desperate",
        emotional_arc="numbness → cruelty → self-destruction → rock bottom"
    ),
    EpochType.SYNTHESIS: NarrativeEpoch(
        id="epoch-synthesis",
        name="Transcendence",
        epoch_type=EpochType.SYNTHESIS,
        description="Integration of all learned, acceptance of limits",
        tagline="What can I actually change?",
        dominant_policy="perfectionist",
        emotional_arc="acceptance → wisdom → peace → resolution"
    ),
}


def get_epoch_definition(epoch_type: EpochType) -> NarrativeEpoch:
    """Get the canonical definition for an epoch."""
    return CANONICAL_EPOCHS.get(epoch_type, CANONICAL_EPOCHS[EpochType.NAIVE])


# === Prose Templates ===

MONTAGE_TEMPLATES = {
    "failure": [
        "He tried every way he could think of. {variations} {count} times, the same outcome.",
        "{count} attempts. {count} failures. The {outcome} never changed.",
        "Different paths, same destination. {count} loops, all ending in {outcome}.",
    ],
    "learning": [
        "Each attempt taught him something small. By loop {count}, he knew {knowledge}.",
        "The loops weren't wasted. {count} iterations, {count} lessons. Finally: {knowledge}.",
        "Knowledge accumulated like sediment. {count} layers. Eventually: {knowledge}.",
    ],
    "despair": [
        "The attempts blurred together. {count} of them, maybe more. He stopped counting.",
        "{count} loops. Or was it more? The days had lost their edges.",
        "Time meant nothing. {count} resets. {count} failures. {count} reasons to stop.",
    ],
    "mastery": [
        "Eventually, muscle memory took over. {count} repetitions had burned the path into his bones.",
        "He didn't think anymore. After {count} loops, the body knew what the mind had forgotten.",
        "{count} times. Enough to make it automatic. Enough to make it art.",
    ],
}

SUBLOOP_TEMPLATES = [
    "He spent what felt like {time_feel} trapped in those {duration} minutes. The same {action}, the same wrong words. {attempts} times. On attempt {final}, {resolution}.",
    "The {duration}-minute window became its own eternity. {attempts} variations. He stopped counting after {midpoint}. Started again. On attempt {final}, {resolution}.",
    "{attempts} loops within the loop. {duration} minutes, repeated until they lost all meaning. {resolution}",
]

TRANSITION_TEMPLATES = [
    "Something broke on loop {loop_num}. Not the world—that broke every day. Something in him. The {old_strategy} had failed {count} times. Now he would try {new_strategy}.",
    "Loop {loop_num} ended like all the others. But when he woke again, he was different. {old_strategy} was dead. Time for {new_strategy}.",
    "After {count} failures, even stubbornness has limits. Loop {loop_num} marked the end of {old_strategy}. What came next was {new_strategy}.",
]

REVELATION_TEMPLATES = [
    "Loop {loop_num}. That's when he learned {knowledge}. Everything before was prologue.",
    "The {knowledge}. He discovered it on loop {loop_num}, and nothing was the same after.",
    "It took {loop_num} loops to learn what should have been obvious: {knowledge}.",
]


# === Prose Generation ===

class ProseGenerator:
    """Generates narrative prose from loop data."""

    def __init__(self, storage: Optional['LoopStorage'] = None):
        self.storage = storage
        self._variation_index = 0

    def _pick_template(self, templates: List[str]) -> str:
        """Pick a template with variation."""
        self._variation_index = (self._variation_index + 1) % len(templates)
        return templates[self._variation_index]

    def generate_montage_prose(
        self,
        montage: Montage,
        montage_type: str = "failure"
    ) -> str:
        """
        Generate prose for a montage.

        Args:
            montage: The montage to narrate
            montage_type: One of failure, learning, despair, mastery

        Returns:
            Narrative prose
        """
        templates = MONTAGE_TEMPLATES.get(montage_type, MONTAGE_TEMPLATES["failure"])
        template = self._pick_template(templates)

        # Build variations description
        variations = ""
        if montage.tags:
            variations = f"Through {', '.join(montage.tags[:3])}."

        # Knowledge for learning montages
        knowledge = "nothing new"
        if montage.cumulative_knowledge:
            knowledge = ", ".join(list(montage.cumulative_knowledge)[:2])

        return template.format(
            count=montage.count,
            variations=variations,
            outcome=montage.cumulative_mood_effect or "failure",
            knowledge=knowledge
        )

    def generate_subloop_prose(self, macro: SubLoopMacro) -> str:
        """
        Generate prose for a sub-loop hell sequence.

        Conveys time dilation and repetition trauma.
        """
        template = self._pick_template(SUBLOOP_TEMPLATES)

        duration = macro.time_window_end - macro.time_window_start

        # Time feel based on attempts
        if macro.attempts_count < 20:
            time_feel = "hours"
        elif macro.attempts_count < 100:
            time_feel = "days"
        elif macro.attempts_count < 500:
            time_feel = "a month"
        else:
            time_feel = "an eternity"

        # Resolution based on emotional effect
        if macro.emotional_effect == "mastery":
            resolution = "something clicked"
        elif macro.emotional_effect == "numbness":
            resolution = "he gave up trying"
        elif macro.emotional_effect == "dissociation":
            resolution = "he no longer knew who was trying"
        else:
            resolution = "he moved on"

        return template.format(
            time_feel=time_feel,
            duration=duration,
            action="conversation" if duration < 3 else "sequence",
            attempts=macro.attempts_count,
            midpoint=macro.attempts_count // 2,
            final=macro.attempts_count,
            resolution=resolution
        )

    def generate_transition_prose(
        self,
        loop_num: int,
        old_epoch: NarrativeEpoch,
        new_epoch: NarrativeEpoch,
        failure_count: int
    ) -> str:
        """Generate prose for an epoch transition."""
        template = self._pick_template(TRANSITION_TEMPLATES)

        return template.format(
            loop_num=loop_num,
            old_strategy=old_epoch.tagline.lower(),
            new_strategy=new_epoch.tagline.lower(),
            count=failure_count
        )

    def generate_revelation_prose(
        self,
        loop_num: int,
        knowledge: str
    ) -> str:
        """Generate prose for a knowledge revelation."""
        template = self._pick_template(REVELATION_TEMPLATES)
        return template.format(loop_num=loop_num, knowledge=knowledge)

    def narrate_loop(
        self,
        loop: Loop,
        level: DetailLevel = DetailLevel.SUMMARY
    ) -> str:
        """
        Generate narrative for a single loop.

        Args:
            loop: The loop to narrate
            level: Detail level (full, summary, flash)

        Returns:
            Narrative prose
        """
        if level == DetailLevel.FLASH:
            return self._narrate_flash(loop)
        elif level == DetailLevel.SUMMARY:
            return self._narrate_summary(loop)
        else:
            return self._narrate_full(loop)

    def _narrate_flash(self, loop: Loop) -> str:
        """Single paragraph narration."""
        outcome = "death" if loop.is_death_loop() else "survival"
        length = len(loop.decision_trace)

        if length < 4:
            duration = "It was over before it began"
        elif length < 8:
            duration = "A short loop"
        else:
            duration = "A long day"

        return f"{duration}. {length} decisions. Outcome: {outcome}."

    def _narrate_summary(self, loop: Loop) -> str:
        """Key beats narration."""
        lines = []

        # Opening
        epoch_name = loop.epoch.value.title()
        lines.append(f"Loop #{loop.id[-6:]} ({epoch_name} era)")

        # Key decisions
        if loop.decision_trace:
            key_points = loop.decision_trace[:3] + loop.decision_trace[-2:]
            key_points = list(dict.fromkeys(key_points))  # Remove duplicates
            lines.append(f"Path: {' → '.join(key_points[:5])}")

        # Outcome
        if loop.is_death_loop():
            lines.append("Ended in death.")
        else:
            lines.append("Survived.")

        # Tags
        if loop.tags:
            lines.append(f"Notable: {', '.join(loop.tags[:3])}")

        return "\n".join(lines)

    def _narrate_full(self, loop: Loop) -> str:
        """Complete scene-by-scene narration."""
        lines = []

        # Header
        epoch_def = get_epoch_definition(loop.epoch)
        lines.append(f"## Loop {loop.id[-8:]}")
        lines.append(f"*{epoch_def.name} Era — {epoch_def.tagline}*")
        lines.append("")

        # The journey
        lines.append("### The Day")
        if loop.decision_trace:
            for i, node in enumerate(loop.decision_trace):
                if i == 0:
                    lines.append(f"It began at **{node}**.")
                elif i == len(loop.decision_trace) - 1:
                    lines.append(f"It ended at **{node}**.")
                else:
                    lines.append(f"Then: {node}.")
        lines.append("")

        # Outcome
        lines.append("### Outcome")
        if loop.is_death_loop():
            lines.append("Death. Again. Reset.")
        else:
            lines.append("Survival. But at what cost?")

        # Knowledge
        if loop.knowledge_id:
            lines.append("")
            lines.append("### What Was Learned")
            lines.append(f"Knowledge state: {loop.knowledge_id[:12]}...")

        return "\n".join(lines)


# === Emotional Arc ===

@dataclass
class EmotionalPoint:
    """A point on the emotional trajectory."""
    loop_index: int
    loop_id: LoopID
    emotion: str
    intensity: float  # -1.0 (despair) to 1.0 (hope)
    description: str = ""


def compute_emotional_arc(loops: List[Loop]) -> List[EmotionalPoint]:
    """
    Compute the emotional trajectory across loops.

    Returns list of emotional high/low points.
    """
    points = []

    for i, loop in enumerate(loops):
        # Compute emotional intensity
        intensity = 0.0

        # Deaths are negative
        if loop.is_death_loop():
            intensity -= 0.3
        else:
            intensity += 0.2

        # Short loops are frustrating
        if loop.is_short_loop():
            intensity -= 0.2

        # Breakthroughs are positive
        if "breakthrough" in loop.tags:
            intensity += 0.5
        if "revelation" in loop.tags:
            intensity += 0.3

        # Trauma is negative
        if "trauma" in loop.tags:
            intensity -= 0.4
        if "despair" in loop.tags:
            intensity -= 0.5

        # Clamp
        intensity = max(-1.0, min(1.0, intensity))

        # Determine emotion name
        if intensity > 0.5:
            emotion = "hope"
        elif intensity > 0.2:
            emotion = "determination"
        elif intensity > -0.2:
            emotion = "numbness"
        elif intensity > -0.5:
            emotion = "frustration"
        else:
            emotion = "despair"

        points.append(EmotionalPoint(
            loop_index=i,
            loop_id=loop.id,
            emotion=emotion,
            intensity=intensity
        ))

    return points


def find_emotional_peaks(arc: List[EmotionalPoint]) -> Dict[str, List[EmotionalPoint]]:
    """Find hope peaks, despair valleys, and turning points."""
    result = {
        "hope_peaks": [],
        "despair_valleys": [],
        "turning_points": []
    }

    if len(arc) < 3:
        return result

    for i in range(1, len(arc) - 1):
        prev_int = arc[i-1].intensity
        curr_int = arc[i].intensity
        next_int = arc[i+1].intensity

        # Local maximum (hope peak)
        if curr_int > prev_int and curr_int > next_int and curr_int > 0.3:
            result["hope_peaks"].append(arc[i])

        # Local minimum (despair valley)
        if curr_int < prev_int and curr_int < next_int and curr_int < -0.3:
            result["despair_valleys"].append(arc[i])

        # Turning point (sign change with magnitude)
        if (prev_int * curr_int < 0) and abs(curr_int - prev_int) > 0.3:
            result["turning_points"].append(arc[i])

    return result


def generate_emotional_summary(arc: List[EmotionalPoint]) -> str:
    """Generate prose summary of emotional trajectory."""
    if not arc:
        return "No emotional data."

    peaks = find_emotional_peaks(arc)

    lines = []

    # Overall trend
    start_intensity = arc[0].intensity
    end_intensity = arc[-1].intensity

    if end_intensity > start_intensity + 0.3:
        lines.append("An arc of recovery. Beginning in darkness, ending in light.")
    elif end_intensity < start_intensity - 0.3:
        lines.append("A descent. Hope eroded loop by loop.")
    else:
        lines.append("A flat line. Neither hope nor despair won.")

    # Notable points
    if peaks["despair_valleys"]:
        worst = min(peaks["despair_valleys"], key=lambda p: p.intensity)
        lines.append(f"Rock bottom: loop {worst.loop_index}. Pure {worst.emotion}.")

    if peaks["hope_peaks"]:
        best = max(peaks["hope_peaks"], key=lambda p: p.intensity)
        lines.append(f"Highest point: loop {best.loop_index}. A moment of {best.emotion}.")

    return " ".join(lines)


# === Story Assembly ===

@dataclass
class StorySection:
    """A section of the assembled story."""
    section_type: str  # "epoch_intro", "anchor", "montage", "transition", "revelation"
    epoch: Optional[EpochType] = None
    content: str = ""
    loop_id: Optional[LoopID] = None


class StoryAssembler:
    """Assembles a complete narrative from loop data."""

    def __init__(
        self,
        storage: Optional['LoopStorage'] = None,
        compression: Optional[CompressionManager] = None
    ):
        self.storage = storage
        self.compression = compression
        self.prose = ProseGenerator(storage)
        self.sections: List[StorySection] = []

    def assemble_story(
        self,
        loops: List[Loop],
        anchors_per_epoch: int = 10
    ) -> List[StorySection]:
        """
        Assemble a complete story from loops.

        Args:
            loops: All loops in chronological order
            anchors_per_epoch: Max detailed loops per epoch

        Returns:
            List of story sections
        """
        self.sections = []

        if not loops:
            return self.sections

        # Group loops by epoch
        epochs_loops: Dict[EpochType, List[Loop]] = {}
        for loop in loops:
            if loop.epoch not in epochs_loops:
                epochs_loops[loop.epoch] = []
            epochs_loops[loop.epoch].append(loop)

        # Opening
        self._add_opening(loops[0])

        # Process each epoch
        epoch_order = [
            EpochType.NAIVE,
            EpochType.MAPPING,
            EpochType.OBSESSION,
            EpochType.RUTHLESS,
            EpochType.SYNTHESIS
        ]

        prev_epoch = None
        for epoch in epoch_order:
            if epoch not in epochs_loops:
                continue

            epoch_loops = epochs_loops[epoch]
            epoch_def = get_epoch_definition(epoch)

            # Transition from previous epoch
            if prev_epoch:
                self._add_transition(prev_epoch, epoch, len(epochs_loops.get(prev_epoch, [])))

            # Epoch intro
            self._add_epoch_intro(epoch_def, len(epoch_loops))

            # Select anchors for this epoch
            anchor_ids = self._select_epoch_anchors(epoch_loops, anchors_per_epoch)

            # Narrate anchors and compress the rest
            anchor_set = set(anchor_ids)
            non_anchor_count = 0

            for loop in epoch_loops:
                if loop.id in anchor_set:
                    # Detailed narration
                    self._add_anchor_loop(loop)
                else:
                    non_anchor_count += 1

            # Add montage for non-anchors
            if non_anchor_count > 0:
                self._add_epoch_montage(epoch, non_anchor_count)

            prev_epoch = epoch

        # Resolution
        self._add_resolution(loops[-1])

        return self.sections

    def _add_opening(self, first_loop: Loop) -> None:
        """Add the story opening."""
        content = f"""# The First Loop

He woke up.

That's how it always started. Eyes open, ceiling familiar, a day like any other.
Except it wasn't any other day. It was this day. The same day. Again.

Loop {first_loop.id[-8:]} was the first. Or at least, the first he remembered.
"""
        self.sections.append(StorySection(
            section_type="opening",
            content=content,
            loop_id=first_loop.id
        ))

    def _add_epoch_intro(self, epoch: NarrativeEpoch, loop_count: int) -> None:
        """Add an epoch introduction."""
        content = f"""
## {epoch.name}

*"{epoch.tagline}"*

{epoch.description}

{loop_count} loops in this phase. {epoch.emotional_arc.split('→')[0].strip().title()}
giving way to {epoch.emotional_arc.split('→')[-1].strip()}.
"""
        self.sections.append(StorySection(
            section_type="epoch_intro",
            epoch=epoch.epoch_type,
            content=content
        ))

    def _add_transition(
        self,
        from_epoch: EpochType,
        to_epoch: EpochType,
        failure_count: int
    ) -> None:
        """Add an epoch transition."""
        from_def = get_epoch_definition(from_epoch)
        to_def = get_epoch_definition(to_epoch)

        content = self.prose.generate_transition_prose(
            failure_count, from_def, to_def, failure_count
        )

        self.sections.append(StorySection(
            section_type="transition",
            epoch=to_epoch,
            content=f"\n---\n\n{content}\n"
        ))

    def _add_anchor_loop(self, loop: Loop) -> None:
        """Add a detailed anchor loop."""
        content = self.prose.narrate_loop(loop, DetailLevel.SUMMARY)

        self.sections.append(StorySection(
            section_type="anchor",
            epoch=loop.epoch,
            content=f"\n{content}\n",
            loop_id=loop.id
        ))

    def _add_epoch_montage(self, epoch: EpochType, count: int) -> None:
        """Add a compressed montage for non-anchor loops."""
        # Create a synthetic montage
        montage = Montage(
            class_id=f"synthetic-{epoch.value}",
            count=count
        )

        # Determine montage type by epoch
        type_map = {
            EpochType.NAIVE: "despair",
            EpochType.MAPPING: "learning",
            EpochType.OBSESSION: "failure",
            EpochType.RUTHLESS: "despair",
            EpochType.SYNTHESIS: "mastery"
        }

        content = self.prose.generate_montage_prose(
            montage,
            type_map.get(epoch, "failure")
        )

        self.sections.append(StorySection(
            section_type="montage",
            epoch=epoch,
            content=f"\n*{content}*\n"
        ))

    def _add_resolution(self, last_loop: Loop) -> None:
        """Add the story resolution."""
        content = f"""
---

## The End?

Loop {last_loop.id[-8:]} was not the last. There is no last.

But something had changed. Not the world—the world reset every day,
unchanged, unchangeable. What changed was him.

What happens next? That's not for loops to decide.

*The day will come again. It always does.*
"""
        self.sections.append(StorySection(
            section_type="resolution",
            content=content,
            loop_id=last_loop.id
        ))

    def _select_epoch_anchors(
        self,
        loops: List[Loop],
        max_anchors: int
    ) -> List[LoopID]:
        """Select anchor loops for an epoch."""
        if not loops:
            return []

        scored = []
        for i, loop in enumerate(loops):
            score = 0

            # First in epoch
            if i == 0:
                score += 20

            # Last in epoch
            if i == len(loops) - 1:
                score += 10

            # Breakthroughs
            if "breakthrough" in loop.tags:
                score += 15
            if "revelation" in loop.tags:
                score += 12

            # Deaths with long traces (catastrophic)
            if loop.is_death_loop() and len(loop.decision_trace) > 8:
                score += 8

            # Manual anchors
            if "anchor" in loop.tags:
                score += 25

            # Variety in trace length
            score += min(len(loop.decision_trace), 10)

            scored.append((score, loop.id))

        # Sort by score, take top
        scored.sort(reverse=True)
        return [lid for _, lid in scored[:max_anchors]]

    def get_prose_output(self) -> str:
        """Get the assembled story as prose markdown."""
        return "\n".join(section.content for section in self.sections)

    def get_outline_output(self) -> str:
        """Get a structural outline of the story."""
        lines = ["# Story Outline", ""]

        for section in self.sections:
            if section.section_type == "opening":
                lines.append("- **Opening**: First loop introduction")
            elif section.section_type == "epoch_intro":
                lines.append(f"- **Epoch**: {section.epoch.value.title()}")
            elif section.section_type == "anchor":
                lines.append(f"  - Anchor: Loop {section.loop_id[-8:] if section.loop_id else '?'}")
            elif section.section_type == "montage":
                lines.append(f"  - Montage: Compressed loops")
            elif section.section_type == "transition":
                lines.append(f"- **Transition** → {section.epoch.value.title() if section.epoch else '?'}")
            elif section.section_type == "resolution":
                lines.append("- **Resolution**: Ending")

        return "\n".join(lines)

    def get_timeline_output(self, loops: List[Loop]) -> str:
        """Get a chronological timeline."""
        lines = ["# Loop Timeline", ""]

        current_epoch = None
        for i, loop in enumerate(loops):
            if loop.epoch != current_epoch:
                current_epoch = loop.epoch
                epoch_def = get_epoch_definition(current_epoch)
                lines.append(f"\n## {epoch_def.name} ({current_epoch.value})")

            status = "💀" if loop.is_death_loop() else "✓"
            lines.append(f"{i+1}. [{status}] {loop.id[-8:]} - {len(loop.decision_trace)} decisions")

        return "\n".join(lines)

    def get_statistics_output(self, loops: List[Loop]) -> str:
        """Get compression and narrative statistics."""
        lines = ["# Narrative Statistics", ""]

        # Basic counts
        lines.append(f"**Total Loops**: {len(loops)}")

        # By epoch
        epoch_counts = {}
        for loop in loops:
            epoch_counts[loop.epoch] = epoch_counts.get(loop.epoch, 0) + 1

        lines.append("\n**By Epoch**:")
        for epoch, count in sorted(epoch_counts.items(), key=lambda x: x[0].value):
            lines.append(f"- {epoch.value}: {count} loops")

        # Deaths
        death_count = sum(1 for l in loops if l.is_death_loop())
        lines.append(f"\n**Death Rate**: {death_count}/{len(loops)} ({100*death_count//len(loops) if loops else 0}%)")

        # Story sections
        lines.append(f"\n**Story Sections**: {len(self.sections)}")
        section_types = {}
        for s in self.sections:
            section_types[s.section_type] = section_types.get(s.section_type, 0) + 1

        for stype, count in section_types.items():
            lines.append(f"- {stype}: {count}")

        return "\n".join(lines)


# === Main Interface ===

class NarrativeEngine:
    """
    Main interface for narrative generation.

    Coordinates all narrative components.
    """

    def __init__(
        self,
        storage: Optional['LoopStorage'] = None,
        compression: Optional[CompressionManager] = None
    ):
        self.storage = storage
        self.compression = compression
        self.prose = ProseGenerator(storage)
        self.assembler = StoryAssembler(storage, compression)

    def generate_full_story(
        self,
        loops: List[Loop],
        anchors_per_epoch: int = 10
    ) -> str:
        """
        Generate a complete story from loops.

        Args:
            loops: All loops in chronological order
            anchors_per_epoch: Max detailed loops per epoch

        Returns:
            Complete story as markdown
        """
        self.assembler.assemble_story(loops, anchors_per_epoch)
        return self.assembler.get_prose_output()

    def generate_epoch_story(
        self,
        loops: List[Loop],
        epoch: EpochType
    ) -> str:
        """Generate story for a single epoch."""
        epoch_loops = [l for l in loops if l.epoch == epoch]
        if not epoch_loops:
            return f"No loops in {epoch.value} epoch."

        epoch_def = get_epoch_definition(epoch)
        lines = [
            f"# {epoch_def.name}",
            f"*{epoch_def.tagline}*",
            "",
            epoch_def.description,
            "",
            f"{len(epoch_loops)} loops in this epoch.",
            "",
        ]

        # Narrate top loops
        for loop in epoch_loops[:5]:
            lines.append(self.prose.narrate_loop(loop, DetailLevel.SUMMARY))
            lines.append("")

        if len(epoch_loops) > 5:
            lines.append(f"*...and {len(epoch_loops) - 5} more loops compressed.*")

        return "\n".join(lines)

    def generate_loop_narrative(
        self,
        loop: Loop,
        level: DetailLevel = DetailLevel.FULL
    ) -> str:
        """Generate narrative for a single loop."""
        return self.prose.narrate_loop(loop, level)

    def generate_montage(
        self,
        montage: Montage,
        montage_type: str = "failure"
    ) -> str:
        """Generate prose for a montage."""
        return self.prose.generate_montage_prose(montage, montage_type)

    def generate_subloop_hell(self, macro: SubLoopMacro) -> str:
        """Generate prose for a sub-loop hell sequence."""
        return self.prose.generate_subloop_prose(macro)

    def get_emotional_summary(self, loops: List[Loop]) -> str:
        """Get emotional arc summary."""
        arc = compute_emotional_arc(loops)
        return generate_emotional_summary(arc)

    def get_outline(self) -> str:
        """Get story outline after assembly."""
        return self.assembler.get_outline_output()

    def get_timeline(self, loops: List[Loop]) -> str:
        """Get loop timeline."""
        return self.assembler.get_timeline_output(loops)

    def get_statistics(self, loops: List[Loop]) -> str:
        """Get narrative statistics."""
        return self.assembler.get_statistics_output(loops)
