# Phase 0: Foundations & Pre-Flight

**Agent**: Orchestrator
**Dependencies**: None (this IS the foundation)
**Outputs**: Tech decisions, example data, contracts, directory structure

---

## 0.1 Technology Decisions

### Language: Python 3.11+
**Rationale**:
- Fast prototyping for narrative/creative work
- Rich ecosystem for graphs (networkx), data (pandas), storage (sqlite)
- Easy for LLM agents to read/write
- Type hints for clarity without compilation overhead

### Storage: SQLite + JSON
**Rationale**:
- SQLite: Loops, classes, indexes (structured queries)
- JSON: Day graph definitions, config (human-readable)
- No external dependencies
- Easy to inspect and debug

### Key Libraries
```
networkx       # Graph operations
pydantic       # Data validation & schemas
sqlite3        # Built-in, no install needed
rich           # Pretty console output
pytest         # Testing
```

### Why Not X?
- **PostgreSQL**: Overkill for single-user narrative tool
- **MongoDB**: Graph operations are clunky
- **Rust/Go**: Slower iteration, less agent-friendly
- **TypeScript**: Fine, but Python ecosystem wins for this domain

---

## 0.2 Directory Structure

```
/Loop
├── docs/
│   ├── ARCHITECTURE.md
│   ├── glossary.md
│   ├── api-contracts.md
│   └── Phase*.md files
│
├── src/
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── loop.py           # Loop, SubLoop, LoopClass
│   │   ├── graph.py          # EventNode, Transition, DayGraph
│   │   ├── knowledge.py      # KnowledgeProfile, MoodProfile
│   │   └── narrative.py      # Epoch, Montage, Anchor
│   │
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── storage.py        # Database operations
│   │   ├── graph_engine.py   # Pathfinding, traversal
│   │   ├── operators.py      # cause, avoid, trigger, etc.
│   │   ├── compression.py    # Equivalence classes
│   │   └── generator.py      # Loop generation pipeline
│   │
│   ├── narrative/
│   │   ├── __init__.py
│   │   ├── epochs.py         # Epoch definitions
│   │   ├── prose.py          # Text generation
│   │   └── assembler.py      # Story assembly
│   │
│   └── cli/
│       ├── __init__.py
│       └── main.py           # Command-line interface
│
├── data/
│   ├── graphs/
│   │   └── example_day.json  # Sample day graph
│   ├── fixtures/
│   │   └── test_loops.json   # Test data
│   └── output/
│       └── .gitkeep
│
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_graph.py
│   ├── test_operators.py
│   ├── test_compression.py
│   └── test_narrative.py
│
├── config/
│   └── settings.py           # Configuration
│
├── StartHere                  # Original design doc
├── checklists.md
├── agent-roles.md
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 0.3 Core Type Definitions (Preview)

These will be implemented in Phase 1, but defining them now ensures alignment:

```python
from typing import Optional, List, Set
from dataclasses import dataclass
from enum import Enum
import hashlib

# === IDENTIFIERS ===
LoopID = str          # UUID
ClassID = str         # UUID
NodeID = str          # UUID
TimeSlot = int        # 0, 1, 2, ... N

# === ENUMS ===
class NodeType(Enum):
    CRITICAL = "critical"    # Branch points, revelations
    SOFT = "soft"            # Flavor, color
    DEATH = "death"          # Loop terminators
    REVELATION = "revelation" # Knowledge gains

class EpochType(Enum):
    NAIVE = "naive"
    MAPPING = "mapping"
    OBSESSION = "obsession"
    RUTHLESS = "ruthless"
    SYNTHESIS = "synthesis"

class Strategy(Enum):
    BRUTE_FORCE = "brute_force"
    STEALTH = "stealth"
    PERSUASION = "persuasion"
    WITHDRAWAL = "withdrawal"
    CHAOS = "chaos"

# === CORE MODELS ===
@dataclass
class Loop:
    id: LoopID
    parent_id: Optional[LoopID]
    epoch: EpochType
    key_choices: int          # Bit vector as integer
    outcome_hash: str         # SHA256 of outcome
    knowledge_id: str         # Hash of knowledge state
    mood_id: str              # Hash of mood state
    tags: List[str]
    decision_trace: List[NodeID]  # Path through graph
    created_at: float         # Unix timestamp

@dataclass
class SubLoop:
    id: str
    parent_loop_id: LoopID
    start_time: TimeSlot
    end_time: TimeSlot
    attempts_count: int
    best_outcome_hash: str
    knowledge_gained: List[str]
    emotional_effect: str     # frustration, mastery, numbness

@dataclass
class LoopClass:
    id: ClassID
    outcome_hash: str
    knowledge_delta: List[str]
    mood_delta: str
    count: int
    representative_id: LoopID
    sample_ids: List[LoopID]

@dataclass
class EventNode:
    id: NodeID
    name: str
    description: str
    time_slot: TimeSlot
    node_type: NodeType
    preconditions: List[str]  # Facts that must be true
    effects: List[str]        # Facts that become true

@dataclass
class Transition:
    from_node: NodeID
    to_node: NodeID
    time_cost: int
    conditions: List[str]
    probability: float        # 0.0 to 1.0
```

---

## 0.4 Outcome Hash Algorithm

Critical for equivalence. Must be deterministic.

```python
def compute_outcome_hash(
    survivors: Set[str],      # Who lived
    deaths: Set[str],         # Who died
    state_changes: Set[str],  # What changed in world
    ending_type: str          # How loop ended
) -> str:
    """
    Compute deterministic hash of loop outcome.
    Same inputs MUST produce same hash.
    """
    # Sort for determinism
    data = {
        "survivors": sorted(survivors),
        "deaths": sorted(deaths),
        "state_changes": sorted(state_changes),
        "ending_type": ending_type
    }

    # Serialize deterministically
    import json
    serialized = json.dumps(data, sort_keys=True)

    # Hash
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

---

## 0.5 Knowledge Hash Algorithm

```python
def compute_knowledge_id(
    facts_known: Set[str],
    secrets_discovered: Set[str],
    skills_gained: Set[str]
) -> str:
    """
    Hash of what protagonist knows.
    Two loops with same knowledge hash are interchangeable
    for equivalence purposes.
    """
    data = {
        "facts": sorted(facts_known),
        "secrets": sorted(secrets_discovered),
        "skills": sorted(skills_gained)
    }

    import json
    serialized = json.dumps(data, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
```

---

## 0.6 Decision Vector Format

Key choices represented as bit vector for Hamming distance:

```python
# Define key decision points (up to 64 for a single int)
DECISIONS = {
    0: "GO_TO_BANK",           # Bit 0
    1: "WARN_SISTER",          # Bit 1
    2: "CONFRONT_VILLAIN",     # Bit 2
    3: "TAKE_WEAPON",          # Bit 3
    4: "TRUST_STRANGER",       # Bit 4
    5: "REVEAL_KNOWLEDGE",     # Bit 5
    # ... up to 63
}

def hamming_distance(vec1: int, vec2: int) -> int:
    """Count differing bits between two decision vectors."""
    xor = vec1 ^ vec2
    return bin(xor).count('1')

# Example:
# vec1 = 0b110101  # Decisions: 0,2,4,5
# vec2 = 0b110001  # Decisions: 0,4,5
# hamming_distance(vec1, vec2) = 1  (bit 2 differs)
```

---

## 0.7 Database Schema Preview

```sql
-- Core loop storage
CREATE TABLE loops (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES loops(id),
    epoch TEXT NOT NULL,
    key_choices INTEGER NOT NULL,
    outcome_hash TEXT NOT NULL,
    knowledge_id TEXT NOT NULL,
    mood_id TEXT NOT NULL,
    tags TEXT,  -- JSON array
    decision_trace TEXT,  -- JSON array
    created_at REAL NOT NULL
);

-- Indexes for fast queries
CREATE INDEX idx_loops_outcome ON loops(outcome_hash);
CREATE INDEX idx_loops_epoch ON loops(epoch);
CREATE INDEX idx_loops_parent ON loops(parent_id);
CREATE INDEX idx_loops_knowledge ON loops(knowledge_id);

-- Equivalence classes
CREATE TABLE loop_classes (
    id TEXT PRIMARY KEY,
    outcome_hash TEXT NOT NULL,
    knowledge_delta TEXT,  -- JSON array
    mood_delta TEXT,
    count INTEGER DEFAULT 1,
    representative_id TEXT REFERENCES loops(id),
    sample_ids TEXT  -- JSON array
);

CREATE INDEX idx_classes_outcome ON loop_classes(outcome_hash);

-- Sub-loops
CREATE TABLE sub_loops (
    id TEXT PRIMARY KEY,
    parent_loop_id TEXT REFERENCES loops(id),
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    attempts_count INTEGER DEFAULT 1,
    best_outcome_hash TEXT,
    knowledge_gained TEXT,  -- JSON array
    emotional_effect TEXT
);
```

---

## 0.8 Configuration Structure

```python
# config/settings.py

from dataclasses import dataclass
from pathlib import Path

@dataclass
class LoopEngineConfig:
    # Paths
    db_path: Path = Path("data/loops.db")
    graphs_dir: Path = Path("data/graphs")
    output_dir: Path = Path("data/output")

    # Compression settings
    min_class_size: int = 1
    anchor_ratio: float = 0.01  # 1% of loops are anchors
    montage_threshold: int = 10  # Compress if > 10 similar loops

    # Generation settings
    max_loops_per_batch: int = 1000
    default_epoch: str = "naive"

    # Narrative settings
    detail_levels: dict = None

    def __post_init__(self):
        self.detail_levels = {
            "full": {"max_words": 5000, "include_all_decisions": True},
            "summary": {"max_words": 500, "include_key_decisions": True},
            "flash": {"max_words": 100, "include_outcome_only": True}
        }

# Singleton
config = LoopEngineConfig()
```

---

## 0.9 Phase 0 Checklist

- [x] Technology decisions documented
- [x] Directory structure defined
- [x] Core type definitions previewed
- [x] Outcome hash algorithm specified
- [x] Knowledge hash algorithm specified
- [x] Decision vector format defined
- [x] Database schema drafted
- [x] Configuration structure designed
- [ ] Example day graph created (separate file)
- [ ] Glossary created (separate file)
- [ ] API contracts defined (separate file)
- [ ] Test fixtures prepared (separate file)
- [ ] requirements.txt created
- [ ] Basic README created

---

## 0.10 Success Criteria for Phase 0

1. All agents can read and understand the tech stack
2. Directory structure exists (at least as stubs)
3. Example day graph provides concrete reference
4. Glossary eliminates ambiguity in terms
5. API contracts prevent integration surprises
6. Test fixtures enable immediate testing in Phase 1
