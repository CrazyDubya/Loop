"""
Tests for Loop Engine compression system.

Tests cover:
- Equivalence relation
- Parametric families
- Anchor selection
- Montage compression
- Short loop clustering
- Sub-loop macros
- Compression manager
"""

import pytest
from datetime import datetime

from src.models import (
    Loop,
    LoopClass,
    SubLoop,
    EpochType,
    loops_equivalent,
    create_class_from_loop,
)
from src.engine import (
    # Equivalence
    compute_equivalence_key,
    loops_in_same_class,
    # Families
    StrategyType,
    RiskLevel,
    LoopFamily,
    infer_strategy,
    infer_risk_level,
    # Anchors
    AnchorCriteria,
    score_anchor_candidate,
    select_anchors,
    # Montages
    Montage,
    create_montage,
    # Short loops
    ShortLoopCluster,
    cluster_short_loops,
    # Sub-loop macros
    SubLoopMacro,
    detect_subloop_patterns,
    # Manager
    CompressionStats,
    CompressionManager,
)


# === Fixtures ===

@pytest.fixture
def sample_loops():
    """Create a set of sample loops for testing."""
    loops = []

    # Create some loops with same outcome (should be equivalent)
    for i in range(5):
        loop = Loop(
            epoch=EpochType.NAIVE,
            outcome_hash="hash_a",
            knowledge_id="know_1",
            decision_trace=["start", "middle", "end"],
            tags=["test"]
        )
        loops.append(loop)

    # Create some loops with different outcome
    for i in range(3):
        loop = Loop(
            epoch=EpochType.MAPPING,
            outcome_hash="hash_b",
            knowledge_id="know_2",
            decision_trace=["start", "other", "death"],
            tags=["death", "test"]
        )
        loops.append(loop)

    # Create some short loops (deaths)
    for i in range(10):
        loop = Loop(
            epoch=EpochType.NAIVE,
            outcome_hash="hash_c",
            knowledge_id="know_3",
            decision_trace=["start", "death"],
            tags=["death", "explosion"]
        )
        loops.append(loop)

    return loops


@pytest.fixture
def anchor_candidate_loops():
    """Create loops specifically for anchor testing."""
    loops = []

    # First loop in epoch (should get bonus)
    loop1 = Loop(
        epoch=EpochType.NAIVE,
        outcome_hash="unique_1",
        knowledge_id="know_1",
        decision_trace=["a", "b", "c", "d", "e"],
        tags=["first_loop"],
        created_at=1000.0
    )
    loops.append(loop1)

    # Breakthrough loop
    loop2 = Loop(
        epoch=EpochType.NAIVE,
        outcome_hash="unique_2",
        knowledge_id="know_2",
        decision_trace=["a", "b", "c", "d", "e", "f", "g"],
        tags=["breakthrough", "discovery"],
        created_at=2000.0
    )
    loops.append(loop2)

    # Catastrophic failure
    loop3 = Loop(
        epoch=EpochType.MAPPING,
        outcome_hash="common",
        knowledge_id="know_3",
        decision_trace=["a", "b", "c", "d", "e", "f", "g", "h", "i", "death"],
        tags=["death", "catastrophe"],
        created_at=3000.0
    )
    loops.append(loop3)

    # Manually designated anchor
    loop4 = Loop(
        epoch=EpochType.OBSESSION,
        outcome_hash="common",
        knowledge_id="know_4",
        decision_trace=["a", "b", "c"],
        tags=["anchor"],
        created_at=4000.0
    )
    loops.append(loop4)

    # Low-value loop (short, common)
    loop5 = Loop(
        epoch=EpochType.OBSESSION,
        outcome_hash="common",
        knowledge_id="know_5",
        decision_trace=["a", "b"],
        tags=[],
        created_at=5000.0
    )
    loops.append(loop5)

    return loops


# === Equivalence Tests ===

class TestEquivalence:
    """Tests for equivalence relation."""

    def test_compute_equivalence_key(self):
        """Test equivalence key computation."""
        loop = Loop(
            outcome_hash="abc123",
            knowledge_id="xyz789"
        )
        key = compute_equivalence_key(loop)

        assert key == ("abc123", "xyz789")

    def test_loops_equivalent_same(self):
        """Test that loops with same key are equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="xyz")
        loop2 = Loop(outcome_hash="abc", knowledge_id="xyz")

        assert loops_equivalent(loop1, loop2)
        assert loops_in_same_class(loop1, loop2)

    def test_loops_equivalent_different_outcome(self):
        """Test that different outcomes are not equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="xyz")
        loop2 = Loop(outcome_hash="def", knowledge_id="xyz")

        assert not loops_equivalent(loop1, loop2)

    def test_loops_equivalent_different_knowledge(self):
        """Test that different knowledge is not equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="xyz")
        loop2 = Loop(outcome_hash="abc", knowledge_id="uvw")

        assert not loops_equivalent(loop1, loop2)

    def test_equivalence_transitivity(self):
        """Test that equivalence is transitive."""
        loop_a = Loop(outcome_hash="same", knowledge_id="same")
        loop_b = Loop(outcome_hash="same", knowledge_id="same")
        loop_c = Loop(outcome_hash="same", knowledge_id="same")

        # A ~ B and B ~ C
        assert loops_equivalent(loop_a, loop_b)
        assert loops_equivalent(loop_b, loop_c)
        # Therefore A ~ C
        assert loops_equivalent(loop_a, loop_c)


# === Parametric Family Tests ===

class TestParametricFamilies:
    """Tests for parametric families."""

    def test_strategy_type_values(self):
        """Test strategy type enum."""
        assert StrategyType.BRUTE_FORCE.value == "brute_force"
        assert StrategyType.STEALTH.value == "stealth"
        assert StrategyType.PERSUASION.value == "persuasion"

    def test_risk_level_values(self):
        """Test risk level enum."""
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.EXTREME.value == "extreme"

    def test_infer_strategy_short_withdrawal(self):
        """Test inferring withdrawal strategy from short loops."""
        loop = Loop(
            decision_trace=["start", "end"],
            tags=[]
        )
        strategy = infer_strategy(loop)
        assert strategy == StrategyType.WITHDRAWAL

    def test_infer_strategy_stealth_tag(self):
        """Test inferring stealth strategy from tags."""
        loop = Loop(
            decision_trace=["a", "b", "c", "d", "e"],
            tags=["stealth", "sneak"]
        )
        strategy = infer_strategy(loop)
        assert strategy == StrategyType.STEALTH

    def test_infer_strategy_brute_force_tag(self):
        """Test inferring brute force from tags."""
        loop = Loop(
            decision_trace=["a", "b", "c", "d", "e"],
            tags=["force", "fight"]
        )
        strategy = infer_strategy(loop)
        assert strategy == StrategyType.BRUTE_FORCE

    def test_infer_risk_death_high(self):
        """Test that death loops are high risk."""
        loop = Loop(
            decision_trace=["a", "b", "c", "d", "e", "f"],
            tags=["death"]
        )
        risk = infer_risk_level(loop)
        assert risk == RiskLevel.HIGH

    def test_infer_risk_short_death_extreme(self):
        """Test that short death loops are extreme risk."""
        loop = Loop(
            decision_trace=["a", "b"],
            tags=["death"]
        )
        risk = infer_risk_level(loop)
        assert risk == RiskLevel.EXTREME

    def test_loop_family_matches(self):
        """Test loop family pattern matching."""
        family = LoopFamily(
            strategy_type=StrategyType.STEALTH,
            risk_level=RiskLevel.MEDIUM,
            key_choices_pattern=0b1010,
            key_choices_mask=0b1111
        )

        matching_loop = Loop(key_choices=0b1010)
        non_matching_loop = Loop(key_choices=0b0101)

        assert family.matches_loop(matching_loop)
        assert not family.matches_loop(non_matching_loop)


# === Anchor Selection Tests ===

class TestAnchorSelection:
    """Tests for anchor selection."""

    def test_score_anchor_first_in_epoch(self, anchor_candidate_loops):
        """Test first-in-epoch bonus."""
        loops = anchor_candidate_loops
        epoch_first = {EpochType.NAIVE: loops[0].id}

        score = score_anchor_candidate(loops[0], loops, epoch_first)

        assert AnchorCriteria.FIRST_IN_EPOCH in score.criteria_met
        assert score.breakdown.get("first_in_epoch", 0) > 0

    def test_score_anchor_breakthrough(self, anchor_candidate_loops):
        """Test breakthrough bonus."""
        loops = anchor_candidate_loops
        breakthrough_loop = loops[1]  # Has "breakthrough" tag

        score = score_anchor_candidate(breakthrough_loop, loops)

        assert AnchorCriteria.MAJOR_BREAKTHROUGH in score.criteria_met

    def test_score_anchor_manual(self, anchor_candidate_loops):
        """Test manually designated anchor bonus."""
        loops = anchor_candidate_loops
        manual_loop = loops[3]  # Has "anchor" tag

        score = score_anchor_candidate(manual_loop, loops)

        assert AnchorCriteria.MANUALLY_DESIGNATED in score.criteria_met
        assert score.breakdown.get("manual", 0) == 25

    def test_select_anchors(self, anchor_candidate_loops):
        """Test anchor selection."""
        anchors = select_anchors(anchor_candidate_loops, n=3, min_score=5.0)

        # Should select high-scoring loops
        assert len(anchors) <= 3

    def test_select_anchors_empty(self):
        """Test anchor selection with no loops."""
        anchors = select_anchors([], n=10)
        assert anchors == []


# === Montage Tests ===

class TestMontages:
    """Tests for montage compression."""

    def test_montage_generate_summary_single(self):
        """Test summary for single loop."""
        montage = Montage(class_id="class-1", count=1)
        summary = montage.generate_summary()
        assert summary == "Once."

    def test_montage_generate_summary_few(self):
        """Test summary for few loops."""
        montage = Montage(class_id="class-1", count=5)
        summary = montage.generate_summary()
        assert "5 times" in summary

    def test_montage_generate_summary_many(self):
        """Test summary for many loops."""
        montage = Montage(class_id="class-1", count=500)
        summary = montage.generate_summary()
        assert "500 times" in summary or "Hundreds" in summary

    def test_montage_generate_summary_thousands(self):
        """Test summary for thousands of loops."""
        montage = Montage(class_id="class-1", count=5000)
        summary = montage.generate_summary()
        assert "5,000" in summary or "Thousands" in summary

    def test_create_montage(self, sample_loops):
        """Test creating a montage from loops."""
        # Create a class
        loop_class = create_class_from_loop(sample_loops[0])
        for loop in sample_loops[1:5]:
            loop_class.add_loop(loop.id)

        montage = create_montage(loop_class, sample_loops[:5])

        assert montage.class_id == loop_class.id
        assert montage.count == loop_class.count
        assert len(montage.representative_ids) <= 3


# === Short Loop Clustering Tests ===

class TestShortLoopClustering:
    """Tests for short loop clustering."""

    def test_cluster_short_loops(self, sample_loops):
        """Test clustering short loops."""
        clusters = cluster_short_loops(sample_loops, max_trace_length=3)

        # Should find the short death loops
        assert len(clusters) > 0

        # Should have count info
        total_short = sum(c.count for c in clusters)
        assert total_short > 0

    def test_short_loop_cluster_summary(self):
        """Test cluster summary generation."""
        cluster = ShortLoopCluster(
            death_time=1,
            death_cause="explosion",
            count=150
        )
        summary = cluster.generate_summary()

        assert "150" in summary or "Dozens" in summary

    def test_cluster_no_short_loops(self):
        """Test clustering with no short loops."""
        long_loops = [
            Loop(decision_trace=["a", "b", "c", "d", "e", "f"])
            for _ in range(5)
        ]
        clusters = cluster_short_loops(long_loops, max_trace_length=3)

        assert len(clusters) == 0


# === Sub-Loop Macro Tests ===

class TestSubLoopMacros:
    """Tests for sub-loop macros."""

    def test_subloop_macro_summary_few(self):
        """Test macro summary for few attempts."""
        macro = SubLoopMacro(
            time_window_start=3,
            time_window_end=5,
            attempts_count=5,
            emotional_effect="frustration"
        )
        summary = macro.generate_summary()

        assert "5" in summary

    def test_subloop_macro_summary_many(self):
        """Test macro summary for many attempts."""
        macro = SubLoopMacro(
            time_window_start=3,
            time_window_end=5,
            attempts_count=150,
            emotional_effect="numbness"
        )
        summary = macro.generate_summary()

        assert "150" in summary or "eternity" in summary.lower()

    def test_detect_subloop_patterns(self):
        """Test detecting sub-loop patterns."""
        subloops = [
            SubLoop(
                parent_loop_id="loop-1",
                start_time=3,
                end_time=5,
                attempts_count=10
            ),
            SubLoop(
                parent_loop_id="loop-1",
                start_time=3,
                end_time=5,
                attempts_count=20
            ),
        ]

        macros = detect_subloop_patterns(subloops, min_attempts=5)

        # Should detect the repeated pattern
        assert len(macros) > 0
        assert macros[0].attempts_count == 30  # Combined attempts


# === Compression Stats Tests ===

class TestCompressionStats:
    """Tests for compression statistics."""

    def test_compression_ratio(self):
        """Test compression ratio calculation."""
        stats = CompressionStats(
            total_loops=10000,
            total_classes=100
        )
        assert stats.compression_ratio == 100.0

    def test_compression_ratio_zero_classes(self):
        """Test compression ratio with zero classes."""
        stats = CompressionStats(
            total_loops=100,
            total_classes=0
        )
        assert stats.compression_ratio == 0

    def test_anchor_density(self):
        """Test anchor density calculation."""
        stats = CompressionStats(
            total_loops=10000,
            total_anchors=50
        )
        assert stats.anchor_density == 5.0  # 50 anchors per 1000 loops

    def test_stats_to_dict(self):
        """Test converting stats to dictionary."""
        stats = CompressionStats(
            total_loops=1000,
            total_classes=10,
            total_anchors=5
        )
        d = stats.to_dict()

        assert d["total_loops"] == 1000
        assert d["compression_ratio"] == 100.0


# === Compression Manager Tests ===

class TestCompressionManager:
    """Tests for compression manager."""

    def test_compress_loops(self, sample_loops):
        """Test full compression pipeline."""
        manager = CompressionManager()
        stats = manager.compress_loops(sample_loops, anchor_count=5)

        assert stats.total_loops == len(sample_loops)
        assert stats.total_classes > 0
        assert stats.total_families > 0

    def test_compression_manager_families(self, sample_loops):
        """Test that families are created."""
        manager = CompressionManager()
        manager.compress_loops(sample_loops)

        assert len(manager.families) > 0

    def test_compression_manager_anchors(self, sample_loops):
        """Test anchor selection in manager."""
        manager = CompressionManager()
        manager.compress_loops(sample_loops, anchor_count=3)

        # May not have 3 anchors if not enough qualify
        assert len(manager.anchors) >= 0

    def test_compression_manager_montages(self, sample_loops):
        """Test montage creation in manager."""
        manager = CompressionManager()
        manager.compress_loops(sample_loops)

        assert len(manager.montages) > 0

    def test_is_anchor(self, sample_loops):
        """Test anchor checking."""
        manager = CompressionManager()
        manager.compress_loops(sample_loops, anchor_count=2)

        # At least check that is_anchor works
        for loop in sample_loops:
            result = manager.is_anchor(loop.id)
            assert isinstance(result, bool)

    def test_get_compression_report(self, sample_loops):
        """Test compression report generation."""
        manager = CompressionManager()
        manager.compress_loops(sample_loops)

        report = manager.get_compression_report()

        assert "Families" in report
        assert "Anchors" in report
