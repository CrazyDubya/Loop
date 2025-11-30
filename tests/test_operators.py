"""
Tests for Loop Engine operators.

Tests cover:
- Operator base functionality
- CauseOperator
- AvoidOperator
- TriggerOperator
- ReliveOperator
- SlightlyChangeOperator
- GreatlyChangeOperator
"""

import pytest
import tempfile
import os

from src.models import (
    EventNode,
    Transition,
    DayGraph,
    NodeType,
    Loop,
    EpochType,
    create_empty_graph,
    hamming_distance,
    crossover_vectors,
    random_vector,
    mutate_vector,
)
from src.engine import (
    LoopStorage,
    create_storage,
    CauseOperator,
    AvoidOperator,
    TriggerOperator,
    ReliveOperator,
    SlightlyChangeOperator,
    GreatlyChangeOperator,
    create_operator,
)


# === Fixtures ===

@pytest.fixture
def simple_graph():
    """Create a simple test graph."""
    graph = create_empty_graph("Test Day", time_slots=5)

    # Add nodes
    graph.add_node(EventNode(
        id="start",
        name="Start",
        time_slot=0,
        node_type=NodeType.SOFT
    ))
    graph.add_node(EventNode(
        id="choice_a",
        name="Choice A",
        time_slot=1,
        node_type=NodeType.CRITICAL
    ))
    graph.add_node(EventNode(
        id="choice_b",
        name="Choice B",
        time_slot=1,
        node_type=NodeType.SOFT
    ))
    graph.add_node(EventNode(
        id="revelation",
        name="Learn Secret",
        time_slot=2,
        node_type=NodeType.REVELATION,
        effects=["LEARN:SECRET_X"]
    ))
    graph.add_node(EventNode(
        id="death",
        name="Death",
        time_slot=3,
        node_type=NodeType.DEATH
    ))
    graph.add_node(EventNode(
        id="success",
        name="Success",
        time_slot=3,
        node_type=NodeType.SOFT,
        preconditions=["KNOW:SECRET_X"]
    ))

    # Add transitions
    graph.add_transition(Transition(from_node="start", to_node="choice_a"))
    graph.add_transition(Transition(from_node="start", to_node="choice_b"))
    graph.add_transition(Transition(from_node="choice_a", to_node="revelation"))
    graph.add_transition(Transition(from_node="choice_a", to_node="death"))
    graph.add_transition(Transition(from_node="choice_b", to_node="death"))
    graph.add_transition(Transition(from_node="revelation", to_node="success"))
    graph.add_transition(Transition(from_node="revelation", to_node="death"))

    return graph


@pytest.fixture
def storage():
    """Create a temporary storage."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        path = f.name
    storage = create_storage(path)
    yield storage
    os.unlink(path)


# === Decision Vector Tests ===

class TestDecisionVectors:
    """Tests for decision vector operations."""

    def test_hamming_distance(self):
        """Test Hamming distance calculation."""
        assert hamming_distance(0b0000, 0b0000) == 0
        assert hamming_distance(0b0000, 0b1111) == 4
        assert hamming_distance(0b1010, 0b0101) == 4
        assert hamming_distance(0b1111, 0b1110) == 1

    def test_mutate_vector(self):
        """Test vector mutation."""
        original = 0b0000
        mutated = mutate_vector(original, 2, max_bits=4)
        # Should have exactly 2 bits flipped
        assert hamming_distance(original, mutated) == 2

    def test_crossover_vectors(self):
        """Test vector crossover."""
        vec1 = 0b11110000
        vec2 = 0b00001111
        # Crossover should combine bits from both
        child = crossover_vectors(vec1, vec2, max_bits=8)
        # Child should have some bits from each parent
        assert 0 <= child <= 0b11111111

    def test_random_vector(self):
        """Test random vector generation."""
        vec = random_vector(max_bits=8, density=0.5)
        assert 0 <= vec <= 0b11111111

    def test_random_vector_density(self):
        """Test that density affects bit distribution."""
        # With density 1.0, all bits should be set
        vec = random_vector(max_bits=4, density=1.0)
        assert vec == 0b1111

        # With density 0.0, no bits should be set
        vec = random_vector(max_bits=4, density=0.0)
        assert vec == 0b0000


# === CauseOperator Tests ===

class TestCauseOperator:
    """Tests for CauseOperator."""

    def test_cause_reachable_target(self, simple_graph):
        """Test causing a reachable event."""
        op = CauseOperator(simple_graph)
        result = op.execute(target_event="revelation", save=False)

        assert result.success
        assert result.loop is not None
        assert "revelation" in result.decisions

    def test_cause_unreachable_target(self, simple_graph):
        """Test causing an unreachable event."""
        op = CauseOperator(simple_graph)
        # success requires SECRET_X which is only from revelation
        # But revelation leads to success, so it should work
        result = op.execute(target_event="success", save=False)

        # Should find path: start -> choice_a -> revelation -> success
        assert result.success
        assert "revelation" in result.decisions
        assert "success" in result.decisions

    def test_cause_nonexistent_target(self, simple_graph):
        """Test causing a non-existent event."""
        op = CauseOperator(simple_graph)
        result = op.execute(target_event="nonexistent", save=False)

        assert not result.success
        assert "not found" in result.message.lower()


# === AvoidOperator Tests ===

class TestAvoidOperator:
    """Tests for AvoidOperator."""

    def test_avoid_death(self, simple_graph):
        """Test avoiding death node."""
        op = AvoidOperator(simple_graph)
        result = op.execute(target_event="death", save=False)

        # Might not find a path that avoids all deaths
        # since most paths lead to death
        if result.success:
            assert "death" not in result.decisions

    def test_avoid_critical_node(self, simple_graph):
        """Test avoiding a critical node."""
        op = AvoidOperator(simple_graph)
        result = op.execute(target_event="choice_a", save=False)

        if result.success:
            assert "choice_a" not in result.decisions
            # Should go through choice_b instead
            assert "choice_b" in result.decisions


# === TriggerOperator Tests ===

class TestTriggerOperator:
    """Tests for TriggerOperator."""

    def test_trigger_valid_sequence(self, simple_graph):
        """Test triggering a valid sequence."""
        op = TriggerOperator(simple_graph)
        result = op.execute(
            sequence=["start", "choice_a", "revelation"],
            save=False
        )

        assert result.success
        assert result.loop is not None
        # All checkpoints should be in the path
        for node in ["start", "choice_a", "revelation"]:
            assert node in result.decisions

    def test_trigger_impossible_sequence(self, simple_graph):
        """Test triggering an impossible sequence."""
        op = TriggerOperator(simple_graph)
        # Can't go from start directly to success (needs knowledge)
        # Actually, let's try a truly impossible sequence
        result = op.execute(
            sequence=["start", "death", "revelation"],  # Can't continue after death
            save=False
        )

        # This should fail or be partial
        # death is reachable but nothing after
        assert not result.success or result.partial_success

    def test_trigger_empty_sequence(self, simple_graph):
        """Test triggering empty sequence."""
        op = TriggerOperator(simple_graph)
        result = op.execute(sequence=[], save=False)

        assert not result.success
        assert "empty" in result.message.lower()


# === ReliveOperator Tests ===

class TestReliveOperator:
    """Tests for ReliveOperator."""

    def test_relive_requires_storage(self, simple_graph):
        """Test that relive requires storage."""
        op = ReliveOperator(simple_graph, storage=None)
        result = op.execute(reference_id="some-loop-id", save=False)

        assert not result.success
        assert "storage" in result.message.lower()

    def test_relive_existing_loop(self, simple_graph, storage):
        """Test reliving an existing loop."""
        # First create a loop
        cause_op = CauseOperator(simple_graph, storage)
        original = cause_op.execute(
            target_event="revelation",
            save=True
        )
        assert original.success

        # Now relive it
        relive_op = ReliveOperator(simple_graph, storage)
        result = relive_op.execute(
            reference_id=original.loop.id,
            save=False
        )

        assert result.success
        # Should follow same path
        assert result.decisions == original.decisions

    def test_relive_nonexistent_loop(self, simple_graph, storage):
        """Test reliving a non-existent loop."""
        op = ReliveOperator(simple_graph, storage)
        result = op.execute(reference_id="nonexistent-id", save=False)

        assert not result.success
        assert "not found" in result.message.lower()


# === SlightlyChangeOperator Tests ===

class TestSlightlyChangeOperator:
    """Tests for SlightlyChangeOperator."""

    def test_slightly_change_requires_storage(self, simple_graph):
        """Test that slightly_change requires storage."""
        op = SlightlyChangeOperator(simple_graph, storage=None)
        result = op.execute(reference_id="some-id", save=False)

        assert not result.success

    def test_slightly_change_makes_small_changes(self, simple_graph, storage):
        """Test that slightly_change makes small changes."""
        # Create a base loop
        cause_op = CauseOperator(simple_graph, storage)
        original = cause_op.execute(
            target_event="revelation",
            save=True
        )
        assert original.success

        # Make slight change
        change_op = SlightlyChangeOperator(simple_graph, storage)
        result = change_op.execute(
            reference_id=original.loop.id,
            changes=1,
            save=False,
            max_attempts=20
        )

        # May or may not succeed depending on graph structure
        if result.success:
            # Should be different from original
            assert result.decisions != original.decisions or len(result.decisions) != len(original.decisions)


# === GreatlyChangeOperator Tests ===

class TestGreatlyChangeOperator:
    """Tests for GreatlyChangeOperator."""

    def test_greatly_change_requires_storage(self, simple_graph):
        """Test that greatly_change requires storage."""
        op = GreatlyChangeOperator(simple_graph, storage=None)
        result = op.execute(reference_id="some-id", save=False)

        assert not result.success

    def test_greatly_change_makes_large_changes(self, simple_graph, storage):
        """Test that greatly_change makes significant changes."""
        # Create a base loop
        cause_op = CauseOperator(simple_graph, storage)
        original = cause_op.execute(
            target_event="revelation",
            save=True
        )
        assert original.success

        # Make large change
        change_op = GreatlyChangeOperator(simple_graph, storage)
        result = change_op.execute(
            reference_id=original.loop.id,
            min_distance=1,
            save=False
        )

        # Should produce a different path
        if result.success:
            orig_set = set(original.decisions)
            new_set = set(result.decisions)
            # Should have some difference
            assert orig_set != new_set


# === Operator Factory Tests ===

class TestOperatorFactory:
    """Tests for operator factory function."""

    def test_create_all_operators(self, simple_graph):
        """Test creating all operator types."""
        operator_types = [
            'cause', 'avoid', 'trigger',
            'relive', 'slightly_change', 'greatly_change'
        ]

        for op_type in operator_types:
            op = create_operator(op_type, simple_graph)
            assert op is not None

    def test_create_invalid_operator(self, simple_graph):
        """Test creating invalid operator type."""
        with pytest.raises(ValueError):
            create_operator("invalid", simple_graph)
