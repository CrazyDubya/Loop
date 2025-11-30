"""
Loop Operators for the Loop Engine.

The six core operators that model protagonist behavior across loops.
These transform *intent* into *loop generation*.

Operators:
- cause(X): Make X happen - pathfind to maximize P(X)
- avoid(X): Prevent X - pathfind to minimize P(X)
- trigger(A→B→C): Force sequence - pathfind through checkpoints
- relive(L_ref): Repeat loop - minimize distance to reference
- slightly_change(L_ref): Small tweak - small Hamming distance
- greatly_change(L_ref): Big deviation - large Hamming distance
"""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Set, TYPE_CHECKING

from src.models import (
    Loop,
    LoopID,
    NodeID,
    EpochType,
    WorldState,
    SimulationResult,
    hamming_distance,
    mutate_vector,
)

if TYPE_CHECKING:
    from src.models import DayGraph
    from src.engine.storage import LoopStorage


@dataclass
class OperatorResult:
    """Result of an operator execution."""
    success: bool
    loop: Optional[Loop] = None
    simulation: Optional[SimulationResult] = None
    attempts: int = 1
    partial_success: bool = False
    message: str = ""
    decisions: List[NodeID] = field(default_factory=list)


class Operator(ABC):
    """Base class for loop operators."""

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        self.graph = graph
        self.storage = storage

    @abstractmethod
    def execute(
        self,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        **kwargs
    ) -> OperatorResult:
        """Execute the operator and return result."""
        pass

    def _simulate_and_create_loop(
        self,
        decisions: List[NodeID],
        epoch: EpochType,
        initial_knowledge: Optional[Set[str]],
        parent_id: Optional[LoopID],
        save: bool = True
    ) -> tuple[Optional[Loop], SimulationResult]:
        """Simulate a path and create a Loop object."""
        result = self.graph.simulate_loop(
            decisions=decisions,
            initial_knowledge=initial_knowledge,
            probabilistic=False
        )

        if not result.success:
            return None, result

        loop = Loop(
            parent_id=parent_id,
            epoch=epoch,
            outcome_hash=result.outcome_hash,
            knowledge_id=result.knowledge_id,
            decision_trace=result.decision_trace,
        )

        # Add automatic tags
        if result.death_node:
            loop.add_tag("death")
        if result.terminated_early:
            loop.add_tag("terminated_early")
        if len(result.decision_trace) < 4:
            loop.add_tag("short_loop")

        if save and self.storage:
            self.storage.create_loop(loop)

        return loop, result


class CauseOperator(Operator):
    """
    cause(X): Make event X happen.

    Pathfinds to maximize the probability of reaching target event.
    """

    def execute(
        self,
        target_event: NodeID,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        max_attempts: int = 10,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Try to cause the target event to happen.

        Args:
            target_event: Node ID of the event to cause
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            max_attempts: Maximum pathfinding attempts
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        start = self.graph.get_start_node()
        if not start:
            return OperatorResult(
                success=False,
                message="Graph has no start node"
            )

        # Check if target exists
        if target_event not in self.graph.nodes:
            return OperatorResult(
                success=False,
                message=f"Target event '{target_event}' not found in graph"
            )

        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        # Try to find paths to the target
        paths = self.graph.find_paths(
            start=start.id,
            goal=target_event,
            knowledge=knowledge,
            max_paths=max_attempts
        )

        if not paths:
            # Try with knowledge accumulation - explore revelations first
            revelations = self.graph.get_revelation_nodes()
            for rev in revelations:
                test_paths = self.graph.find_paths(
                    start=start.id,
                    goal=rev.id,
                    knowledge=knowledge,
                    max_paths=1
                )
                if test_paths:
                    # Simulate to get knowledge
                    sim = self.graph.simulate_loop(
                        test_paths[0],
                        initial_knowledge=knowledge,
                        probabilistic=False
                    )
                    if sim.success:
                        knowledge = sim.final_state.knowledge.copy()
                        # Now try again with new knowledge
                        paths = self.graph.find_paths(
                            start=start.id,
                            goal=target_event,
                            knowledge=knowledge,
                            max_paths=1
                        )
                        if paths:
                            break

        if not paths:
            return OperatorResult(
                success=False,
                partial_success=False,
                message=f"No path found to '{target_event}'"
            )

        # Use shortest path
        best_path = min(paths, key=len)
        loop, sim = self._simulate_and_create_loop(
            decisions=best_path,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            parent_id=parent_id,
            save=save
        )

        return OperatorResult(
            success=loop is not None and target_event in best_path,
            loop=loop,
            simulation=sim,
            attempts=1,
            decisions=best_path,
            message="Target event reached" if loop else "Simulation failed"
        )


class AvoidOperator(Operator):
    """
    avoid(X): Prevent event X from happening.

    Pathfinds to minimize the probability of reaching target event.
    """

    def execute(
        self,
        target_event: NodeID,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        max_attempts: int = 10,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Try to avoid the target event.

        Args:
            target_event: Node ID of the event to avoid
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            max_attempts: Maximum attempts
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        start = self.graph.get_start_node()
        if not start:
            return OperatorResult(
                success=False,
                message="Graph has no start node"
            )

        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        # Find all terminal nodes (death nodes or nodes with no outgoing edges)
        terminal_nodes = set()
        for node_id, node in self.graph.nodes.items():
            if node.is_death():
                terminal_nodes.add(node_id)
            elif not self.graph.get_transitions_from(node_id):
                terminal_nodes.add(node_id)

        # Find paths to terminals that avoid the target
        safe_paths = []
        for terminal in terminal_nodes:
            if terminal == target_event:
                continue

            paths = self.graph.find_paths(
                start=start.id,
                goal=terminal,
                knowledge=knowledge,
                max_paths=max_attempts // 2 or 1
            )

            for path in paths:
                if target_event not in path:
                    safe_paths.append(path)

        if not safe_paths:
            # Try random exploration avoiding target
            for _ in range(max_attempts):
                decisions, avoided = self._random_walk_avoiding(
                    start.id,
                    target_event,
                    knowledge
                )
                if avoided:
                    safe_paths.append(decisions)

        if not safe_paths:
            return OperatorResult(
                success=False,
                message=f"Cannot avoid '{target_event}' - it may be unavoidable"
            )

        # Pick longest safe path (more exploration)
        best_path = max(safe_paths, key=len)
        loop, sim = self._simulate_and_create_loop(
            decisions=best_path,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            parent_id=parent_id,
            save=save
        )

        avoided = target_event not in best_path
        return OperatorResult(
            success=loop is not None and avoided,
            loop=loop,
            simulation=sim,
            attempts=len(safe_paths),
            decisions=best_path,
            message="Target avoided" if avoided else "Could not avoid target"
        )

    def _random_walk_avoiding(
        self,
        start: NodeID,
        avoid: NodeID,
        knowledge: Set[str],
        max_steps: int = 20
    ) -> tuple[List[NodeID], bool]:
        """Random walk that tries to avoid a specific node."""
        decisions = [start]
        state = WorldState(knowledge=knowledge.copy())
        start_node = self.graph.get_node(start)
        if start_node:
            state.visit_node(start_node)

        for _ in range(max_steps):
            if state.is_dead:
                break

            valid = self.graph.get_valid_choices(
                state.current_node,
                state.knowledge,
                state.world_facts
            )

            # Filter out transitions to avoided node
            safe = [t for t in valid if t.to_node != avoid]
            if not safe:
                # No safe choices, use any
                safe = valid

            if not safe:
                break

            trans = random.choice(safe)
            next_node = self.graph.get_node(trans.to_node)
            if next_node:
                decisions.append(next_node.id)
                state.visit_node(next_node)

        avoided = avoid not in decisions
        return decisions, avoided


class TriggerOperator(Operator):
    """
    trigger(A→B→C): Force a sequence of events.

    Pathfinds through checkpoints in order.
    """

    def execute(
        self,
        sequence: List[NodeID],
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Try to trigger a sequence of events.

        Args:
            sequence: List of node IDs to visit in order
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        if not sequence:
            return OperatorResult(
                success=False,
                message="Empty sequence provided"
            )

        start = self.graph.get_start_node()
        if not start:
            return OperatorResult(
                success=False,
                message="Graph has no start node"
            )

        # Validate sequence nodes exist
        for node_id in sequence:
            if node_id not in self.graph.nodes:
                return OperatorResult(
                    success=False,
                    message=f"Sequence node '{node_id}' not found"
                )

        knowledge = initial_knowledge.copy() if initial_knowledge else set()
        full_path = [start.id] if sequence[0] != start.id else []
        current = start.id

        # Build path through checkpoints
        for checkpoint in sequence:
            if current == checkpoint:
                if checkpoint not in full_path:
                    full_path.append(checkpoint)
                continue

            paths = self.graph.find_paths(
                start=current,
                goal=checkpoint,
                knowledge=knowledge,
                max_paths=1
            )

            if not paths:
                return OperatorResult(
                    success=False,
                    partial_success=len(full_path) > 1,
                    message=f"Cannot reach '{checkpoint}' from '{current}'",
                    decisions=full_path
                )

            # Add path (excluding current node which is already in full_path)
            for node_id in paths[0][1:]:
                full_path.append(node_id)
                # Simulate to update knowledge
                node = self.graph.get_node(node_id)
                if node:
                    k, w = node.apply_effects(knowledge, set())
                    knowledge.update(k)

            current = checkpoint

        loop, sim = self._simulate_and_create_loop(
            decisions=full_path,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            parent_id=parent_id,
            save=save
        )

        # Check all checkpoints were hit
        all_hit = all(cp in full_path for cp in sequence)
        return OperatorResult(
            success=loop is not None and all_hit,
            loop=loop,
            simulation=sim,
            attempts=1,
            decisions=full_path,
            message="Sequence triggered" if all_hit else "Partial sequence"
        )


class ReliveOperator(Operator):
    """
    relive(L_ref): Repeat a reference loop.

    Minimizes distance to the reference loop's decision trace.
    """

    def execute(
        self,
        reference_id: LoopID,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Try to relive a reference loop.

        Args:
            reference_id: ID of the loop to relive
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        if not self.storage:
            return OperatorResult(
                success=False,
                message="No storage available to retrieve reference loop"
            )

        reference = self.storage.get_loop(reference_id)
        if not reference:
            return OperatorResult(
                success=False,
                message=f"Reference loop '{reference_id}' not found"
            )

        if not reference.decision_trace:
            return OperatorResult(
                success=False,
                message="Reference loop has no decision trace"
            )

        # Try to follow the exact same path
        decisions = list(reference.decision_trace)
        loop, sim = self._simulate_and_create_loop(
            decisions=decisions,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            parent_id=parent_id,
            save=save
        )

        if loop:
            loop.add_tag("relive")
            divergence = 0
            if sim and sim.decision_trace:
                # Calculate how much we diverged
                for i, (orig, new) in enumerate(zip(
                    reference.decision_trace,
                    sim.decision_trace
                )):
                    if orig != new:
                        divergence += 1

            return OperatorResult(
                success=True,
                loop=loop,
                simulation=sim,
                decisions=decisions,
                message=f"Relived loop (divergence: {divergence})"
            )

        # If exact path failed, try to get as close as possible
        partial_decisions = self._follow_as_much_as_possible(
            reference.decision_trace,
            initial_knowledge
        )

        loop, sim = self._simulate_and_create_loop(
            decisions=partial_decisions,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            parent_id=parent_id,
            save=save
        )

        if loop:
            loop.add_tag("relive_partial")

        return OperatorResult(
            success=loop is not None,
            loop=loop,
            simulation=sim,
            partial_success=len(partial_decisions) < len(reference.decision_trace),
            decisions=partial_decisions,
            message="Partial relive - original path no longer valid"
        )

    def _follow_as_much_as_possible(
        self,
        original_trace: List[NodeID],
        initial_knowledge: Optional[Set[str]]
    ) -> List[NodeID]:
        """Follow the original trace as much as possible."""
        if not original_trace:
            return []

        decisions = [original_trace[0]]
        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        start_node = self.graph.get_node(original_trace[0])
        if start_node:
            k, _ = start_node.apply_effects(knowledge, set())
            knowledge.update(k)

        for i, next_id in enumerate(original_trace[1:], 1):
            current = decisions[-1]
            valid = self.graph.get_valid_choices(
                current, knowledge, set()
            )

            # Check if original choice is valid
            valid_targets = {t.to_node for t in valid}
            if next_id in valid_targets:
                decisions.append(next_id)
                node = self.graph.get_node(next_id)
                if node:
                    k, _ = node.apply_effects(knowledge, set())
                    knowledge.update(k)
            else:
                # Can't follow, stop here
                break

        return decisions


class SlightlyChangeOperator(Operator):
    """
    slightly_change(L_ref): Make a small tweak to a reference loop.

    Produces loops with small Hamming distance from reference.
    """

    def execute(
        self,
        reference_id: LoopID,
        changes: int = 1,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        max_attempts: int = 10,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Make small changes to a reference loop.

        Args:
            reference_id: ID of the loop to modify
            changes: Number of decisions to change (1-2 recommended)
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            max_attempts: Maximum attempts to find valid variation
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        if not self.storage:
            return OperatorResult(
                success=False,
                message="No storage available to retrieve reference loop"
            )

        reference = self.storage.get_loop(reference_id)
        if not reference:
            return OperatorResult(
                success=False,
                message=f"Reference loop '{reference_id}' not found"
            )

        trace = reference.decision_trace
        if len(trace) < 2:
            return OperatorResult(
                success=False,
                message="Reference loop too short to modify"
            )

        changes = min(changes, len(trace) - 1)  # Can't change all decisions
        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        for attempt in range(max_attempts):
            # Pick random positions to change (excluding start)
            change_positions = random.sample(
                range(1, len(trace)),
                min(changes, len(trace) - 1)
            )

            new_trace = list(trace)

            for pos in sorted(change_positions):
                # Get alternative choices at this position
                current = new_trace[pos - 1]
                state = self._simulate_to_position(
                    new_trace[:pos],
                    knowledge
                )
                if not state:
                    continue

                valid = self.graph.get_valid_choices(
                    current,
                    state.knowledge,
                    state.world_facts
                )

                alternatives = [
                    t.to_node for t in valid
                    if t.to_node != trace[pos]
                ]

                if alternatives:
                    new_trace[pos] = random.choice(alternatives)
                    # Complete the rest of the path
                    completed = self._complete_path(
                        new_trace[:pos + 1],
                        state
                    )
                    if completed:
                        new_trace = completed
                        break

            if new_trace != trace:
                loop, sim = self._simulate_and_create_loop(
                    decisions=new_trace,
                    epoch=epoch,
                    initial_knowledge=initial_knowledge,
                    parent_id=parent_id,
                    save=save
                )

                if loop:
                    loop.add_tag("slightly_changed")
                    distance = hamming_distance(
                        reference.key_choices,
                        loop.key_choices
                    )
                    return OperatorResult(
                        success=True,
                        loop=loop,
                        simulation=sim,
                        attempts=attempt + 1,
                        decisions=new_trace,
                        message=f"Changed {changes} decision(s), Hamming distance: {distance}"
                    )

        return OperatorResult(
            success=False,
            attempts=max_attempts,
            message="Could not find valid variation"
        )

    def _simulate_to_position(
        self,
        trace: List[NodeID],
        initial_knowledge: Set[str]
    ) -> Optional[WorldState]:
        """Simulate up to a position and return state."""
        if not trace:
            return None

        state = WorldState(knowledge=initial_knowledge.copy())
        for node_id in trace:
            node = self.graph.get_node(node_id)
            if node:
                state.visit_node(node)

        return state

    def _complete_path(
        self,
        partial: List[NodeID],
        state: WorldState,
        max_steps: int = 15
    ) -> Optional[List[NodeID]]:
        """Complete a partial path with random valid choices."""
        result = list(partial)

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

            trans = random.choice(valid)
            next_node = self.graph.get_node(trans.to_node)
            if next_node:
                result.append(next_node.id)
                state.visit_node(next_node)

        return result if len(result) > len(partial) else None


class GreatlyChangeOperator(Operator):
    """
    greatly_change(L_ref): Make major changes to a reference loop.

    Produces loops with large Hamming distance from reference.
    """

    def execute(
        self,
        reference_id: LoopID,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        parent_id: Optional[LoopID] = None,
        min_distance: int = 3,
        max_attempts: int = 20,
        save: bool = True,
        **kwargs
    ) -> OperatorResult:
        """
        Make major changes to a reference loop.

        Args:
            reference_id: ID of the loop to modify
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            parent_id: Parent loop ID
            min_distance: Minimum Hamming distance target
            max_attempts: Maximum attempts
            save: Whether to save to storage

        Returns:
            OperatorResult with success status and loop
        """
        if not self.storage:
            return OperatorResult(
                success=False,
                message="No storage available to retrieve reference loop"
            )

        reference = self.storage.get_loop(reference_id)
        if not reference:
            return OperatorResult(
                success=False,
                message=f"Reference loop '{reference_id}' not found"
            )

        trace = reference.decision_trace
        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        best_loop = None
        best_sim = None
        best_distance = 0
        best_decisions = []

        for attempt in range(max_attempts):
            # Generate a completely random loop
            decisions = self._random_exploration(knowledge)

            if not decisions:
                continue

            loop, sim = self._simulate_and_create_loop(
                decisions=decisions,
                epoch=epoch,
                initial_knowledge=initial_knowledge,
                parent_id=parent_id,
                save=False  # Don't save yet
            )

            if loop:
                distance = self._compute_trace_distance(trace, decisions)

                if distance > best_distance:
                    best_distance = distance
                    best_loop = loop
                    best_sim = sim
                    best_decisions = decisions

                if distance >= min_distance:
                    break

        if best_loop:
            best_loop.add_tag("greatly_changed")
            if save and self.storage:
                self.storage.create_loop(best_loop)

            return OperatorResult(
                success=best_distance >= min_distance,
                loop=best_loop,
                simulation=best_sim,
                attempts=min(attempt + 1, max_attempts),
                decisions=best_decisions,
                message=f"Distance from reference: {best_distance}"
            )

        return OperatorResult(
            success=False,
            attempts=max_attempts,
            message="Could not generate valid divergent loop"
        )

    def _random_exploration(
        self,
        initial_knowledge: Set[str],
        max_steps: int = 20
    ) -> List[NodeID]:
        """Generate a random path through the graph."""
        start = self.graph.get_start_node()
        if not start:
            return []

        decisions = [start.id]
        state = WorldState(knowledge=initial_knowledge.copy())
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

            trans = random.choice(valid)
            next_node = self.graph.get_node(trans.to_node)
            if next_node:
                decisions.append(next_node.id)
                state.visit_node(next_node)

        return decisions

    def _compute_trace_distance(
        self,
        trace1: List[NodeID],
        trace2: List[NodeID]
    ) -> int:
        """Compute distance between two decision traces."""
        # Count nodes that appear in one but not the other
        set1 = set(trace1)
        set2 = set(trace2)
        return len(set1.symmetric_difference(set2))


# === Operator Factory ===

def create_operator(
    operator_type: str,
    graph: 'DayGraph',
    storage: Optional['LoopStorage'] = None
) -> Operator:
    """
    Create an operator by name.

    Args:
        operator_type: One of 'cause', 'avoid', 'trigger', 'relive',
                      'slightly_change', 'greatly_change'
        graph: The day graph to operate on
        storage: Optional storage for loop persistence

    Returns:
        The requested operator instance
    """
    operators = {
        'cause': CauseOperator,
        'avoid': AvoidOperator,
        'trigger': TriggerOperator,
        'relive': ReliveOperator,
        'slightly_change': SlightlyChangeOperator,
        'greatly_change': GreatlyChangeOperator,
    }

    if operator_type not in operators:
        raise ValueError(
            f"Unknown operator: {operator_type}. "
            f"Valid operators: {list(operators.keys())}"
        )

    return operators[operator_type](graph, storage)
