"""
Graph Engine for Loop Engine.

High-level operations for working with day graphs:
- Loop generation from graph traversal
- Integration with storage
- Batch simulation
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Set, TYPE_CHECKING

from src.models import (
    DayGraph,
    Loop,
    EpochType,
    WorldState,
    SimulationResult,
    load_graph,
)

if TYPE_CHECKING:
    from src.engine.storage import LoopStorage


class GraphEngine:
    """
    High-level engine for graph operations.

    Combines DayGraph with storage for loop generation.
    """

    def __init__(
        self,
        graph: DayGraph,
        storage: Optional['LoopStorage'] = None
    ):
        """
        Initialize the graph engine.

        Args:
            graph: The day graph to operate on
            storage: Optional storage for persisting loops
        """
        self.graph = graph
        self.storage = storage

    @classmethod
    def from_file(
        cls,
        path: str | Path,
        storage: Optional['LoopStorage'] = None
    ) -> 'GraphEngine':
        """Load graph from file and create engine."""
        graph = load_graph(path)
        return cls(graph, storage)

    def simulate_and_create_loop(
        self,
        decisions: List[str],
        parent_id: Optional[str] = None,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Set[str] = None,
        tags: List[str] = None,
        save: bool = True
    ) -> tuple[Loop, SimulationResult]:
        """
        Simulate a path through the graph and create a Loop object.

        Args:
            decisions: List of node IDs to visit
            parent_id: ID of parent loop (for lineage)
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            tags: Tags to add to loop
            save: Whether to save to storage

        Returns:
            Tuple of (Loop, SimulationResult)
        """
        from src.models import encode_decisions

        # Run simulation
        result = self.graph.simulate_loop(
            decisions=decisions,
            initial_knowledge=initial_knowledge,
            probabilistic=False  # Deterministic for reproducibility
        )

        # Create loop object
        loop = Loop(
            parent_id=parent_id,
            epoch=epoch,
            outcome_hash=result.outcome_hash,
            knowledge_id=result.knowledge_id,
            decision_trace=result.decision_trace,
            tags=tags or []
        )

        # Add automatic tags
        if result.death_node:
            loop.add_tag("death")
        if result.terminated_early:
            loop.add_tag("terminated_early")
        if len(result.decision_trace) < 4:
            loop.add_tag("short_loop")

        # Encode key decisions
        decision_map = self.graph.characters.get("key_decisions", {})
        if decision_map:
            # Convert node visits to decision flags
            flags = {d: d in decisions for d in decision_map}
            loop.key_choices = encode_decisions(flags, decision_map)

        # Save if requested
        if save and self.storage:
            self.storage.create_loop(loop)
            # Auto-assign to equivalence class
            self.storage.get_or_create_class(loop)

        return loop, result

    def generate_random_loop(
        self,
        parent_id: Optional[str] = None,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Set[str] = None,
        max_steps: int = 20,
        save: bool = True
    ) -> tuple[Loop, SimulationResult]:
        """
        Generate a random loop by making random valid choices.

        Args:
            parent_id: ID of parent loop
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            max_steps: Maximum number of steps
            save: Whether to save to storage

        Returns:
            Tuple of (Loop, SimulationResult)
        """
        import random

        start = self.graph.get_start_node()
        if not start:
            raise ValueError("Graph has no start node")

        decisions = [start.id]
        state = WorldState(
            knowledge=initial_knowledge.copy() if initial_knowledge else set()
        )
        state.visit_node(start)

        for _ in range(max_steps):
            if state.is_dead:
                break

            valid = self.graph.get_valid_choices(
                state.current_node,
                state.knowledge,
                state.world_facts
            )

            if not valid:
                break

            # Random choice
            trans = random.choice(valid)
            next_node = self.graph.get_node(trans.to_node)

            if next_node:
                decisions.append(next_node.id)
                state.visit_node(next_node)

        return self.simulate_and_create_loop(
            decisions=decisions,
            parent_id=parent_id,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            save=save
        )

    def generate_path_to_goal(
        self,
        goal_node: str,
        parent_id: Optional[str] = None,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Set[str] = None,
        save: bool = True
    ) -> Optional[tuple[Loop, SimulationResult]]:
        """
        Generate a loop that reaches a specific goal node.

        Args:
            goal_node: Target node ID to reach
            parent_id: ID of parent loop
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            save: Whether to save to storage

        Returns:
            Tuple of (Loop, SimulationResult) or None if no path exists
        """
        start = self.graph.get_start_node()
        if not start:
            return None

        paths = self.graph.find_paths(
            start=start.id,
            goal=goal_node,
            knowledge=initial_knowledge,
            max_paths=1
        )

        if not paths:
            return None

        return self.simulate_and_create_loop(
            decisions=paths[0],
            parent_id=parent_id,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            save=save
        )

    def batch_random_loops(
        self,
        count: int,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Set[str] = None,
        save: bool = True
    ) -> List[tuple[Loop, SimulationResult]]:
        """
        Generate multiple random loops.

        Args:
            count: Number of loops to generate
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            save: Whether to save to storage

        Returns:
            List of (Loop, SimulationResult) tuples
        """
        results = []
        parent_id = None

        for i in range(count):
            loop, sim = self.generate_random_loop(
                parent_id=parent_id,
                epoch=epoch,
                initial_knowledge=initial_knowledge,
                save=save
            )
            results.append((loop, sim))

            # Chain loops for lineage
            parent_id = loop.id

            # Accumulate knowledge across loops
            if sim.final_state:
                initial_knowledge = sim.final_state.knowledge.copy()

        return results

    def get_statistics(self) -> dict:
        """Get statistics about the graph."""
        return {
            "total_nodes": len(self.graph.nodes),
            "total_transitions": len(self.graph.transitions),
            "critical_nodes": len(self.graph.get_critical_nodes()),
            "death_nodes": len(self.graph.get_death_nodes()),
            "revelation_nodes": len(self.graph.get_revelation_nodes()),
            "time_slots": self.graph.total_time_slots,
            "choke_points": len(self.graph.find_choke_points()),
            "validation_errors": len(self.graph.validate()),
        }

    def analyze_reachability(
        self,
        initial_knowledge: Set[str] = None
    ) -> dict:
        """
        Analyze what's reachable from the start.

        Returns dict with reachability statistics.
        """
        start = self.graph.get_start_node()
        if not start:
            return {"error": "No start node"}

        reachable = self.graph.get_reachability_map(
            start.id,
            knowledge=initial_knowledge
        )

        all_nodes = set(self.graph.nodes.keys())
        unreachable = all_nodes - reachable

        death_nodes = set(n.id for n in self.graph.get_death_nodes())
        reachable_deaths = death_nodes & reachable

        revelation_nodes = set(n.id for n in self.graph.get_revelation_nodes())
        reachable_revelations = revelation_nodes & reachable

        return {
            "total_nodes": len(all_nodes),
            "reachable_nodes": len(reachable),
            "unreachable_nodes": len(unreachable),
            "unreachable_list": list(unreachable),
            "reachable_deaths": len(reachable_deaths),
            "reachable_revelations": len(reachable_revelations),
            "coverage_percent": len(reachable) / len(all_nodes) * 100 if all_nodes else 0
        }
