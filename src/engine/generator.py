"""
Loop Generation Pipeline for the Loop Engine.

Ties together policies and operators to generate loops.
Provides batch generation and statistics tracking.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Set, Dict, TYPE_CHECKING

from src.models import (
    Loop,
    LoopID,
    EpochType,
    MoodProfile,
    DayGraph,
    load_graph,
)
from src.engine.operators import (
    Operator,
    OperatorResult,
    CauseOperator,
    AvoidOperator,
    TriggerOperator,
    ReliveOperator,
    SlightlyChangeOperator,
    GreatlyChangeOperator,
    create_operator,
)
from src.engine.policies import (
    Policy,
    PolicyDecision,
    PolicyType,
    create_policy,
    get_policy_for_epoch,
)

if TYPE_CHECKING:
    from src.engine.storage import LoopStorage


@dataclass
class GenerationStats:
    """Statistics for a generation run."""
    total_attempts: int = 0
    successful_loops: int = 0
    failed_attempts: int = 0
    death_loops: int = 0
    unique_outcomes: int = 0
    operator_usage: Dict[str, int] = field(default_factory=dict)
    average_trace_length: float = 0.0

    def record_attempt(self, success: bool, operator: str) -> None:
        """Record an attempt."""
        self.total_attempts += 1
        if success:
            self.successful_loops += 1
        else:
            self.failed_attempts += 1
        self.operator_usage[operator] = self.operator_usage.get(operator, 0) + 1

    def record_loop(self, loop: Loop) -> None:
        """Record a generated loop."""
        if loop.is_death_loop():
            self.death_loops += 1

    def finalize(self, loops: List[Loop]) -> None:
        """Finalize statistics after generation."""
        if loops:
            outcomes = set(loop.outcome_hash for loop in loops)
            self.unique_outcomes = len(outcomes)
            total_length = sum(len(loop.decision_trace) for loop in loops)
            self.average_trace_length = total_length / len(loops)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "total_attempts": self.total_attempts,
            "successful_loops": self.successful_loops,
            "failed_attempts": self.failed_attempts,
            "success_rate": (
                self.successful_loops / self.total_attempts
                if self.total_attempts > 0 else 0
            ),
            "death_loops": self.death_loops,
            "death_rate": (
                self.death_loops / self.successful_loops
                if self.successful_loops > 0 else 0
            ),
            "unique_outcomes": self.unique_outcomes,
            "compression_potential": (
                self.successful_loops / self.unique_outcomes
                if self.unique_outcomes > 0 else 1
            ),
            "operator_usage": dict(self.operator_usage),
            "average_trace_length": round(self.average_trace_length, 2),
        }


class LoopGenerator:
    """
    Main loop generation pipeline.

    Coordinates policies and operators to generate loops.
    """

    def __init__(
        self,
        graph: DayGraph,
        storage: Optional['LoopStorage'] = None
    ):
        """
        Initialize the generator.

        Args:
            graph: The day graph to generate loops from
            storage: Optional storage for persistence
        """
        self.graph = graph
        self.storage = storage
        self._operators: Dict[str, Operator] = {}
        self._init_operators()

    def _init_operators(self) -> None:
        """Initialize all operators."""
        self._operators = {
            'cause': CauseOperator(self.graph, self.storage),
            'avoid': AvoidOperator(self.graph, self.storage),
            'trigger': TriggerOperator(self.graph, self.storage),
            'relive': ReliveOperator(self.graph, self.storage),
            'slightly_change': SlightlyChangeOperator(self.graph, self.storage),
            'greatly_change': GreatlyChangeOperator(self.graph, self.storage),
        }

    @classmethod
    def from_file(
        cls,
        path: str,
        storage: Optional['LoopStorage'] = None
    ) -> 'LoopGenerator':
        """Load graph from file and create generator."""
        graph = load_graph(path)
        return cls(graph, storage)

    def generate_loop(
        self,
        policy: Policy,
        knowledge_state: Optional[Set[str]] = None,
        mood_state: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        parent_id: Optional[LoopID] = None,
        save: bool = True
    ) -> tuple[Optional[Loop], OperatorResult, PolicyDecision]:
        """
        Generate a single loop using a policy.

        Args:
            policy: The policy to use for decision making
            knowledge_state: Current knowledge
            mood_state: Current mood
            epoch: Current epoch
            parent_id: Parent loop ID for lineage
            save: Whether to save to storage

        Returns:
            Tuple of (Loop or None, OperatorResult, PolicyDecision)
        """
        knowledge = knowledge_state.copy() if knowledge_state else set()

        # Get policy decision
        recent_loops = policy.get_recent_loops(5)
        decision = policy.decide(
            current_knowledge=knowledge,
            current_mood=mood_state,
            epoch=epoch,
            recent_loops=recent_loops
        )

        # Get operator
        operator = self._operators.get(decision.operator_name)
        if not operator:
            return None, OperatorResult(
                success=False,
                message=f"Unknown operator: {decision.operator_name}"
            ), decision

        # Execute operator
        result = operator.execute(
            epoch=epoch,
            initial_knowledge=knowledge,
            parent_id=parent_id,
            save=save,
            **decision.parameters
        )

        # Record in policy history
        if result.success and result.loop:
            policy.record_loop(result.loop.id)

        return result.loop, result, decision

    def batch_generate(
        self,
        policy: Policy,
        count: int,
        epoch: EpochType = EpochType.NAIVE,
        initial_knowledge: Optional[Set[str]] = None,
        chain_lineage: bool = True,
        accumulate_knowledge: bool = True,
        save: bool = True
    ) -> tuple[List[Loop], GenerationStats]:
        """
        Generate multiple loops using a policy.

        Args:
            policy: The policy to use
            count: Number of loops to generate
            epoch: Current epoch
            initial_knowledge: Starting knowledge
            chain_lineage: Whether to chain parent_id between loops
            accumulate_knowledge: Whether to accumulate knowledge across loops
            save: Whether to save to storage

        Returns:
            Tuple of (list of loops, statistics)
        """
        loops: List[Loop] = []
        stats = GenerationStats()
        knowledge = initial_knowledge.copy() if initial_knowledge else set()
        parent_id: Optional[LoopID] = None

        for i in range(count):
            loop, result, decision = self.generate_loop(
                policy=policy,
                knowledge_state=knowledge,
                epoch=epoch,
                parent_id=parent_id if chain_lineage else None,
                save=save
            )

            stats.record_attempt(result.success, decision.operator_name)

            if loop:
                loops.append(loop)
                stats.record_loop(loop)

                if chain_lineage:
                    parent_id = loop.id

                if accumulate_knowledge and result.simulation:
                    if result.simulation.final_state:
                        knowledge = result.simulation.final_state.knowledge.copy()

        stats.finalize(loops)
        return loops, stats

    def generate_with_epoch_policy(
        self,
        epoch: EpochType,
        count: int = 10,
        initial_knowledge: Optional[Set[str]] = None,
        save: bool = True
    ) -> tuple[List[Loop], GenerationStats]:
        """
        Generate loops using the recommended policy for an epoch.

        Args:
            epoch: The epoch to generate for
            count: Number of loops to generate
            initial_knowledge: Starting knowledge
            save: Whether to save to storage

        Returns:
            Tuple of (list of loops, statistics)
        """
        policy = get_policy_for_epoch(epoch, self.graph, self.storage)
        return self.batch_generate(
            policy=policy,
            count=count,
            epoch=epoch,
            initial_knowledge=initial_knowledge,
            save=save
        )

    def explore_exhaustively(
        self,
        max_loops: int = 100,
        initial_knowledge: Optional[Set[str]] = None,
        save: bool = True
    ) -> tuple[List[Loop], GenerationStats]:
        """
        Generate loops using different policies to maximize coverage.

        Cycles through policies to explore the graph thoroughly.

        Args:
            max_loops: Maximum number of loops to generate
            initial_knowledge: Starting knowledge
            save: Whether to save to storage

        Returns:
            Tuple of (list of loops, statistics)
        """
        all_loops: List[Loop] = []
        combined_stats = GenerationStats()
        knowledge = initial_knowledge.copy() if initial_knowledge else set()

        policies = [
            create_policy(pt, self.graph, self.storage)
            for pt in PolicyType
        ]

        loops_per_policy = max(1, max_loops // len(policies))
        remaining = max_loops

        for policy in policies:
            if remaining <= 0:
                break

            to_generate = min(loops_per_policy, remaining)
            loops, stats = self.batch_generate(
                policy=policy,
                count=to_generate,
                initial_knowledge=knowledge,
                save=save
            )

            all_loops.extend(loops)
            remaining -= len(loops)

            # Update combined stats
            combined_stats.total_attempts += stats.total_attempts
            combined_stats.successful_loops += stats.successful_loops
            combined_stats.failed_attempts += stats.failed_attempts
            combined_stats.death_loops += stats.death_loops
            for op, count in stats.operator_usage.items():
                combined_stats.operator_usage[op] = (
                    combined_stats.operator_usage.get(op, 0) + count
                )

            # Accumulate knowledge for next policy
            if loops:
                for loop in loops:
                    if self.storage:
                        # Get simulation result if available
                        pass
                # Use last loop's knowledge if we have simulation data
                # Otherwise just continue with accumulated

        combined_stats.finalize(all_loops)
        return all_loops, combined_stats

    def target_specific_outcomes(
        self,
        target_events: List[str],
        max_attempts_per_target: int = 5,
        save: bool = True
    ) -> Dict[str, List[Loop]]:
        """
        Generate loops targeting specific events.

        Args:
            target_events: List of event node IDs to target
            max_attempts_per_target: Max attempts per target
            save: Whether to save to storage

        Returns:
            Dict mapping target to list of loops that reached it
        """
        results: Dict[str, List[Loop]] = {t: [] for t in target_events}
        cause_op = self._operators['cause']

        for target in target_events:
            for _ in range(max_attempts_per_target):
                result = cause_op.execute(
                    target_event=target,
                    save=save
                )

                if result.success and result.loop:
                    results[target].append(result.loop)

        return results


def generate_epoch_story(
    graph: DayGraph,
    storage: Optional['LoopStorage'] = None,
    loops_per_epoch: int = 50,
    save: bool = True
) -> Dict[EpochType, tuple[List[Loop], GenerationStats]]:
    """
    Generate a full story worth of loops across all epochs.

    Args:
        graph: The day graph
        storage: Optional storage
        loops_per_epoch: How many loops per epoch
        save: Whether to save to storage

    Returns:
        Dict mapping epoch to (loops, stats)
    """
    generator = LoopGenerator(graph, storage)
    results = {}
    knowledge: Set[str] = set()

    for epoch in EpochType:
        loops, stats = generator.generate_with_epoch_policy(
            epoch=epoch,
            count=loops_per_epoch,
            initial_knowledge=knowledge,
            save=save
        )
        results[epoch] = (loops, stats)

        # Accumulate knowledge for next epoch
        if loops:
            for loop in loops:
                # Knowledge accumulates across epochs
                # In real use, would track from simulation results
                pass

    return results
