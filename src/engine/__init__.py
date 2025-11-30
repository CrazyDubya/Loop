"""
Engine components for Loop Engine.

Modules: storage, validation, graph_engine, operators, policies, generator, compression, narrative
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
from .compression import (
    # Equivalence
    compute_equivalence_key,
    loops_in_same_class,
    # Families
    StrategyType,
    RiskLevel,
    LoopFamily,
    infer_strategy,
    infer_risk_level,
    # Anchors
    AnchorCriteria,
    AnchorScore,
    score_anchor_candidate,
    select_anchors,
    # Montages
    Montage,
    create_montage,
    # Short loops
    ShortLoopCluster,
    cluster_short_loops,
    # Sub-loop macros
    SubLoopMacro,
    detect_subloop_patterns,
    # Manager
    CompressionStats,
    CompressionManager,
)
from .narrative import (
    # Detail levels
    DetailLevel,
    # Epochs
    NarrativeEpoch,
    CANONICAL_EPOCHS,
    get_epoch_definition,
    # Prose generation
    ProseGenerator,
    # Emotional arc
    EmotionalPoint,
    compute_emotional_arc,
    find_emotional_peaks,
    generate_emotional_summary,
    # Story assembly
    StorySection,
    StoryAssembler,
    # Main interface
    NarrativeEngine,
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
    # Compression
    "compute_equivalence_key",
    "loops_in_same_class",
    "StrategyType",
    "RiskLevel",
    "LoopFamily",
    "infer_strategy",
    "infer_risk_level",
    "AnchorCriteria",
    "AnchorScore",
    "score_anchor_candidate",
    "select_anchors",
    "Montage",
    "create_montage",
    "ShortLoopCluster",
    "cluster_short_loops",
    "SubLoopMacro",
    "detect_subloop_patterns",
    "CompressionStats",
    "CompressionManager",
    # Narrative
    "DetailLevel",
    "NarrativeEpoch",
    "CANONICAL_EPOCHS",
    "get_epoch_definition",
    "ProseGenerator",
    "EmotionalPoint",
    "compute_emotional_arc",
    "find_emotional_peaks",
    "generate_emotional_summary",
    "StorySection",
    "StoryAssembler",
    "NarrativeEngine",
]
