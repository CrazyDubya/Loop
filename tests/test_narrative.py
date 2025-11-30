"""
Tests for Loop Engine narrative generation.

Tests cover:
- Epoch definitions
- Prose generation
- Emotional arc tracking
- Story assembly
- Output formats
"""

import pytest

from src.models import (
    Loop,
    EpochType,
)
from src.engine import (
    # Compression (needed for montages)
    Montage,
    SubLoopMacro,
    # Narrative
    DetailLevel,
    NarrativeEpoch,
    CANONICAL_EPOCHS,
    get_epoch_definition,
    ProseGenerator,
    EmotionalPoint,
    compute_emotional_arc,
    find_emotional_peaks,
    generate_emotional_summary,
    StorySection,
    StoryAssembler,
    NarrativeEngine,
)


# === Fixtures ===

@pytest.fixture
def sample_loops():
    """Create sample loops across epochs."""
    loops = []

    # Naive epoch loops
    for i in range(5):
        loop = Loop(
            epoch=EpochType.NAIVE,
            outcome_hash=f"naive_{i}",
            knowledge_id="k1",
            decision_trace=["start", "middle", "end"] if i % 2 == 0 else ["start", "death"],
            tags=["death"] if i % 2 == 1 else []
        )
        loops.append(loop)

    # Mapping epoch loops
    for i in range(5):
        loop = Loop(
            epoch=EpochType.MAPPING,
            outcome_hash=f"map_{i}",
            knowledge_id="k2",
            decision_trace=["start", "explore", "learn", "success"],
            tags=["revelation"] if i == 0 else []
        )
        loops.append(loop)

    # Obsession epoch loops
    for i in range(3):
        loop = Loop(
            epoch=EpochType.OBSESSION,
            outcome_hash=f"obs_{i}",
            knowledge_id="k3",
            decision_trace=["start", "try", "fail", "retry", "fail", "retry", "success"],
            tags=["breakthrough"] if i == 2 else []
        )
        loops.append(loop)

    return loops


@pytest.fixture
def emotional_loops():
    """Create loops with emotional variation."""
    loops = []

    # Despair loop
    loops.append(Loop(
        epoch=EpochType.NAIVE,
        decision_trace=["a"],
        tags=["death", "despair", "trauma"]
    ))

    # Neutral loop
    loops.append(Loop(
        epoch=EpochType.MAPPING,
        decision_trace=["a", "b", "c", "d", "e"],
        tags=[]
    ))

    # Hope loop
    loops.append(Loop(
        epoch=EpochType.SYNTHESIS,
        decision_trace=["a", "b", "c", "d", "e", "f", "g"],
        tags=["breakthrough", "revelation"]
    ))

    # Another despair
    loops.append(Loop(
        epoch=EpochType.RUTHLESS,
        decision_trace=["a", "b"],
        tags=["death", "despair"]
    ))

    # Final hope
    loops.append(Loop(
        epoch=EpochType.SYNTHESIS,
        decision_trace=["a", "b", "c", "d", "e", "f"],
        tags=["breakthrough"]
    ))

    return loops


# === Epoch Definition Tests ===

class TestEpochDefinitions:
    """Tests for epoch definitions."""

    def test_canonical_epochs_exist(self):
        """Test that all canonical epochs are defined."""
        for epoch_type in EpochType:
            assert epoch_type in CANONICAL_EPOCHS

    def test_get_epoch_definition(self):
        """Test getting epoch definitions."""
        naive = get_epoch_definition(EpochType.NAIVE)
        assert naive.name == "Denial"
        assert naive.epoch_type == EpochType.NAIVE
        assert "happening" in naive.tagline.lower()

    def test_epoch_has_required_fields(self):
        """Test that epochs have all required fields."""
        for epoch_type, epoch in CANONICAL_EPOCHS.items():
            assert epoch.id
            assert epoch.name
            assert epoch.epoch_type == epoch_type
            assert epoch.tagline
            assert epoch.dominant_policy

    def test_epoch_emotional_arcs(self):
        """Test that epochs have emotional arcs."""
        for epoch in CANONICAL_EPOCHS.values():
            assert epoch.emotional_arc
            assert "→" in epoch.emotional_arc  # Has trajectory


# === Prose Generation Tests ===

class TestProseGeneration:
    """Tests for prose generation."""

    def test_montage_prose_failure(self):
        """Test failure montage prose."""
        gen = ProseGenerator()
        montage = Montage(class_id="test", count=347)

        prose = gen.generate_montage_prose(montage, "failure")

        assert "347" in prose
        assert len(prose) > 20

    def test_montage_prose_learning(self):
        """Test learning montage prose."""
        gen = ProseGenerator()
        montage = Montage(
            class_id="test",
            count=50,
            cumulative_knowledge={"secret_passage", "guard_schedule"}
        )

        prose = gen.generate_montage_prose(montage, "learning")

        assert "50" in prose

    def test_montage_prose_despair(self):
        """Test despair montage prose."""
        gen = ProseGenerator()
        montage = Montage(class_id="test", count=1000)

        prose = gen.generate_montage_prose(montage, "despair")

        assert len(prose) > 20

    def test_montage_prose_mastery(self):
        """Test mastery montage prose."""
        gen = ProseGenerator()
        montage = Montage(class_id="test", count=200)

        prose = gen.generate_montage_prose(montage, "mastery")

        assert "200" in prose

    def test_subloop_prose(self):
        """Test sub-loop hell prose."""
        gen = ProseGenerator()
        macro = SubLoopMacro(
            time_window_start=3,
            time_window_end=5,
            attempts_count=214,
            emotional_effect="numbness"
        )

        prose = gen.generate_subloop_prose(macro)

        assert "214" in prose or "eternity" in prose.lower()

    def test_loop_narration_flash(self):
        """Test flash narration."""
        gen = ProseGenerator()
        loop = Loop(
            epoch=EpochType.NAIVE,
            decision_trace=["start", "middle", "end"],
            tags=[]
        )

        prose = gen.narrate_loop(loop, DetailLevel.FLASH)

        assert "3" in prose  # Decision count
        assert "survival" in prose.lower()

    def test_loop_narration_summary(self):
        """Test summary narration."""
        gen = ProseGenerator()
        loop = Loop(
            epoch=EpochType.MAPPING,
            decision_trace=["start", "explore", "learn", "success"],
            tags=["revelation"]
        )

        prose = gen.narrate_loop(loop, DetailLevel.SUMMARY)

        assert "Mapping" in prose or "mapping" in prose.lower()
        assert "revelation" in prose.lower()

    def test_loop_narration_full(self):
        """Test full narration."""
        gen = ProseGenerator()
        loop = Loop(
            epoch=EpochType.SYNTHESIS,
            decision_trace=["start", "middle", "end", "finale"],
            tags=["breakthrough"]
        )

        prose = gen.narrate_loop(loop, DetailLevel.FULL)

        assert "##" in prose  # Has markdown headers
        assert "start" in prose.lower()


# === Emotional Arc Tests ===

class TestEmotionalArc:
    """Tests for emotional arc tracking."""

    def test_compute_emotional_arc(self, emotional_loops):
        """Test computing emotional arc."""
        arc = compute_emotional_arc(emotional_loops)

        assert len(arc) == len(emotional_loops)
        for point in arc:
            assert -1.0 <= point.intensity <= 1.0
            assert point.emotion in ["hope", "determination", "numbness", "frustration", "despair"]

    def test_emotional_point_fields(self, emotional_loops):
        """Test emotional point fields."""
        arc = compute_emotional_arc(emotional_loops)

        for i, point in enumerate(arc):
            assert point.loop_index == i
            assert point.loop_id == emotional_loops[i].id

    def test_find_emotional_peaks(self, emotional_loops):
        """Test finding emotional peaks."""
        arc = compute_emotional_arc(emotional_loops)
        peaks = find_emotional_peaks(arc)

        assert "hope_peaks" in peaks
        assert "despair_valleys" in peaks
        assert "turning_points" in peaks

    def test_generate_emotional_summary(self, emotional_loops):
        """Test emotional summary generation."""
        arc = compute_emotional_arc(emotional_loops)
        summary = generate_emotional_summary(arc)

        assert len(summary) > 20
        # Should describe overall trend
        assert any(word in summary.lower() for word in ["arc", "hope", "despair", "darkness", "light"])

    def test_empty_arc(self):
        """Test handling empty arc."""
        summary = generate_emotional_summary([])
        assert "no emotional data" in summary.lower()


# === Story Assembly Tests ===

class TestStoryAssembly:
    """Tests for story assembly."""

    def test_assemble_story(self, sample_loops):
        """Test assembling a complete story."""
        assembler = StoryAssembler()
        sections = assembler.assemble_story(sample_loops, anchors_per_epoch=3)

        assert len(sections) > 0
        # Should have opening
        assert any(s.section_type == "opening" for s in sections)
        # Should have resolution
        assert any(s.section_type == "resolution" for s in sections)

    def test_story_sections_have_content(self, sample_loops):
        """Test that story sections have content."""
        assembler = StoryAssembler()
        sections = assembler.assemble_story(sample_loops)

        for section in sections:
            assert section.content
            assert len(section.content) > 10

    def test_prose_output(self, sample_loops):
        """Test prose output."""
        assembler = StoryAssembler()
        assembler.assemble_story(sample_loops)

        prose = assembler.get_prose_output()

        assert len(prose) > 100
        assert "Loop" in prose  # Mentions loops
        assert "#" in prose  # Has markdown

    def test_outline_output(self, sample_loops):
        """Test outline output."""
        assembler = StoryAssembler()
        assembler.assemble_story(sample_loops)

        outline = assembler.get_outline_output()

        assert "Outline" in outline
        assert "Opening" in outline
        assert "Epoch" in outline

    def test_timeline_output(self, sample_loops):
        """Test timeline output."""
        assembler = StoryAssembler()
        assembler.assemble_story(sample_loops)

        timeline = assembler.get_timeline_output(sample_loops)

        assert "Timeline" in timeline
        # Should have emoji status markers
        assert "✓" in timeline or "💀" in timeline

    def test_statistics_output(self, sample_loops):
        """Test statistics output."""
        assembler = StoryAssembler()
        assembler.assemble_story(sample_loops)

        stats = assembler.get_statistics_output(sample_loops)

        assert "Statistics" in stats
        assert "Total Loops" in stats
        assert str(len(sample_loops)) in stats

    def test_empty_story(self):
        """Test assembling with no loops."""
        assembler = StoryAssembler()
        sections = assembler.assemble_story([])

        assert sections == []


# === Narrative Engine Tests ===

class TestNarrativeEngine:
    """Tests for the main narrative engine."""

    def test_create_engine(self):
        """Test creating a narrative engine."""
        engine = NarrativeEngine()
        assert engine is not None

    def test_generate_full_story(self, sample_loops):
        """Test generating full story."""
        engine = NarrativeEngine()
        story = engine.generate_full_story(sample_loops, anchors_per_epoch=3)

        assert len(story) > 200
        assert "Loop" in story

    def test_generate_epoch_story(self, sample_loops):
        """Test generating epoch-specific story."""
        engine = NarrativeEngine()
        story = engine.generate_epoch_story(sample_loops, EpochType.NAIVE)

        assert "Denial" in story
        assert "loops" in story.lower()

    def test_generate_loop_narrative(self):
        """Test generating loop narrative."""
        engine = NarrativeEngine()
        loop = Loop(
            epoch=EpochType.MAPPING,
            decision_trace=["a", "b", "c", "d", "e"],
            tags=["revelation"]
        )

        narrative = engine.generate_loop_narrative(loop, DetailLevel.FULL)

        assert len(narrative) > 50

    def test_generate_montage(self):
        """Test generating montage prose."""
        engine = NarrativeEngine()
        montage = Montage(class_id="test", count=500)

        prose = engine.generate_montage(montage, "failure")

        assert "500" in prose

    def test_generate_subloop_hell(self):
        """Test generating sub-loop hell prose."""
        engine = NarrativeEngine()
        macro = SubLoopMacro(
            time_window_start=2,
            time_window_end=4,
            attempts_count=100,
            emotional_effect="determination"
        )

        prose = engine.generate_subloop_hell(macro)

        assert "100" in prose or len(prose) > 30

    def test_get_emotional_summary(self, emotional_loops):
        """Test getting emotional summary."""
        engine = NarrativeEngine()
        summary = engine.get_emotional_summary(emotional_loops)

        assert len(summary) > 20

    def test_output_methods(self, sample_loops):
        """Test various output methods."""
        engine = NarrativeEngine()
        engine.generate_full_story(sample_loops)

        outline = engine.get_outline()
        timeline = engine.get_timeline(sample_loops)
        stats = engine.get_statistics(sample_loops)

        assert "Outline" in outline
        assert "Timeline" in timeline
        assert "Statistics" in stats


# === Integration Tests ===

class TestNarrativeIntegration:
    """Integration tests for the narrative system."""

    def test_full_pipeline(self, sample_loops):
        """Test the full narrative pipeline."""
        engine = NarrativeEngine()

        # Generate full story
        story = engine.generate_full_story(sample_loops)
        assert len(story) > 100

        # Get outline
        outline = engine.get_outline()
        assert "Opening" in outline

        # Get emotional summary
        emotional = engine.get_emotional_summary(sample_loops)
        assert len(emotional) > 0

        # Get statistics
        stats = engine.get_statistics(sample_loops)
        assert "Total Loops" in stats

    def test_story_structure(self, sample_loops):
        """Test that story has proper structure."""
        assembler = StoryAssembler()
        sections = assembler.assemble_story(sample_loops)

        section_types = [s.section_type for s in sections]

        # Should start with opening
        assert section_types[0] == "opening"
        # Should end with resolution
        assert section_types[-1] == "resolution"
        # Should have epoch intros
        assert "epoch_intro" in section_types

    def test_prose_variety(self):
        """Test that prose generation varies."""
        gen = ProseGenerator()
        montage = Montage(class_id="test", count=100)

        # Generate multiple times
        prose_samples = [
            gen.generate_montage_prose(montage, "failure")
            for _ in range(5)
        ]

        # Should have at least some variety (template rotation)
        # Note: With only 3 templates, we expect repetition after 3
        unique_count = len(set(prose_samples))
        assert unique_count >= 2  # At least some variety
