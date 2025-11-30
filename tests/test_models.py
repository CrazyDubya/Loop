"""
Tests for Loop Engine data models.

Tests cover:
- Loop, SubLoop, LoopClass creation and manipulation
- Hashing functions (determinism and collision resistance)
- Decision vector operations
- KnowledgeProfile and MoodProfile
"""

import pytest
from src.models import (
    Loop,
    SubLoop,
    LoopClass,
    EpochType,
    LoopTag,
    KnowledgeProfile,
    MoodProfile,
    EmotionalBaseline,
    generate_loop_id,
    generate_class_id,
    compute_outcome_hash,
    compute_knowledge_id,
    hamming_distance,
    mutate_vector,
    encode_decisions,
    decode_decisions,
    loops_equivalent,
    create_class_from_loop,
)


class TestLoopModel:
    """Tests for the Loop model."""

    def test_create_loop_defaults(self):
        """Test creating a loop with default values."""
        loop = Loop()
        assert loop.id.startswith("loop-")
        assert loop.parent_id is None
        assert loop.epoch == EpochType.NAIVE
        assert loop.key_choices == 0
        assert loop.tags == []
        assert loop.decision_trace == []

    def test_create_loop_with_values(self):
        """Test creating a loop with specific values."""
        loop = Loop(
            id="loop-test123",
            parent_id="loop-parent",
            epoch=EpochType.MAPPING,
            key_choices=5,
            outcome_hash="abc123",
            tags=["death", "explosion"],
            decision_trace=["node1", "node2", "node3"]
        )
        assert loop.id == "loop-test123"
        assert loop.parent_id == "loop-parent"
        assert loop.epoch == EpochType.MAPPING
        assert loop.key_choices == 5
        assert loop.outcome_hash == "abc123"
        assert "death" in loop.tags
        assert len(loop.decision_trace) == 3

    def test_loop_add_tag(self):
        """Test adding tags to a loop."""
        loop = Loop()
        loop.add_tag("test_tag")
        assert loop.has_tag("test_tag")
        # Adding same tag twice shouldn't duplicate
        loop.add_tag("test_tag")
        assert loop.tags.count("test_tag") == 1

    def test_loop_is_death_loop(self):
        """Test death loop detection."""
        loop = Loop(tags=[LoopTag.DEATH.value])
        assert loop.is_death_loop()

        normal_loop = Loop(tags=["success"])
        assert not normal_loop.is_death_loop()

    def test_loop_is_short_loop(self):
        """Test short loop detection."""
        short_loop = Loop(decision_trace=["a", "b"])
        assert short_loop.is_short_loop(threshold=4)

        long_loop = Loop(decision_trace=["a", "b", "c", "d", "e"])
        assert not long_loop.is_short_loop(threshold=4)


class TestSubLoopModel:
    """Tests for the SubLoop model."""

    def test_create_subloop(self):
        """Test creating a sub-loop."""
        subloop = SubLoop(
            parent_loop_id="loop-parent",
            start_time=3,
            end_time=5,
            attempts_count=100
        )
        assert subloop.parent_loop_id == "loop-parent"
        assert subloop.start_time == 3
        assert subloop.end_time == 5
        assert subloop.attempts_count == 100

    def test_subloop_duration(self):
        """Test sub-loop duration calculation."""
        subloop = SubLoop(
            parent_loop_id="loop-parent",
            start_time=3,
            end_time=7
        )
        assert subloop.duration() == 4

    def test_subloop_is_hell_loop(self):
        """Test hell loop detection."""
        hell = SubLoop(
            parent_loop_id="loop-parent",
            start_time=0,
            end_time=1,
            attempts_count=100
        )
        assert hell.is_hell_loop(threshold=50)

        normal = SubLoop(
            parent_loop_id="loop-parent",
            start_time=0,
            end_time=1,
            attempts_count=10
        )
        assert not normal.is_hell_loop(threshold=50)

    def test_subloop_end_after_start_validation(self):
        """Test that end_time must be after start_time."""
        with pytest.raises(ValueError):
            SubLoop(
                parent_loop_id="loop-parent",
                start_time=5,
                end_time=3  # Invalid: before start
            )


class TestLoopClassModel:
    """Tests for the LoopClass model."""

    def test_create_loop_class(self):
        """Test creating an equivalence class."""
        lc = LoopClass(
            outcome_hash="abc123",
            knowledge_id="def456",
            count=10,
            representative_id="loop-rep",
            sample_ids=["loop-1", "loop-2"]
        )
        assert lc.outcome_hash == "abc123"
        assert lc.count == 10
        assert len(lc.sample_ids) == 2

    def test_loop_class_equivalence_key(self):
        """Test equivalence key generation."""
        lc = LoopClass(outcome_hash="abc", knowledge_id="def")
        assert lc.equivalence_key() == ("abc", "def")

    def test_loop_class_add_loop(self):
        """Test adding loops to a class."""
        lc = LoopClass(outcome_hash="abc", knowledge_id="def")
        initial_count = lc.count

        lc.add_loop("loop-new")
        assert lc.count == initial_count + 1
        assert "loop-new" in lc.sample_ids

    def test_loop_class_compression_ratio(self):
        """Test compression ratio calculation."""
        lc = LoopClass(
            outcome_hash="abc",
            knowledge_id="def",
            count=100,
            sample_ids=["a", "b", "c"]
        )
        assert lc.compression_ratio() == pytest.approx(33.33, 0.1)


class TestHashingFunctions:
    """Tests for hashing functions."""

    def test_outcome_hash_deterministic(self):
        """Test that outcome hash is deterministic."""
        hash1 = compute_outcome_hash(
            survivors={"alice", "bob"},
            deaths={"charlie"},
            state_changes={"bomb_defused"},
            ending_type="success"
        )
        hash2 = compute_outcome_hash(
            survivors={"bob", "alice"},  # Different order
            deaths={"charlie"},
            state_changes={"bomb_defused"},
            ending_type="success"
        )
        assert hash1 == hash2

    def test_outcome_hash_different_inputs(self):
        """Test that different inputs produce different hashes."""
        hash1 = compute_outcome_hash(
            survivors={"alice"},
            deaths=set(),
            state_changes=set(),
            ending_type="success"
        )
        hash2 = compute_outcome_hash(
            survivors=set(),
            deaths={"alice"},
            state_changes=set(),
            ending_type="death"
        )
        assert hash1 != hash2

    def test_knowledge_hash_deterministic(self):
        """Test that knowledge hash is deterministic."""
        hash1 = compute_knowledge_id(
            facts={"fact1", "fact2"},
            secrets={"secret1"},
            skills=set()
        )
        hash2 = compute_knowledge_id(
            facts={"fact2", "fact1"},  # Different order
            secrets={"secret1"},
            skills=set()
        )
        assert hash1 == hash2


class TestDecisionVectors:
    """Tests for decision vector operations."""

    def test_hamming_distance_same(self):
        """Test Hamming distance of identical vectors."""
        assert hamming_distance(0b1010, 0b1010) == 0

    def test_hamming_distance_different(self):
        """Test Hamming distance of different vectors."""
        assert hamming_distance(0b1010, 0b0101) == 4
        assert hamming_distance(0b1111, 0b1110) == 1

    def test_mutate_vector(self):
        """Test vector mutation."""
        original = 0b00000000
        mutated = mutate_vector(original, n_flips=3, max_bits=8)
        assert hamming_distance(original, mutated) == 3

    def test_encode_decode_decisions(self):
        """Test decision encoding and decoding."""
        decision_map = {
            "GO_BANK": 0,
            "SAVE_SISTER": 1,
            "CHASE_VILLAIN": 2
        }
        flags = {"GO_BANK": True, "SAVE_SISTER": True, "CHASE_VILLAIN": False}

        encoded = encode_decisions(flags, decision_map)
        assert encoded == 0b011  # Bits 0 and 1 set

        decoded = decode_decisions(encoded, decision_map)
        assert "GO_BANK" in decoded
        assert "SAVE_SISTER" in decoded
        assert "CHASE_VILLAIN" not in decoded


class TestEquivalence:
    """Tests for loop equivalence."""

    def test_loops_equivalent_true(self):
        """Test that identical outcome+knowledge means equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="def")
        loop2 = Loop(outcome_hash="abc", knowledge_id="def")
        assert loops_equivalent(loop1, loop2)

    def test_loops_equivalent_false_outcome(self):
        """Test that different outcomes mean not equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="def")
        loop2 = Loop(outcome_hash="xyz", knowledge_id="def")
        assert not loops_equivalent(loop1, loop2)

    def test_loops_equivalent_false_knowledge(self):
        """Test that different knowledge means not equivalent."""
        loop1 = Loop(outcome_hash="abc", knowledge_id="def")
        loop2 = Loop(outcome_hash="abc", knowledge_id="xyz")
        assert not loops_equivalent(loop1, loop2)

    def test_create_class_from_loop(self):
        """Test creating a class from a loop."""
        loop = Loop(
            id="loop-test",
            outcome_hash="abc123",
            knowledge_id="def456"
        )
        lc = create_class_from_loop(loop)

        assert lc.outcome_hash == "abc123"
        assert lc.knowledge_id == "def456"
        assert lc.representative_id == "loop-test"
        assert "loop-test" in lc.sample_ids
        assert lc.count == 1


class TestKnowledgeProfile:
    """Tests for KnowledgeProfile."""

    def test_create_empty_profile(self):
        """Test creating empty knowledge profile."""
        kp = KnowledgeProfile.empty()
        assert kp.total_knowledge() == 0

    def test_learn_fact(self):
        """Test learning facts."""
        kp = KnowledgeProfile()
        assert kp.learn_fact("SISTER_AT_BANK") is True
        assert kp.learn_fact("SISTER_AT_BANK") is False  # Already known
        assert kp.knows("SISTER_AT_BANK")

    def test_discover_secret(self):
        """Test discovering secrets."""
        kp = KnowledgeProfile()
        assert kp.discover_secret("CODEWORD") is True
        assert "CODEWORD" in kp.secrets_discovered

    def test_knowledge_merge(self):
        """Test merging knowledge profiles."""
        kp1 = KnowledgeProfile.from_sets(facts={"fact1"})
        kp2 = KnowledgeProfile.from_sets(facts={"fact2"})
        merged = kp1.merge(kp2)
        assert "fact1" in merged.facts_known
        assert "fact2" in merged.facts_known

    def test_knowledge_delta(self):
        """Test knowledge delta calculation."""
        kp1 = KnowledgeProfile.from_sets(facts={"a", "b"})
        kp2 = KnowledgeProfile.from_sets(facts={"a"})
        delta = kp1.knowledge_delta(kp2)
        assert "b" in delta.facts_known
        assert "a" not in delta.facts_known


class TestMoodProfile:
    """Tests for MoodProfile."""

    def test_create_fresh_profile(self):
        """Test creating fresh mood profile."""
        mp = MoodProfile.fresh()
        assert mp.baseline_emotion == EmotionalBaseline.NEUTRAL
        assert mp.resilience_score == 0.5

    def test_add_trauma(self):
        """Test adding trauma."""
        mp = MoodProfile()
        initial_resilience = mp.resilience_score
        mp.add_trauma("witnessed_death")
        assert "witnessed_death" in mp.trauma_markers
        assert mp.resilience_score < initial_resilience

    def test_record_failure(self):
        """Test recording failures."""
        mp = MoodProfile()
        initial_hope = mp.hope_level
        mp.record_failure()
        assert mp.loops_since_last_success == 1
        assert mp.hope_level < initial_hope

    def test_record_success(self):
        """Test recording success."""
        mp = MoodProfile(loops_since_last_success=50, hope_level=0.2)
        mp.record_success()
        assert mp.loops_since_last_success == 0
        assert mp.hope_level > 0.2

    def test_is_broken(self):
        """Test broken state detection."""
        mp = MoodProfile(numbness_level=0.95)
        assert mp.is_broken()

        healthy_mp = MoodProfile()
        assert not healthy_mp.is_broken()


class TestIDGeneration:
    """Tests for ID generation."""

    def test_loop_id_format(self):
        """Test loop ID format."""
        loop_id = generate_loop_id()
        assert loop_id.startswith("loop-")
        assert len(loop_id) == 17  # "loop-" + 12 hex chars

    def test_class_id_format(self):
        """Test class ID format."""
        class_id = generate_class_id()
        assert class_id.startswith("class-")

    def test_unique_ids(self):
        """Test that IDs are unique."""
        ids = [generate_loop_id() for _ in range(100)]
        assert len(set(ids)) == 100
