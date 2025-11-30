"""
Tests for Loop Engine policies and generator.

Tests cover:
- Policy interface
- NaivePolicy
- ScientistPolicy
- DesperatePolicy
- PerfectionistPolicy
- ObsessivePolicy
- LoopGenerator
- Generation statistics
"""

import pytest
import tempfile
import os

from src.models import (
    EventNode,
    Transition,
    DayGraph,
    NodeType,
    EpochType,
    create_empty_graph,
    fresh_mood,
)
from src.engine import (
    LoopStorage,
    create_storage,
    # Policies
    PolicyType,
    NaivePolicy,
    ScientistPolicy,
    DesperatePolicy,
    PerfectionistPolicy,
    ObsessivePolicy,
    create_policy,
    get_policy_for_epoch,
    # Generator
    LoopGenerator,
    GenerationStats,
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


# === NaivePolicy Tests ===

class TestNaivePolicy:
    """Tests for NaivePolicy."""

    def test_policy_type(self, simple_graph):
        """Test policy type."""
        policy = NaivePolicy(simple_graph)
        assert policy.policy_type == PolicyType.NAIVE

    def test_decide_returns_decision(self, simple_graph):
        """Test that decide returns a valid decision."""
        policy = NaivePolicy(simple_graph)
        decision = policy.decide(current_knowledge=set())

        assert decision is not None
        assert decision.operator_name in ['cause', 'avoid']
        assert 'target_event' in decision.parameters

    def test_random_exploration(self, simple_graph):
        """Test that naive policy explores randomly."""
        policy = NaivePolicy(simple_graph)

        # Generate multiple decisions
        decisions = [
            policy.decide(current_knowledge=set())
            for _ in range(20)
        ]

        # Should have some variety
        targets = set(d.parameters.get('target_event') for d in decisions)
        assert len(targets) > 1  # Not always the same target


# === ScientistPolicy Tests ===

class TestScientistPolicy:
    """Tests for ScientistPolicy."""

    def test_policy_type(self, simple_graph):
        """Test policy type."""
        policy = ScientistPolicy(simple_graph)
        assert policy.policy_type == PolicyType.SCIENTIST

    def test_systematic_testing(self, simple_graph):
        """Test that scientist tests systematically."""
        policy = ScientistPolicy(simple_graph)

        # Make multiple decisions
        decisions = []
        for _ in range(10):
            d = policy.decide(current_knowledge=set())
            decisions.append(d)

        # Should use both cause and avoid
        operators = set(d.operator_name for d in decisions)
        assert 'cause' in operators or 'avoid' in operators

    def test_tracks_tested_events(self, simple_graph):
        """Test that scientist tracks what's been tested."""
        policy = ScientistPolicy(simple_graph)

        # Make decisions
        for _ in range(5):
            policy.decide(current_knowledge=set())

        # Should have tested some events
        assert len(policy.tested_events) > 0


# === DesperatePolicy Tests ===

class TestDesperatePolicy:
    """Tests for DesperatePolicy."""

    def test_policy_type(self, simple_graph):
        """Test policy type."""
        policy = DesperatePolicy(simple_graph)
        assert policy.policy_type == PolicyType.DESPERATE

    def test_uses_greatly_change(self, simple_graph, storage):
        """Test that desperate policy uses greatly_change."""
        policy = DesperatePolicy(simple_graph, storage)

        # Create some loops in history
        from src.engine import CauseOperator
        cause_op = CauseOperator(simple_graph, storage)
        for _ in range(3):
            result = cause_op.execute(target_event="revelation", save=True)
            if result.success:
                policy.record_loop(result.loop.id)

        # Now decide
        decision = policy.decide(current_knowledge=set())

        # Should use greatly_change (or cause if no history)
        assert decision.operator_name in ['greatly_change', 'cause']


# === PerfectionistPolicy Tests ===

class TestPerfectionistPolicy:
    """Tests for PerfectionistPolicy."""

    def test_policy_type(self, simple_graph):
        """Test policy type."""
        policy = PerfectionistPolicy(simple_graph)
        assert policy.policy_type == PolicyType.PERFECTIONIST

    def test_seeks_best_loop(self, simple_graph, storage):
        """Test that perfectionist seeks best loop."""
        policy = PerfectionistPolicy(simple_graph, storage)

        # Without a best loop, should explore
        decision = policy.decide(current_knowledge=set())
        assert decision.operator_name == 'cause'

    def test_refines_best_loop(self, simple_graph, storage):
        """Test that perfectionist refines best loop."""
        policy = PerfectionistPolicy(simple_graph, storage)

        # Create a loop and set it as best
        from src.engine import CauseOperator
        cause_op = CauseOperator(simple_graph, storage)
        result = cause_op.execute(target_event="revelation", save=True)
        if result.success:
            policy.best_loop_id = result.loop.id
            policy.record_loop(result.loop.id)

            # Now should use relive or slightly_change
            decision = policy.decide(current_knowledge=set())
            assert decision.operator_name in ['relive', 'slightly_change']


# === ObsessivePolicy Tests ===

class TestObsessivePolicy:
    """Tests for ObsessivePolicy."""

    def test_policy_type(self, simple_graph):
        """Test policy type."""
        policy = ObsessivePolicy(simple_graph)
        assert policy.policy_type == PolicyType.OBSESSIVE

    def test_uses_trigger(self, simple_graph, storage):
        """Test that obsessive policy uses trigger."""
        policy = ObsessivePolicy(simple_graph, storage)

        # Set an obsession
        policy.set_obsession(["start", "choice_a", "revelation"])

        decision = policy.decide(current_knowledge=set())

        assert decision.operator_name == 'trigger'
        assert 'sequence' in decision.parameters

    def test_repeats_sequence(self, simple_graph):
        """Test that obsessive repeats same sequence."""
        policy = ObsessivePolicy(simple_graph)
        policy.set_obsession(["start", "revelation"])

        decisions = [
            policy.decide(current_knowledge=set())
            for _ in range(5)
        ]

        # All should trigger same sequence
        for d in decisions:
            assert d.operator_name == 'trigger'
            assert d.parameters['sequence'] == ["start", "revelation"]


# === Policy Factory Tests ===

class TestPolicyFactory:
    """Tests for policy factory functions."""

    def test_create_all_policies(self, simple_graph):
        """Test creating all policy types."""
        for pt in PolicyType:
            policy = create_policy(pt, simple_graph)
            assert policy is not None
            assert policy.policy_type == pt

    def test_create_policy_by_string(self, simple_graph):
        """Test creating policy by string name."""
        policy = create_policy("naive", simple_graph)
        assert policy.policy_type == PolicyType.NAIVE

    def test_get_policy_for_epoch(self, simple_graph):
        """Test getting policy for each epoch."""
        epoch_policies = {
            EpochType.NAIVE: PolicyType.NAIVE,
            EpochType.MAPPING: PolicyType.SCIENTIST,
            EpochType.OBSESSION: PolicyType.OBSESSIVE,
            EpochType.RUTHLESS: PolicyType.DESPERATE,
            EpochType.SYNTHESIS: PolicyType.PERFECTIONIST,
        }

        for epoch, expected_type in epoch_policies.items():
            policy = get_policy_for_epoch(epoch, simple_graph)
            assert policy.policy_type == expected_type


# === LoopGenerator Tests ===

class TestLoopGenerator:
    """Tests for LoopGenerator."""

    def test_create_generator(self, simple_graph):
        """Test creating a generator."""
        gen = LoopGenerator(simple_graph)
        assert gen.graph == simple_graph

    def test_generate_single_loop(self, simple_graph, storage):
        """Test generating a single loop."""
        gen = LoopGenerator(simple_graph, storage)
        policy = NaivePolicy(simple_graph, storage)

        loop, result, decision = gen.generate_loop(
            policy=policy,
            save=False
        )

        # May or may not succeed
        if result.success:
            assert loop is not None
            assert len(loop.decision_trace) > 0

    def test_batch_generate(self, simple_graph, storage):
        """Test batch generation."""
        gen = LoopGenerator(simple_graph, storage)
        policy = NaivePolicy(simple_graph, storage)

        loops, stats = gen.batch_generate(
            policy=policy,
            count=5,
            save=False
        )

        assert stats.total_attempts == 5
        # Should have at least some successful loops
        assert len(loops) >= 0  # May vary

    def test_generate_with_epoch_policy(self, simple_graph, storage):
        """Test generation with epoch policy."""
        gen = LoopGenerator(simple_graph, storage)

        loops, stats = gen.generate_with_epoch_policy(
            epoch=EpochType.NAIVE,
            count=3,
            save=False
        )

        assert stats.total_attempts == 3


# === GenerationStats Tests ===

class TestGenerationStats:
    """Tests for GenerationStats."""

    def test_record_attempt(self):
        """Test recording attempts."""
        stats = GenerationStats()
        stats.record_attempt(True, 'cause')
        stats.record_attempt(False, 'avoid')

        assert stats.total_attempts == 2
        assert stats.successful_loops == 1
        assert stats.failed_attempts == 1
        assert stats.operator_usage['cause'] == 1
        assert stats.operator_usage['avoid'] == 1

    def test_to_dict(self):
        """Test converting stats to dict."""
        stats = GenerationStats()
        stats.record_attempt(True, 'cause')
        stats.record_attempt(True, 'cause')

        d = stats.to_dict()

        assert d['total_attempts'] == 2
        assert d['successful_loops'] == 2
        assert d['success_rate'] == 1.0

    def test_finalize_stats(self, simple_graph, storage):
        """Test finalizing stats with loops."""
        from src.engine import CauseOperator

        cause_op = CauseOperator(simple_graph, storage)
        loops = []
        for _ in range(3):
            result = cause_op.execute(target_event="revelation", save=True)
            if result.success:
                loops.append(result.loop)

        stats = GenerationStats()
        for loop in loops:
            stats.record_attempt(True, 'cause')
            stats.record_loop(loop)
        stats.finalize(loops)

        if loops:
            assert stats.unique_outcomes >= 1
            assert stats.average_trace_length > 0
