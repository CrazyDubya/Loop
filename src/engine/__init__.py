"""
Engine components for Loop Engine.

Modules: storage, validation, graph_engine, operators, policies, generator
"""

from .storage import LoopStorage, create_storage
from .validation import (
    validate_loop,
    validate_subloop,
    validate_loop_class,
    validate_parent_chain,
    ValidationError,
)
from .graph_engine import GraphEngine
from .operators import (
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
from .policies import (
    Policy,
    PolicyDecision,
    PolicyType,
    NaivePolicy,
    ScientistPolicy,
    DesperatePolicy,
    PerfectionistPolicy,
    ObsessivePolicy,
    create_policy,
    get_policy_for_epoch,
)
from .generator import (
    LoopGenerator,
    GenerationStats,
    generate_epoch_story,
)

__all__ = [
    # Storage
    "LoopStorage",
    "create_storage",
    # Validation
    "validate_loop",
    "validate_subloop",
    "validate_loop_class",
    "validate_parent_chain",
    "ValidationError",
    # Graph Engine
    "GraphEngine",
    # Operators
    "Operator",
    "OperatorResult",
    "CauseOperator",
    "AvoidOperator",
    "TriggerOperator",
    "ReliveOperator",
    "SlightlyChangeOperator",
    "GreatlyChangeOperator",
    "create_operator",
    # Policies
    "Policy",
    "PolicyDecision",
    "PolicyType",
    "NaivePolicy",
    "ScientistPolicy",
    "DesperatePolicy",
    "PerfectionistPolicy",
    "ObsessivePolicy",
    "create_policy",
    "get_policy_for_epoch",
    # Generator
    "LoopGenerator",
    "GenerationStats",
    "generate_epoch_story",
]
