"""
Data models for Loop Engine.

Core types: Loop, SubLoop, LoopClass, KnowledgeProfile, MoodProfile
Graph types: EventNode, Transition, DayGraph, WorldState
"""

from .loop import (
    # Types
    LoopID,
    ClassID,
    NodeID,
    TimeSlot,
    # Enums
    EpochType,
    LoopTag,
    # Models
    Loop,
    SubLoop,
    LoopClass,
    # Functions
    generate_loop_id,
    generate_class_id,
    generate_subloop_id,
    compute_outcome_hash,
    compute_knowledge_id,
    compute_mood_id,
    hamming_distance,
    mutate_vector,
    crossover_vectors,
    random_vector,
    encode_decisions,
    decode_decisions,
    loops_equivalent,
    create_class_from_loop,
)

from .knowledge import (
    # Enums
    EmotionalBaseline,
    TraumaMarker,
    SkillType,
    # Models
    KnowledgeProfile,
    MoodProfile,
    # Functions
    empty_knowledge,
    fresh_mood,
)

from .graph import (
    # Enums
    NodeType,
    # Models
    EventNode,
    Transition,
    WorldState,
    SimulationResult,
    DayGraph,
    # Functions
    load_graph,
    create_empty_graph,
)

__all__ = [
    # Types
    "LoopID",
    "ClassID",
    "NodeID",
    "TimeSlot",
    # Enums
    "EpochType",
    "LoopTag",
    "EmotionalBaseline",
    "TraumaMarker",
    "SkillType",
    "NodeType",
    # Models
    "Loop",
    "SubLoop",
    "LoopClass",
    "KnowledgeProfile",
    "MoodProfile",
    "EventNode",
    "Transition",
    "WorldState",
    "SimulationResult",
    "DayGraph",
    # Functions
    "generate_loop_id",
    "generate_class_id",
    "generate_subloop_id",
    "compute_outcome_hash",
    "compute_knowledge_id",
    "compute_mood_id",
    "hamming_distance",
    "mutate_vector",
    "crossover_vectors",
    "random_vector",
    "encode_decisions",
    "decode_decisions",
    "loops_equivalent",
    "create_class_from_loop",
    "empty_knowledge",
    "fresh_mood",
    "load_graph",
    "create_empty_graph",
]
