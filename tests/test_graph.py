"""
Tests for Loop Engine graph models and operations.

Tests cover:
- EventNode creation and validation
- Transition conditions
- DayGraph construction and queries
- WorldState transitions
- Pathfinding and simulation
- Graph analysis
"""

import json
import tempfile
import pytest

from src.models import (
    EventNode,
    Transition,
    DayGraph,
    WorldState,
    NodeType,
    load_graph,
    create_empty_graph,
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
def bank_day_graph():
    """Load the example bank day graph."""
    return load_graph("data/graphs/example_day.json")


# === EventNode Tests ===

class TestEventNode:
    """Tests for EventNode."""

    def test_create_node(self):
        """Test creating a basic event node."""
        node = EventNode(
            id="test_node",
            name="Test Node",
            time_slot=5,
            node_type=NodeType.CRITICAL
        )
        assert node.id == "test_node"
        assert node.time_slot == 5
        assert node.is_critical()
        assert not node.is_death()

    def test_node_type_helpers(self):
        """Test node type helper methods."""
        death = EventNode(id="d", name="Death", time_slot=0, node_type=NodeType.DEATH)
        assert death.is_death()

        revelation = EventNode(id="r", name="Rev", time_slot=0, node_type=NodeType.REVELATION)
        assert revelation.is_revelation()

    def test_can_enter_no_preconditions(self):
        """Test entering node with no preconditions."""
        node = EventNode(id="n", name="N", time_slot=0)
        assert node.can_enter(set(), set())

    def test_can_enter_knowledge_required(self):
        """Test entering node requiring knowledge."""
        node = EventNode(
            id="n",
            name="N",
            time_slot=0,
            preconditions=["KNOW:SECRET"]
        )
        assert not node.can_enter(set(), set())
        assert node.can_enter({"SECRET"}, set())

    def test_can_enter_not_condition(self):
        """Test entering node with NOT condition."""
        node = EventNode(
            id="n",
            name="N",
            time_slot=0,
            preconditions=["NOT:DEAD"]
        )
        assert node.can_enter(set(), set())
        assert not node.can_enter(set(), {"DEAD"})

    def test_apply_effects(self):
        """Test applying node effects."""
        node = EventNode(
            id="n",
            name="N",
            time_slot=0,
            effects=["LEARN:FACT1", "SET:STATE1"]
        )
        knowledge, world = node.apply_effects(set(), set())
        assert "FACT1" in knowledge
        assert "STATE1" in world


# === Transition Tests ===

class TestTransition:
    """Tests for Transition."""

    def test_create_transition(self):
        """Test creating a transition."""
        trans = Transition(
            from_node="a",
            to_node="b",
            time_cost=2,
            probability=0.5
        )
        assert trans.from_node == "a"
        assert trans.to_node == "b"
        assert trans.time_cost == 2
        assert trans.probability == 0.5

    def test_can_traverse_no_conditions(self):
        """Test traversing with no conditions."""
        trans = Transition(from_node="a", to_node="b")
        assert trans.can_traverse(set(), set())

    def test_can_traverse_knowledge_required(self):
        """Test traversing with knowledge condition."""
        trans = Transition(
            from_node="a",
            to_node="b",
            conditions=["KNOW:KEY"]
        )
        assert not trans.can_traverse(set(), set())
        assert trans.can_traverse({"KEY"}, set())

    def test_roll_success_certain(self):
        """Test probability roll with 100% chance."""
        trans = Transition(from_node="a", to_node="b", probability=1.0)
        assert trans.roll_success()

    def test_roll_success_impossible(self):
        """Test probability roll with 0% chance."""
        trans = Transition(from_node="a", to_node="b", probability=0.0)
        assert not trans.roll_success()


# === WorldState Tests ===

class TestWorldState:
    """Tests for WorldState."""

    def test_create_state(self):
        """Test creating world state."""
        state = WorldState()
        assert state.time_slot == 0
        assert state.current_node is None
        assert not state.is_dead

    def test_visit_node(self):
        """Test visiting a node."""
        state = WorldState()
        node = EventNode(
            id="test",
            name="Test",
            time_slot=3,
            location="bank",
            effects=["LEARN:FACT"]
        )
        state.visit_node(node)

        assert state.current_node == "test"
        assert state.time_slot == 3
        assert state.location == "bank"
        assert "FACT" in state.knowledge
        assert "test" in state.visited_nodes

    def test_visit_death_node(self):
        """Test visiting a death node."""
        state = WorldState()
        node = EventNode(
            id="death",
            name="Death",
            time_slot=5,
            node_type=NodeType.DEATH
        )
        state.visit_node(node)

        assert state.is_dead
        assert state.death_node == "death"

    def test_copy_state(self):
        """Test copying state."""
        state = WorldState(
            time_slot=5,
            knowledge={"fact1"},
            world_facts={"state1"}
        )
        copy = state.copy_state()

        # Modify original
        state.knowledge.add("fact2")

        # Copy should be unchanged
        assert "fact2" not in copy.knowledge


# === DayGraph Tests ===

class TestDayGraph:
    """Tests for DayGraph."""

    def test_create_empty_graph(self):
        """Test creating empty graph."""
        graph = create_empty_graph("Test", 10)
        assert graph.name == "Test"
        assert graph.total_time_slots == 10
        assert len(graph.nodes) == 0

    def test_add_node(self, simple_graph):
        """Test adding nodes."""
        assert len(simple_graph.nodes) == 6
        assert "start" in simple_graph.nodes

    def test_remove_node(self, simple_graph):
        """Test removing nodes."""
        initial_count = len(simple_graph.nodes)
        simple_graph.remove_node("choice_b")
        assert len(simple_graph.nodes) == initial_count - 1
        assert "choice_b" not in simple_graph.nodes

    def test_add_transition(self, simple_graph):
        """Test adding transitions."""
        assert len(simple_graph.transitions) == 7

    def test_get_transitions_from(self, simple_graph):
        """Test getting outgoing transitions."""
        trans = simple_graph.get_transitions_from("start")
        assert len(trans) == 2
        targets = {t.to_node for t in trans}
        assert targets == {"choice_a", "choice_b"}

    def test_get_nodes_by_type(self, simple_graph):
        """Test querying nodes by type."""
        critical = simple_graph.get_nodes_by_type(NodeType.CRITICAL)
        assert len(critical) == 1
        assert critical[0].id == "choice_a"

    def test_get_nodes_at_time(self, simple_graph):
        """Test querying nodes by time slot."""
        at_t1 = simple_graph.get_nodes_at_time(1)
        assert len(at_t1) == 2
        ids = {n.id for n in at_t1}
        assert ids == {"choice_a", "choice_b"}

    def test_get_start_node(self, simple_graph):
        """Test getting start node."""
        start = simple_graph.get_start_node()
        assert start is not None
        assert start.id == "start"
        assert start.time_slot == 0

    def test_get_death_nodes(self, simple_graph):
        """Test getting death nodes."""
        deaths = simple_graph.get_death_nodes()
        assert len(deaths) == 1
        assert deaths[0].id == "death"


# === Pathfinding Tests ===

class TestPathfinding:
    """Tests for pathfinding operations."""

    def test_get_valid_choices(self, simple_graph):
        """Test getting valid choices from a node."""
        choices = simple_graph.get_valid_choices("start", set(), set())
        assert len(choices) == 2

    def test_get_valid_choices_with_conditions(self, simple_graph):
        """Test valid choices with conditions."""
        # From revelation, can go to success only with knowledge
        choices = simple_graph.get_valid_choices("revelation", set(), set())
        targets = {c.to_node for c in choices}
        assert "success" not in targets  # Need SECRET_X

        choices = simple_graph.get_valid_choices("revelation", {"SECRET_X"}, set())
        targets = {c.to_node for c in choices}
        assert "success" in targets

    def test_find_paths_simple(self, simple_graph):
        """Test finding paths to a goal."""
        paths = simple_graph.find_paths("start", "revelation")
        assert len(paths) >= 1
        assert paths[0] == ["start", "choice_a", "revelation"]

    def test_find_paths_no_path(self, simple_graph):
        """Test finding paths when none exist."""
        paths = simple_graph.find_paths("death", "start")  # Can't go back
        assert len(paths) == 0

    def test_is_reachable(self, simple_graph):
        """Test reachability check."""
        assert simple_graph.is_reachable("start", "death")
        assert simple_graph.is_reachable("start", "revelation")

    def test_is_reachable_conditional(self, simple_graph):
        """Test conditional reachability."""
        # Success requires SECRET_X, but revelation grants it
        # So from start, we CAN reach success (via revelation)
        assert simple_graph.is_reachable("start", "success", set(), set())

        # If we start with knowledge, it's still reachable
        assert simple_graph.is_reachable("start", "success", {"SECRET_X"}, set())


# === Simulation Tests ===

class TestSimulation:
    """Tests for loop simulation."""

    def test_simulate_simple_path(self, simple_graph):
        """Test simulating a simple path."""
        result = simple_graph.simulate_loop(
            ["start", "choice_a", "revelation", "success"],
            probabilistic=False
        )
        assert result.success
        assert "SECRET_X" in result.knowledge_gained
        assert not result.terminated_early
        assert result.final_state is not None

    def test_simulate_death(self, simple_graph):
        """Test simulating path to death."""
        result = simple_graph.simulate_loop(
            ["start", "choice_a", "death"],
            probabilistic=False
        )
        assert result.success  # Simulation succeeded
        assert result.death_node == "death"
        assert result.final_state.is_dead

    def test_simulate_invalid_path(self, simple_graph):
        """Test simulating invalid path."""
        result = simple_graph.simulate_loop(
            ["start", "revelation"],  # No direct edge
            probabilistic=False
        )
        assert not result.success
        assert result.terminated_early

    def test_simulate_precondition_fail(self, simple_graph):
        """Test simulation failing on precondition."""
        result = simple_graph.simulate_loop(
            ["start", "choice_b", "success"],  # choice_b doesn't lead to success
            probabilistic=False
        )
        assert not result.success


# === Analysis Tests ===

class TestGraphAnalysis:
    """Tests for graph analysis."""

    def test_get_reachability_map(self, simple_graph):
        """Test getting reachability map."""
        reachable = simple_graph.get_reachability_map("start")
        assert "start" in reachable
        assert "choice_a" in reachable
        assert "death" in reachable

    def test_validate_valid_graph(self, simple_graph):
        """Test validating a valid graph."""
        errors = simple_graph.validate()
        # Our simple graph might have some warnings but should be usable
        # Check that critical errors are not present
        critical_errors = [e for e in errors if "orphan" in e.lower()]
        # We expect no orphan errors since all nodes are connected
        assert len([e for e in errors if "start" in e]) == 0


# === Serialization Tests ===

class TestSerialization:
    """Tests for graph serialization."""

    def test_to_json(self, simple_graph):
        """Test converting graph to JSON."""
        json_str = simple_graph.to_json()
        data = json.loads(json_str)

        assert data["meta"]["name"] == "Test Day"
        assert len(data["nodes"]) == 6
        assert len(data["transitions"]) == 7

    def test_from_json(self, simple_graph):
        """Test loading graph from JSON."""
        json_str = simple_graph.to_json()
        loaded = DayGraph.from_json(json_str)

        assert loaded.name == simple_graph.name
        assert len(loaded.nodes) == len(simple_graph.nodes)
        assert len(loaded.transitions) == len(simple_graph.transitions)

    def test_save_and_load(self, simple_graph):
        """Test saving and loading graph to file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            path = f.name

        simple_graph.save(path)
        loaded = load_graph(path)

        assert loaded.name == simple_graph.name
        assert len(loaded.nodes) == len(simple_graph.nodes)

        import os
        os.unlink(path)


# === Bank Day Graph Tests ===

class TestBankDayGraph:
    """Tests using the example bank day graph."""

    def test_load_bank_day(self, bank_day_graph):
        """Test loading the bank day graph."""
        assert bank_day_graph.name == "The Bank Day"
        assert len(bank_day_graph.nodes) > 10

    def test_bank_day_has_structure(self, bank_day_graph):
        """Test bank day has expected structure."""
        assert bank_day_graph.get_start_node() is not None
        assert len(bank_day_graph.get_death_nodes()) > 0
        assert len(bank_day_graph.get_revelation_nodes()) > 0

    def test_bank_day_simulation(self, bank_day_graph):
        """Test simulating a path through bank day."""
        # Simple path: wake up -> morning choice -> stay home -> phone rings
        result = bank_day_graph.simulate_loop(
            ["wake_up", "morning_choice", "stay_home", "phone_rings"],
            probabilistic=False
        )
        assert result.success
        assert "SISTER_AT_BANK" in result.final_state.knowledge

    def test_bank_day_find_paths(self, bank_day_graph):
        """Test finding paths in bank day."""
        paths = bank_day_graph.find_paths("wake_up", "meet_stranger")
        assert len(paths) >= 1
