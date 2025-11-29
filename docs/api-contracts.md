# API Contracts Between Phases

This document defines the interfaces between phases. Each phase MUST implement its "Provides" section and MAY depend on "Requires" from prior phases.

---

## Phase 1 → Phase 2 Contract

### Phase 1 Provides (Data Layer)

```python
# === CRUD Operations ===

def create_loop(loop: Loop) -> LoopID:
    """Store a new loop. Returns assigned ID."""
    ...

def get_loop(loop_id: LoopID) -> Optional[Loop]:
    """Retrieve loop by ID. Returns None if not found."""
    ...

def update_loop(loop_id: LoopID, updates: dict) -> bool:
    """Update loop fields. Returns success."""
    ...

def delete_loop(loop_id: LoopID) -> bool:
    """Remove loop. Returns success."""
    ...

# === Query Operations ===

def get_loops_by_epoch(epoch: EpochType) -> List[Loop]:
    """All loops in given epoch."""
    ...

def get_loops_by_outcome(outcome_hash: str) -> List[Loop]:
    """All loops with matching outcome."""
    ...

def get_loops_by_knowledge(knowledge_id: str) -> List[Loop]:
    """All loops ending with same knowledge state."""
    ...

def get_loop_lineage(loop_id: LoopID) -> List[Loop]:
    """Chain from loop back through all parents."""
    ...

def count_loops(criteria: dict) -> int:
    """Count matching loops without fetching."""
    ...

# === Hashing ===

def compute_outcome_hash(
    survivors: Set[str],
    deaths: Set[str],
    state_changes: Set[str],
    ending_type: str
) -> str:
    """Deterministic outcome hash."""
    ...

def compute_knowledge_id(
    facts: Set[str],
    secrets: Set[str],
    skills: Set[str]
) -> str:
    """Deterministic knowledge hash."""
    ...

# === SubLoop Operations ===

def create_subloop(subloop: SubLoop) -> str:
    """Store sub-loop. Returns ID."""
    ...

def get_subloops_for_loop(loop_id: LoopID) -> List[SubLoop]:
    """All sub-loops within a parent loop."""
    ...
```

### Phase 2 Requires
- All CRUD operations
- Hashing functions
- Query by epoch (for generation context)

---

## Phase 2 → Phase 3 Contract

### Phase 2 Provides (Graph Layer)

```python
# === Graph Management ===

def load_day_graph(path: str) -> DayGraph:
    """Load graph from JSON file."""
    ...

def get_node(node_id: NodeID) -> Optional[EventNode]:
    """Retrieve node by ID."""
    ...

def get_nodes_by_type(node_type: NodeType) -> List[EventNode]:
    """All nodes of given type (critical, death, etc.)."""
    ...

def get_nodes_at_time(time_slot: TimeSlot) -> List[EventNode]:
    """All nodes that can occur at given time."""
    ...

def get_transitions_from(node_id: NodeID) -> List[Transition]:
    """All outgoing edges from a node."""
    ...

# === Pathfinding ===

def find_paths(
    start: NodeID,
    goal: NodeID,
    max_paths: int = 10,
    knowledge: Set[str] = None
) -> List[List[NodeID]]:
    """Find paths from start to goal, respecting conditions."""
    ...

def find_path_to_event(
    current_state: WorldState,
    target_event: NodeID
) -> Optional[List[NodeID]]:
    """Shortest path to reach target event."""
    ...

def is_reachable(
    from_node: NodeID,
    to_node: NodeID,
    knowledge: Set[str] = None
) -> bool:
    """Can we get from A to B with current knowledge?"""
    ...

# === Simulation ===

def simulate_path(
    decisions: List[NodeID],
    initial_knowledge: Set[str] = None
) -> SimulationResult:
    """
    Walk the graph with given decisions.
    Returns:
        - final_state: WorldState
        - knowledge_gained: Set[str]
        - outcome_hash: str
        - success: bool
    """
    ...

def get_valid_choices(
    current_node: NodeID,
    current_time: TimeSlot,
    knowledge: Set[str]
) -> List[NodeID]:
    """What nodes can we transition to from here?"""
    ...

# === Analysis ===

def get_critical_nodes() -> List[EventNode]:
    """All nodes marked as critical."""
    ...

def get_death_nodes() -> List[EventNode]:
    """All nodes that end the loop."""
    ...

def get_revelation_nodes() -> List[EventNode]:
    """All nodes that grant knowledge."""
    ...

@dataclass
class SimulationResult:
    final_state: WorldState
    knowledge_gained: Set[str]
    mood_effects: List[str]
    outcome_hash: str
    knowledge_id: str
    decision_trace: List[NodeID]
    terminated_early: bool
    death_node: Optional[NodeID]
```

### Phase 3 Requires
- Pathfinding (for operator implementation)
- Simulation (to compute outcomes)
- Node queries (to find targets)
- Valid choices (for decision generation)

---

## Phase 3 → Phase 4 Contract

### Phase 3 Provides (Operations Layer)

```python
# === Operators ===

def cause(
    target_event: NodeID,
    knowledge: Set[str] = None,
    epoch: EpochType = None
) -> Loop:
    """Generate loop that attempts to cause target event."""
    ...

def avoid(
    target_event: NodeID,
    knowledge: Set[str] = None,
    epoch: EpochType = None
) -> Loop:
    """Generate loop that attempts to avoid target event."""
    ...

def trigger(
    sequence: List[NodeID],
    knowledge: Set[str] = None,
    epoch: EpochType = None
) -> Loop:
    """Generate loop passing through sequence in order."""
    ...

def relive(
    reference_loop_id: LoopID,
    max_deviation: int = 0
) -> Loop:
    """Generate loop matching reference as closely as possible."""
    ...

def slightly_change(
    reference_loop_id: LoopID,
    changes: int = 1
) -> Loop:
    """Generate loop with small Hamming distance from reference."""
    ...

def greatly_change(
    reference_loop_id: LoopID,
    min_changes: int = 5
) -> Loop:
    """Generate loop with large Hamming distance from reference."""
    ...

# === Decision Vectors ===

def hamming_distance(vec1: int, vec2: int) -> int:
    """Count differing bits."""
    ...

def mutate_vector(vec: int, n_flips: int) -> int:
    """Flip n random bits."""
    ...

def encode_decisions(decisions: List[NodeID]) -> int:
    """Convert decision trace to bit vector."""
    ...

def decode_decisions(vec: int) -> List[str]:
    """Convert bit vector to decision labels."""
    ...

# === Policies ===

def generate_loop_with_policy(
    policy: Policy,
    knowledge: Set[str],
    mood: str,
    epoch: EpochType
) -> Loop:
    """Let policy choose operator and generate loop."""
    ...

def batch_generate(
    policy: Policy,
    count: int,
    knowledge: Set[str],
    epoch: EpochType
) -> List[Loop]:
    """Generate multiple loops with same policy."""
    ...

# === Available Policies ===
POLICIES = {
    "naive": NaivePolicy(),
    "scientist": ScientistPolicy(),
    "desperate": DesperatePolicy(),
    "perfectionist": PerfectionistPolicy(),
    "obsessive": ObsessivePolicy()
}
```

### Phase 4 Requires
- All operators (for studying loop distributions)
- Hamming distance (for clustering)
- Batch generation (for compression testing)
- Decision encoding (for parametric families)

---

## Phase 4 → Phase 5 Contract

### Phase 4 Provides (Compression Layer)

```python
# === Equivalence Classes ===

def assign_to_class(loop: Loop) -> ClassID:
    """Find or create class for this loop."""
    ...

def get_class(class_id: ClassID) -> LoopClass:
    """Retrieve equivalence class."""
    ...

def get_class_for_loop(loop_id: LoopID) -> LoopClass:
    """Get class containing this loop."""
    ...

def get_all_classes() -> List[LoopClass]:
    """All equivalence classes."""
    ...

def get_class_count() -> int:
    """Number of equivalence classes."""
    ...

# === Anchors ===

def select_anchors(
    loops: List[Loop],
    count: int = 100,
    criteria: dict = None
) -> List[LoopID]:
    """Select anchor loops from pool."""
    ...

def get_anchors_for_epoch(epoch: EpochType) -> List[Loop]:
    """Anchor loops in given epoch."""
    ...

def is_anchor(loop_id: LoopID) -> bool:
    """Is this loop an anchor?"""
    ...

# === Montages ===

def create_montage(class_id: ClassID) -> Montage:
    """Create montage for equivalence class."""
    ...

def get_montages_for_epoch(epoch: EpochType) -> List[Montage]:
    """All montages in epoch."""
    ...

@dataclass
class Montage:
    id: str
    class_id: ClassID
    count: int
    representative_ids: List[LoopID]
    outcome_summary: str
    knowledge_delta: List[str]
    mood_effect: str

# === Parametric Families ===

def get_family(
    strategy: Strategy,
    risk_level: str = None
) -> LoopFamily:
    """Get loops matching strategy pattern."""
    ...

def get_families() -> List[LoopFamily]:
    """All defined parametric families."""
    ...

# === Sub-Loop Macros ===

def create_subloop_macro(
    parent_loop_id: LoopID,
    time_window: Tuple[TimeSlot, TimeSlot]
) -> SubLoopMacro:
    """Compress repeated sub-loops into macro."""
    ...

def get_macros_for_loop(loop_id: LoopID) -> List[SubLoopMacro]:
    """All macros within a loop."""
    ...

@dataclass
class SubLoopMacro:
    id: str
    parent_loop_id: LoopID
    time_window: Tuple[int, int]
    attempts_count: int
    success_rate: float
    best_outcome: str
    emotional_effect: str

# === Statistics ===

def get_compression_stats() -> CompressionStats:
    """Overall compression metrics."""
    ...

@dataclass
class CompressionStats:
    total_loops: int
    total_classes: int
    compression_ratio: float
    anchor_count: int
    anchor_density: float
    largest_class_size: int
    smallest_class_size: int
```

### Phase 5 Requires
- Equivalence classes (what to compress)
- Anchors (what to expand)
- Montages (how to summarize)
- Sub-loop macros (for hell sequences)
- Statistics (for narrative pacing)

---

## Phase 5 Outputs (Narrative Layer)

### Final Products

```python
# === Epoch Management ===

def define_epoch(
    name: str,
    loop_range: Tuple[int, int],
    dominant_policy: str,
    description: str
) -> Epoch:
    """Create epoch definition."""
    ...

def get_epochs() -> List[Epoch]:
    """All defined epochs in order."""
    ...

# === Prose Generation ===

def narrate_loop(
    loop_id: LoopID,
    detail_level: str = "summary"  # full, summary, flash
) -> str:
    """Generate prose for single loop."""
    ...

def narrate_montage(montage: Montage) -> str:
    """Generate compressed prose for montage."""
    ...

def narrate_subloop_macro(macro: SubLoopMacro) -> str:
    """Generate 'trapped in time' prose."""
    ...

def narrate_epoch_transition(
    from_epoch: Epoch,
    to_epoch: Epoch,
    trigger_loop: Loop
) -> str:
    """Generate transition prose."""
    ...

# === Story Assembly ===

def assemble_story(epochs: List[Epoch]) -> Story:
    """
    Full story assembly.
    Returns structured output with:
        - Opening
        - Per-epoch sections
        - Transitions
        - Resolution
    """
    ...

@dataclass
class Story:
    title: str
    total_loops: int
    epochs: List[EpochNarrative]
    opening: str
    resolution: str

@dataclass
class EpochNarrative:
    epoch: Epoch
    anchor_narratives: List[str]
    montages: List[str]
    transitions: List[str]
    emotional_summary: str

# === Export ===

def export_markdown(story: Story, path: str) -> None:
    """Write story to markdown file."""
    ...

def export_outline(story: Story, path: str) -> None:
    """Write structural outline."""
    ...

def export_timeline(loops: List[Loop], path: str) -> None:
    """Write chronological loop list."""
    ...
```

---

## Cross-Phase Utilities

These are available to all phases:

```python
# === Logging ===
from src.utils import logger
logger.info("message")
logger.debug("detail")
logger.error("problem")

# === Configuration ===
from config.settings import config
config.db_path
config.anchor_ratio

# === ID Generation ===
from src.utils import generate_id
loop_id = generate_id()  # UUID string
```

---

## Contract Violations

If a phase's implementation doesn't match its contract:

1. **Missing function**: Blocker. Must implement before dependent phase can proceed.
2. **Wrong signature**: Blocker. Fix signature to match contract.
3. **Wrong return type**: Blocker. Ensure type matches.
4. **Performance issue**: Warning. Document and optimize later.
5. **Extra functions**: OK. Contracts are minimum requirements.

Report violations to Orchestrator for resolution.
