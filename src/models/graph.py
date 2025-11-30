"""
Graph models for the Loop Engine.

This module defines the day graph structure:
- EventNode: Points in time where something can happen
- Transition: Edges connecting events
- NodeType: Classification of events
- DayGraph: Container for the full graph
- WorldState: State at a point in time
"""

from __future__ import annotations

import json
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import random

from pydantic import BaseModel, Field, PrivateAttr, field_validator


# === Type Aliases ===
NodeID = str
TimeSlot = int


# === Enums ===

class NodeType(str, Enum):
    """Classification of event nodes."""
    CRITICAL = "critical"      # Branch points, key decisions
    SOFT = "soft"              # Flavor, atmosphere
    DEATH = "death"            # Loop terminators
    REVELATION = "revelation"  # Knowledge gains


# === Core Models ===

class EventNode(BaseModel):
    """
    A point in the day graph where something can happen.

    Events are nodes in the graph. Each has a time slot,
    type, preconditions, and effects.
    """
    id: NodeID
    name: str
    description: str = ""
    time_slot: TimeSlot
    node_type: NodeType = NodeType.SOFT
    location: str = ""
    preconditions: List[str] = Field(default_factory=list)
    effects: List[str] = Field(default_factory=list)

    @field_validator('node_type', mode='before')
    @classmethod
    def parse_node_type(cls, v):
        if isinstance(v, str):
            return NodeType(v)
        return v

    def is_critical(self) -> bool:
        return self.node_type == NodeType.CRITICAL

    def is_death(self) -> bool:
        return self.node_type == NodeType.DEATH

    def is_revelation(self) -> bool:
        return self.node_type == NodeType.REVELATION

    def can_enter(self, knowledge: Set[str], world_state: Set[str]) -> bool:
        """Check if preconditions are met."""
        for precond in self.preconditions:
            if precond.startswith("KNOW:"):
                fact = precond[5:]
                if fact not in knowledge:
                    return False
            elif precond.startswith("NOT:"):
                item = precond[4:]
                if item in knowledge or item in world_state:
                    return False
            elif precond.startswith("AT:"):
                # Location check - handled by caller
                pass
            else:
                # General state check
                if precond not in world_state and precond not in knowledge:
                    return False
        return True

    def apply_effects(self, knowledge: Set[str], world_state: Set[str]) -> Tuple[Set[str], Set[str]]:
        """Apply effects and return updated state."""
        new_knowledge = knowledge.copy()
        new_world = world_state.copy()

        for effect in self.effects:
            if effect.startswith("LEARN:"):
                fact = effect[6:]
                new_knowledge.add(fact)
            elif effect.startswith("SET:"):
                state = effect[4:]
                new_world.add(state)
            elif effect.startswith("UNSET:"):
                state = effect[6:]
                new_world.discard(state)
            else:
                # Default: add to world state
                new_world.add(effect)

        return new_knowledge, new_world


class Transition(BaseModel):
    """
    An edge connecting two events in the day graph.

    Transitions have time costs, conditions, and probabilities.
    """
    from_node: NodeID
    to_node: NodeID
    time_cost: int = 1
    conditions: List[str] = Field(default_factory=list)
    probability: float = Field(default=1.0, ge=0.0, le=1.0)

    def can_traverse(self, knowledge: Set[str], world_state: Set[str]) -> bool:
        """Check if transition conditions are met."""
        for cond in self.conditions:
            if cond.startswith("KNOW:"):
                fact = cond[5:]
                if fact not in knowledge:
                    return False
            elif cond.startswith("NOT:KNOW:"):
                fact = cond[9:]
                if fact in knowledge:
                    return False
            elif cond.startswith("NOT:"):
                item = cond[4:]
                if item in world_state:
                    return False
            else:
                if cond not in world_state and cond not in knowledge:
                    return False
        return True

    def roll_success(self) -> bool:
        """Roll for probabilistic transition success."""
        if self.probability >= 1.0:
            return True
        return random.random() < self.probability


class WorldState(BaseModel):
    """
    The state of the world at a point in time.

    Tracks what has happened, who is where, and what is known.
    """
    model_config = {"arbitrary_types_allowed": True}

    time_slot: TimeSlot = 0
    current_node: Optional[NodeID] = None
    location: str = ""
    knowledge: Set[str] = Field(default_factory=set)
    world_facts: Set[str] = Field(default_factory=set)
    visited_nodes: List[NodeID] = Field(default_factory=list)
    is_dead: bool = False
    death_node: Optional[NodeID] = None

    def copy_state(self) -> 'WorldState':
        """Create a deep copy of this state."""
        return WorldState(
            time_slot=self.time_slot,
            current_node=self.current_node,
            location=self.location,
            knowledge=self.knowledge.copy(),
            world_facts=self.world_facts.copy(),
            visited_nodes=self.visited_nodes.copy(),
            is_dead=self.is_dead,
            death_node=self.death_node
        )

    def visit_node(self, node: EventNode) -> None:
        """Update state after visiting a node."""
        self.current_node = node.id
        self.time_slot = node.time_slot
        self.location = node.location
        self.visited_nodes.append(node.id)

        # Apply effects
        self.knowledge, self.world_facts = node.apply_effects(
            self.knowledge, self.world_facts
        )

        # Check for death
        if node.is_death():
            self.is_dead = True
            self.death_node = node.id


class SimulationResult(BaseModel):
    """Result of simulating a loop through the graph."""
    model_config = {"arbitrary_types_allowed": True}

    success: bool = True
    final_state: Optional[WorldState] = None
    decision_trace: List[NodeID] = Field(default_factory=list)
    knowledge_gained: Set[str] = Field(default_factory=set)
    outcome_hash: str = ""
    knowledge_id: str = ""
    terminated_early: bool = False
    death_node: Optional[NodeID] = None
    error_message: Optional[str] = None


class DayGraph(BaseModel):
    """
    Container for a complete day graph.

    Holds all nodes and transitions, provides query and traversal methods.
    """
    model_config = {"arbitrary_types_allowed": True}

    name: str = "Unnamed Day"
    description: str = ""
    total_time_slots: int = 12
    version: str = "1.0"

    nodes: Dict[NodeID, EventNode] = Field(default_factory=dict)
    transitions: List[Transition] = Field(default_factory=list)

    # Metadata
    characters: Dict[str, dict] = Field(default_factory=dict)
    locations: List[str] = Field(default_factory=list)
    discoverable_facts: List[str] = Field(default_factory=list)
    world_state_facts: List[str] = Field(default_factory=list)

    # Cached lookups (built on load)
    _edges_from: Dict[NodeID, List[Transition]] = PrivateAttr(default_factory=dict)
    _edges_to: Dict[NodeID, List[Transition]] = PrivateAttr(default_factory=dict)

    def model_post_init(self, __context) -> None:
        """Build edge caches after initialization."""
        self._build_edge_cache()

    def _build_edge_cache(self) -> None:
        """Build lookup tables for edges."""
        self._edges_from = {}
        self._edges_to = {}

        for node_id in self.nodes:
            self._edges_from[node_id] = []
            self._edges_to[node_id] = []

        for trans in self.transitions:
            if trans.from_node in self._edges_from:
                self._edges_from[trans.from_node].append(trans)
            if trans.to_node in self._edges_to:
                self._edges_to[trans.to_node].append(trans)

    # === Node Operations ===

    def add_node(self, node: EventNode) -> None:
        """Add a node to the graph."""
        self.nodes[node.id] = node
        self._edges_from[node.id] = []
        self._edges_to[node.id] = []

    def remove_node(self, node_id: NodeID) -> bool:
        """Remove a node and its edges."""
        if node_id not in self.nodes:
            return False

        del self.nodes[node_id]

        # Remove associated transitions
        self.transitions = [
            t for t in self.transitions
            if t.from_node != node_id and t.to_node != node_id
        ]

        self._build_edge_cache()
        return True

    def get_node(self, node_id: NodeID) -> Optional[EventNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)

    # === Edge Operations ===

    def add_transition(self, transition: Transition) -> bool:
        """Add a transition to the graph."""
        if transition.from_node not in self.nodes:
            return False
        if transition.to_node not in self.nodes:
            return False

        self.transitions.append(transition)
        self._edges_from[transition.from_node].append(transition)
        self._edges_to[transition.to_node].append(transition)
        return True

    def remove_transition(self, from_node: NodeID, to_node: NodeID) -> bool:
        """Remove a transition between two nodes."""
        original_len = len(self.transitions)
        self.transitions = [
            t for t in self.transitions
            if not (t.from_node == from_node and t.to_node == to_node)
        ]

        if len(self.transitions) < original_len:
            self._build_edge_cache()
            return True
        return False

    def get_transitions_from(self, node_id: NodeID) -> List[Transition]:
        """Get all outgoing transitions from a node."""
        return self._edges_from.get(node_id, [])

    def get_transitions_to(self, node_id: NodeID) -> List[Transition]:
        """Get all incoming transitions to a node."""
        return self._edges_to.get(node_id, [])

    # === Query Methods ===

    def get_nodes_by_type(self, node_type: NodeType) -> List[EventNode]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes.values() if n.node_type == node_type]

    def get_nodes_at_time(self, time_slot: TimeSlot) -> List[EventNode]:
        """Get all nodes at a specific time slot."""
        return [n for n in self.nodes.values() if n.time_slot == time_slot]

    def get_critical_nodes(self) -> List[EventNode]:
        """Get all critical nodes."""
        return self.get_nodes_by_type(NodeType.CRITICAL)

    def get_death_nodes(self) -> List[EventNode]:
        """Get all death nodes."""
        return self.get_nodes_by_type(NodeType.DEATH)

    def get_revelation_nodes(self) -> List[EventNode]:
        """Get all revelation nodes."""
        return self.get_nodes_by_type(NodeType.REVELATION)

    def get_start_node(self) -> Optional[EventNode]:
        """Get the starting node (time_slot 0)."""
        nodes_at_zero = self.get_nodes_at_time(0)
        return nodes_at_zero[0] if nodes_at_zero else None

    # === Traversal Methods ===

    def get_valid_choices(
        self,
        current_node: NodeID,
        knowledge: Set[str],
        world_state: Set[str]
    ) -> List[Transition]:
        """Get all valid transitions from current node given state."""
        valid = []
        for trans in self.get_transitions_from(current_node):
            if trans.can_traverse(knowledge, world_state):
                target = self.get_node(trans.to_node)
                if target and target.can_enter(knowledge, world_state):
                    valid.append(trans)
        return valid

    def simulate_loop(
        self,
        decisions: List[NodeID],
        initial_knowledge: Set[str] = None,
        initial_world: Set[str] = None,
        probabilistic: bool = True
    ) -> SimulationResult:
        """
        Simulate a loop through the graph following decisions.

        Args:
            decisions: List of node IDs to visit in order
            initial_knowledge: Starting knowledge set
            initial_world: Starting world state
            probabilistic: Whether to roll for probabilistic transitions

        Returns:
            SimulationResult with final state and outcome
        """
        from src.models import compute_outcome_hash, compute_knowledge_id

        state = WorldState(
            knowledge=initial_knowledge.copy() if initial_knowledge else set(),
            world_facts=initial_world.copy() if initial_world else set()
        )

        result = SimulationResult()

        for i, node_id in enumerate(decisions):
            node = self.get_node(node_id)
            if not node:
                result.success = False
                result.error_message = f"Node not found: {node_id}"
                result.terminated_early = True
                break

            # Check if we can reach this node
            if i > 0:
                prev_node = decisions[i - 1]
                transitions = self.get_transitions_from(prev_node)
                valid_trans = [t for t in transitions if t.to_node == node_id]

                if not valid_trans:
                    result.success = False
                    result.error_message = f"No transition from {prev_node} to {node_id}"
                    result.terminated_early = True
                    break

                trans = valid_trans[0]
                if not trans.can_traverse(state.knowledge, state.world_facts):
                    result.success = False
                    result.error_message = f"Conditions not met for {prev_node} -> {node_id}"
                    result.terminated_early = True
                    break

                if probabilistic and not trans.roll_success():
                    result.success = False
                    result.error_message = f"Probability roll failed for {prev_node} -> {node_id}"
                    result.terminated_early = True
                    break

            # Check preconditions
            if not node.can_enter(state.knowledge, state.world_facts):
                result.success = False
                result.error_message = f"Cannot enter {node_id}: preconditions not met"
                result.terminated_early = True
                break

            # Visit node
            state.visit_node(node)
            result.decision_trace.append(node_id)

            # Check for death
            if state.is_dead:
                result.death_node = node_id
                break

        # Compute final results
        result.final_state = state
        result.knowledge_gained = state.knowledge - (initial_knowledge or set())

        # Compute hashes
        survivors = set()
        deaths = set()

        if "SISTER_ALIVE" in state.world_facts:
            survivors.add("SISTER")
        if "SISTER_DEAD" in state.world_facts:
            deaths.add("SISTER")
        if state.is_dead:
            deaths.add("PROTAGONIST")
        else:
            survivors.add("PROTAGONIST")
        if "VILLAIN_CAUGHT" in state.world_facts:
            deaths.add("VILLAIN")  # or captured
        if "VILLAIN_ESCAPED" in state.world_facts:
            survivors.add("VILLAIN")

        ending = "death" if state.is_dead else "survived"
        if "BOMB_EXPLODED" in state.world_facts:
            ending = "explosion"

        result.outcome_hash = compute_outcome_hash(
            survivors=survivors,
            deaths=deaths,
            state_changes=state.world_facts,
            ending_type=ending
        )

        result.knowledge_id = compute_knowledge_id(
            facts=state.knowledge,
            secrets=set(),
            skills=set()
        )

        return result

    # === Pathfinding ===

    def find_paths(
        self,
        start: NodeID,
        goal: NodeID,
        knowledge: Set[str] = None,
        world_state: Set[str] = None,
        max_paths: int = 10,
        max_depth: int = 20
    ) -> List[List[NodeID]]:
        """
        Find paths from start to goal node.

        Uses BFS to find multiple valid paths.
        """
        if start not in self.nodes or goal not in self.nodes:
            return []

        knowledge = knowledge or set()
        world_state = world_state or set()

        paths = []
        queue = [(start, [start], knowledge.copy(), world_state.copy())]

        while queue and len(paths) < max_paths:
            current, path, curr_knowledge, curr_world = queue.pop(0)

            if len(path) > max_depth:
                continue

            if current == goal:
                paths.append(path)
                continue

            # Apply effects of current node
            node = self.get_node(current)
            if node:
                curr_knowledge, curr_world = node.apply_effects(curr_knowledge, curr_world)

            # Explore neighbors
            for trans in self.get_transitions_from(current):
                if trans.to_node in path:
                    continue  # Avoid cycles

                if not trans.can_traverse(curr_knowledge, curr_world):
                    continue

                target = self.get_node(trans.to_node)
                if target and target.can_enter(curr_knowledge, curr_world):
                    new_path = path + [trans.to_node]
                    queue.append((
                        trans.to_node,
                        new_path,
                        curr_knowledge.copy(),
                        curr_world.copy()
                    ))

        return paths

    def is_reachable(
        self,
        from_node: NodeID,
        to_node: NodeID,
        knowledge: Set[str] = None,
        world_state: Set[str] = None
    ) -> bool:
        """Check if to_node is reachable from from_node."""
        paths = self.find_paths(from_node, to_node, knowledge, world_state, max_paths=1)
        return len(paths) > 0

    # === Analysis ===

    def get_reachability_map(
        self,
        from_node: NodeID,
        knowledge: Set[str] = None,
        world_state: Set[str] = None
    ) -> Set[NodeID]:
        """Get all nodes reachable from a starting node."""
        if from_node not in self.nodes:
            return set()

        knowledge = knowledge or set()
        world_state = world_state or set()

        reachable = set()
        queue = [(from_node, knowledge.copy(), world_state.copy())]
        visited = set()

        while queue:
            current, curr_knowledge, curr_world = queue.pop(0)

            if current in visited:
                continue
            visited.add(current)
            reachable.add(current)

            node = self.get_node(current)
            if node:
                curr_knowledge, curr_world = node.apply_effects(curr_knowledge, curr_world)

            for trans in self.get_transitions_from(current):
                if trans.to_node in visited:
                    continue

                if trans.can_traverse(curr_knowledge, curr_world):
                    target = self.get_node(trans.to_node)
                    if target and target.can_enter(curr_knowledge, curr_world):
                        queue.append((
                            trans.to_node,
                            curr_knowledge.copy(),
                            curr_world.copy()
                        ))

        return reachable

    def find_choke_points(self) -> List[NodeID]:
        """
        Find nodes that are required to reach certain outcomes.

        Choke points are nodes with high "betweenness" - many paths
        must go through them.
        """
        choke_points = []

        for node_id, node in self.nodes.items():
            if node.is_critical():
                # Count how many end nodes are only reachable through this node
                reachable_without = self._reachable_without_node(node_id)
                death_nodes = set(n.id for n in self.get_death_nodes())
                blocked_deaths = death_nodes - reachable_without

                if blocked_deaths:
                    choke_points.append(node_id)

        return choke_points

    def _reachable_without_node(self, excluded: NodeID) -> Set[NodeID]:
        """Get nodes reachable from start without going through excluded."""
        start = self.get_start_node()
        if not start or start.id == excluded:
            return set()

        reachable = set()
        queue = [start.id]

        while queue:
            current = queue.pop(0)
            if current in reachable or current == excluded:
                continue
            reachable.add(current)

            for trans in self.get_transitions_from(current):
                if trans.to_node not in reachable and trans.to_node != excluded:
                    queue.append(trans.to_node)

        return reachable

    # === Validation ===

    def validate(self) -> List[str]:
        """
        Validate graph integrity.

        Returns list of error messages (empty if valid).
        """
        errors = []

        # Check for start node
        if not self.get_start_node():
            errors.append("No start node (time_slot=0)")

        # Check for orphaned nodes
        for node_id in self.nodes:
            if node_id == self.get_start_node().id if self.get_start_node() else False:
                continue
            incoming = self.get_transitions_to(node_id)
            if not incoming:
                errors.append(f"Orphaned node with no incoming edges: {node_id}")

        # Check for time consistency
        for trans in self.transitions:
            from_node = self.get_node(trans.from_node)
            to_node = self.get_node(trans.to_node)

            if from_node and to_node:
                expected_time = from_node.time_slot + trans.time_cost
                if to_node.time_slot < from_node.time_slot:
                    errors.append(
                        f"Time reversal: {trans.from_node}(t={from_node.time_slot}) -> "
                        f"{trans.to_node}(t={to_node.time_slot})"
                    )

        # Check for dead ends (non-death nodes with no outgoing edges)
        for node_id, node in self.nodes.items():
            if not node.is_death():
                outgoing = self.get_transitions_from(node_id)
                if not outgoing and node.time_slot < self.total_time_slots - 1:
                    errors.append(f"Dead end (non-death node with no exits): {node_id}")

        return errors

    # === Serialization ===

    def to_json(self) -> str:
        """Serialize graph to JSON."""
        data = {
            "meta": {
                "name": self.name,
                "description": self.description,
                "total_time_slots": self.total_time_slots,
                "version": self.version
            },
            "characters": self.characters,
            "locations": self.locations,
            "facts": {
                "discoverable": self.discoverable_facts,
                "world_state": self.world_state_facts
            },
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "description": n.description,
                    "time_slot": n.time_slot,
                    "type": n.node_type.value,
                    "location": n.location,
                    "preconditions": n.preconditions,
                    "effects": n.effects
                }
                for n in self.nodes.values()
            ],
            "transitions": [
                {
                    "from": t.from_node,
                    "to": t.to_node,
                    "time_cost": t.time_cost,
                    "conditions": t.conditions,
                    "probability": t.probability
                }
                for t in self.transitions
            ]
        }
        return json.dumps(data, indent=2)

    def save(self, path: str | Path) -> None:
        """Save graph to file."""
        Path(path).write_text(self.to_json())

    @classmethod
    def from_json(cls, json_str: str) -> 'DayGraph':
        """Load graph from JSON string."""
        data = json.loads(json_str)
        return cls._from_dict(data)

    @classmethod
    def load(cls, path: str | Path) -> 'DayGraph':
        """Load graph from file."""
        json_str = Path(path).read_text()
        return cls.from_json(json_str)

    @classmethod
    def _from_dict(cls, data: dict) -> 'DayGraph':
        """Build graph from dictionary."""
        meta = data.get("meta", {})
        facts = data.get("facts", {})

        graph = cls(
            name=meta.get("name", "Unnamed"),
            description=meta.get("description", ""),
            total_time_slots=meta.get("total_time_slots", 12),
            version=meta.get("version", "1.0"),
            characters=data.get("characters", {}),
            locations=data.get("locations", []),
            discoverable_facts=facts.get("discoverable", []),
            world_state_facts=facts.get("world_state", [])
        )

        # Add nodes
        for node_data in data.get("nodes", []):
            node = EventNode(
                id=node_data["id"],
                name=node_data["name"],
                description=node_data.get("description", ""),
                time_slot=node_data["time_slot"],
                node_type=NodeType(node_data.get("type", "soft")),
                location=node_data.get("location", ""),
                preconditions=node_data.get("preconditions", []),
                effects=node_data.get("effects", [])
            )
            graph.add_node(node)

        # Add transitions
        for trans_data in data.get("transitions", []):
            trans = Transition(
                from_node=trans_data["from"],
                to_node=trans_data["to"],
                time_cost=trans_data.get("time_cost", 1),
                conditions=trans_data.get("conditions", []),
                probability=trans_data.get("probability", 1.0)
            )
            graph.add_transition(trans)

        return graph


# === Convenience Functions ===

def load_graph(path: str | Path) -> DayGraph:
    """Load a day graph from a JSON file."""
    return DayGraph.load(path)


def create_empty_graph(name: str = "New Day", time_slots: int = 12) -> DayGraph:
    """Create an empty day graph."""
    return DayGraph(name=name, total_time_slots=time_slots)
