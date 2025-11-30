"""
Policy System for the Loop Engine.

Policies determine protagonist behavior by selecting which operator
to use based on current state. Each policy produces characteristic
loop distributions that drive the "feel" of different epochs.

Policies:
- Naive: Random exploration
- Scientist: Systematic cause/avoid testing
- Desperate: Greatly_change spam (chaos)
- Perfectionist: Relive + slightly_change iteration
- Obsessive: Trigger same sequence repeatedly
"""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set, Any, TYPE_CHECKING

from src.models import (
    Loop,
    LoopID,
    NodeID,
    EpochType,
    KnowledgeProfile,
    MoodProfile,
)

if TYPE_CHECKING:
    from src.models import DayGraph
    from src.engine.storage import LoopStorage
    from src.engine.operators import Operator


class PolicyType(str, Enum):
    """Available policy types."""
    NAIVE = "naive"
    SCIENTIST = "scientist"
    DESPERATE = "desperate"
    PERFECTIONIST = "perfectionist"
    OBSESSIVE = "obsessive"


@dataclass
class PolicyDecision:
    """
    A decision made by a policy about what to do next.

    Contains the operator to use and its parameters.
    """
    operator_name: str
    parameters: dict = field(default_factory=dict)
    reasoning: str = ""


class Policy(ABC):
    """
    Base class for loop generation policies.

    A policy takes the current state and decides which operator
    to use next, modeling protagonist psychology.
    """

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        self.graph = graph
        self.storage = storage
        self.loop_history: List[LoopID] = []

    @property
    @abstractmethod
    def policy_type(self) -> PolicyType:
        """Return the type of this policy."""
        pass

    @abstractmethod
    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        """
        Decide which operator to use next.

        Args:
            current_knowledge: Facts/secrets currently known
            current_mood: Current emotional state
            epoch: Current epoch
            recent_loops: Recently generated loops for context

        Returns:
            PolicyDecision with operator and parameters
        """
        pass

    def record_loop(self, loop_id: LoopID) -> None:
        """Record a generated loop for history tracking."""
        self.loop_history.append(loop_id)

    def get_recent_loops(self, n: int = 5) -> List[Loop]:
        """Get the n most recent loops."""
        if not self.storage:
            return []

        recent = []
        for loop_id in reversed(self.loop_history[-n:]):
            loop = self.storage.get_loop(loop_id)
            if loop:
                recent.append(loop)
        return recent


class NaivePolicy(Policy):
    """
    Random exploration policy.

    Early-epoch behavior: try random things, no strategy.
    Occasionally cause or avoid based on whim.
    """

    @property
    def policy_type(self) -> PolicyType:
        return PolicyType.NAIVE

    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        # Pick an approach randomly
        approach = random.random()

        if approach < 0.6:
            # Just explore randomly - use cause with random target
            nodes = list(self.graph.nodes.keys())
            if nodes:
                target = random.choice(nodes)
                return PolicyDecision(
                    operator_name="cause",
                    parameters={"target_event": target},
                    reasoning="Random exploration"
                )

        elif approach < 0.8:
            # Avoid death nodes
            death_nodes = self.graph.get_death_nodes()
            if death_nodes:
                target = random.choice(death_nodes).id
                return PolicyDecision(
                    operator_name="avoid",
                    parameters={"target_event": target},
                    reasoning="Avoiding random death"
                )

        else:
            # Try to reach a revelation
            revelations = self.graph.get_revelation_nodes()
            if revelations:
                target = random.choice(revelations).id
                return PolicyDecision(
                    operator_name="cause",
                    parameters={"target_event": target},
                    reasoning="Seeking knowledge"
                )

        # Fallback: just cause something
        return PolicyDecision(
            operator_name="cause",
            parameters={"target_event": self.graph.get_start_node().id},
            reasoning="Fallback exploration"
        )


class ScientistPolicy(Policy):
    """
    Systematic hypothesis testing policy.

    Mid-epoch behavior: test theories by causing/avoiding specific events.
    Track what's been tested, systematically explore unknowns.
    """

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        super().__init__(graph, storage)
        self.tested_events: Set[NodeID] = set()
        self.hypothesis_queue: List[NodeID] = []

    @property
    def policy_type(self) -> PolicyType:
        return PolicyType.SCIENTIST

    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        # Build hypothesis queue if empty
        if not self.hypothesis_queue:
            self._build_hypothesis_queue(current_knowledge)

        # Get next untested event
        while self.hypothesis_queue:
            target = self.hypothesis_queue.pop(0)
            if target not in self.tested_events:
                self.tested_events.add(target)

                # Alternate between cause and avoid
                if len(self.tested_events) % 2 == 0:
                    return PolicyDecision(
                        operator_name="cause",
                        parameters={"target_event": target},
                        reasoning=f"Testing hypothesis: can we reach {target}?"
                    )
                else:
                    return PolicyDecision(
                        operator_name="avoid",
                        parameters={"target_event": target},
                        reasoning=f"Testing hypothesis: can we avoid {target}?"
                    )

        # All tested, try to find new knowledge
        revelations = self.graph.get_revelation_nodes()
        untested_rev = [
            r for r in revelations
            if r.id not in self.tested_events
        ]
        if untested_rev:
            target = untested_rev[0].id
            self.tested_events.add(target)
            return PolicyDecision(
                operator_name="cause",
                parameters={"target_event": target},
                reasoning="Seeking new revelation for more hypotheses"
            )

        # Fallback: random exploration
        return PolicyDecision(
            operator_name="cause",
            parameters={
                "target_event": random.choice(list(self.graph.nodes.keys()))
            },
            reasoning="Exhausted hypotheses, exploring randomly"
        )

    def _build_hypothesis_queue(self, knowledge: Set[str]) -> None:
        """Build a queue of events to test."""
        # Prioritize: revelations, critical nodes, then others
        revelations = [n.id for n in self.graph.get_revelation_nodes()]
        critical = [n.id for n in self.graph.get_critical_nodes()]
        deaths = [n.id for n in self.graph.get_death_nodes()]

        # Interleave for variety
        all_nodes = set(revelations + critical + deaths)
        others = [n for n in self.graph.nodes.keys() if n not in all_nodes]

        self.hypothesis_queue = revelations + critical + deaths + others
        random.shuffle(self.hypothesis_queue)


class DesperatePolicy(Policy):
    """
    Chaos/desperation policy.

    Late-epoch behavior when stuck: try wildly different things.
    Spam greatly_change to escape local optima.
    """

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        super().__init__(graph, storage)
        self.desperation_level: int = 0

    @property
    def policy_type(self) -> PolicyType:
        return PolicyType.DESPERATE

    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        recent = recent_loops or self.get_recent_loops(5)

        # Check if we're stuck (same outcomes repeatedly)
        if recent and len(recent) >= 3:
            outcomes = [loop.outcome_hash for loop in recent]
            if len(set(outcomes)) == 1:
                self.desperation_level += 1

        if not recent:
            # No history, just explore randomly
            return PolicyDecision(
                operator_name="cause",
                parameters={
                    "target_event": random.choice(list(self.graph.nodes.keys()))
                },
                reasoning="Desperate exploration - no history"
            )

        # Pick most recent loop to deviate from
        reference = recent[0]

        # Increase min_distance based on desperation
        min_distance = 3 + self.desperation_level

        return PolicyDecision(
            operator_name="greatly_change",
            parameters={
                "reference_id": reference.id,
                "min_distance": min_distance
            },
            reasoning=f"Desperate escape (level {self.desperation_level})"
        )


class PerfectionistPolicy(Policy):
    """
    Iterative refinement policy.

    Behavior: find a good loop, then perfect it through small changes.
    Relive successful loops, slightly_change to optimize.
    """

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        super().__init__(graph, storage)
        self.best_loop_id: Optional[LoopID] = None
        self.refinement_count: int = 0
        self.max_refinements: int = 10

    @property
    def policy_type(self) -> PolicyType:
        return PolicyType.PERFECTIONIST

    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        recent = recent_loops or self.get_recent_loops(5)

        # Find best loop (non-death, longest trace)
        if not self.best_loop_id and recent:
            non_death = [l for l in recent if not l.is_death_loop()]
            if non_death:
                self.best_loop_id = max(
                    non_death,
                    key=lambda l: len(l.decision_trace)
                ).id

        if not self.best_loop_id:
            # Need to find a good loop first
            revelations = self.graph.get_revelation_nodes()
            if revelations:
                return PolicyDecision(
                    operator_name="cause",
                    parameters={"target_event": revelations[0].id},
                    reasoning="Seeking a base loop to perfect"
                )
            return PolicyDecision(
                operator_name="cause",
                parameters={
                    "target_event": random.choice(list(self.graph.nodes.keys()))
                },
                reasoning="Exploring to find perfectible loop"
            )

        # Alternate between relive and slightly_change
        if self.refinement_count % 3 == 0:
            self.refinement_count += 1
            return PolicyDecision(
                operator_name="relive",
                parameters={"reference_id": self.best_loop_id},
                reasoning="Reliving best loop"
            )
        else:
            self.refinement_count += 1
            changes = 1 if self.refinement_count < 5 else 2
            return PolicyDecision(
                operator_name="slightly_change",
                parameters={
                    "reference_id": self.best_loop_id,
                    "changes": changes
                },
                reasoning=f"Refining best loop (iteration {self.refinement_count})"
            )

    def update_best(self, loop: Loop) -> None:
        """Update best loop if this one is better."""
        if self.best_loop_id and self.storage:
            current_best = self.storage.get_loop(self.best_loop_id)
            if current_best:
                # Prefer non-death, longer traces
                if (loop.is_death_loop() and not current_best.is_death_loop()):
                    return
                if (not loop.is_death_loop() and
                    len(loop.decision_trace) > len(current_best.decision_trace)):
                    self.best_loop_id = loop.id
                    self.refinement_count = 0


class ObsessivePolicy(Policy):
    """
    Repetitive sequence policy.

    Behavior: find a sequence and repeat it obsessively.
    Trigger same pattern over and over, with slight variations.
    """

    def __init__(
        self,
        graph: 'DayGraph',
        storage: Optional['LoopStorage'] = None
    ):
        super().__init__(graph, storage)
        self.target_sequence: List[NodeID] = []
        self.repetition_count: int = 0

    @property
    def policy_type(self) -> PolicyType:
        return PolicyType.OBSESSIVE

    def decide(
        self,
        current_knowledge: Set[str],
        current_mood: Optional[MoodProfile] = None,
        epoch: EpochType = EpochType.NAIVE,
        recent_loops: Optional[List[Loop]] = None
    ) -> PolicyDecision:
        # Define a target sequence if we don't have one
        if not self.target_sequence:
            recent = recent_loops or self.get_recent_loops(1)
            if recent and recent[0].decision_trace:
                # Use a recent loop's trace as the target
                trace = recent[0].decision_trace
                # Pick key points from the trace
                if len(trace) >= 3:
                    self.target_sequence = [
                        trace[0],
                        trace[len(trace) // 2],
                        trace[-1]
                    ]
                else:
                    self.target_sequence = list(trace)
            else:
                # Create a sequence from graph structure
                start = self.graph.get_start_node()
                revelations = self.graph.get_revelation_nodes()
                if start and revelations:
                    self.target_sequence = [start.id, revelations[0].id]
                elif start:
                    self.target_sequence = [start.id]

        if not self.target_sequence:
            return PolicyDecision(
                operator_name="cause",
                parameters={
                    "target_event": random.choice(list(self.graph.nodes.keys()))
                },
                reasoning="Building obsession target"
            )

        self.repetition_count += 1

        # Trigger the sequence
        return PolicyDecision(
            operator_name="trigger",
            parameters={"sequence": list(self.target_sequence)},
            reasoning=f"Obsessive repetition #{self.repetition_count}"
        )

    def set_obsession(self, sequence: List[NodeID]) -> None:
        """Set the sequence to obsess over."""
        self.target_sequence = list(sequence)
        self.repetition_count = 0


# === Policy Factory ===

def create_policy(
    policy_type: PolicyType | str,
    graph: 'DayGraph',
    storage: Optional['LoopStorage'] = None
) -> Policy:
    """
    Create a policy by type.

    Args:
        policy_type: One of PolicyType enum values or string name
        graph: The day graph to operate on
        storage: Optional storage for loop persistence

    Returns:
        The requested policy instance
    """
    if isinstance(policy_type, str):
        policy_type = PolicyType(policy_type.lower())

    policies = {
        PolicyType.NAIVE: NaivePolicy,
        PolicyType.SCIENTIST: ScientistPolicy,
        PolicyType.DESPERATE: DesperatePolicy,
        PolicyType.PERFECTIONIST: PerfectionistPolicy,
        PolicyType.OBSESSIVE: ObsessivePolicy,
    }

    if policy_type not in policies:
        raise ValueError(f"Unknown policy: {policy_type}")

    return policies[policy_type](graph, storage)


def get_policy_for_epoch(
    epoch: EpochType,
    graph: 'DayGraph',
    storage: Optional['LoopStorage'] = None
) -> Policy:
    """
    Get the recommended policy for an epoch.

    Args:
        epoch: The current epoch
        graph: Day graph
        storage: Optional storage

    Returns:
        Policy appropriate for the epoch
    """
    epoch_policies = {
        EpochType.NAIVE: PolicyType.NAIVE,
        EpochType.MAPPING: PolicyType.SCIENTIST,
        EpochType.OBSESSION: PolicyType.OBSESSIVE,
        EpochType.RUTHLESS: PolicyType.DESPERATE,
        EpochType.SYNTHESIS: PolicyType.PERFECTIONIST,
    }

    policy_type = epoch_policies.get(epoch, PolicyType.NAIVE)
    return create_policy(policy_type, graph, storage)
