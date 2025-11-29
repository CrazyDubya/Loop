"""
Loop Engine Configuration

Central configuration for all phases. Import and use:
    from config.settings import config
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any
import os


@dataclass
class StorageConfig:
    """Database and file storage settings."""
    db_path: Path = Path("data/loops.db")
    graphs_dir: Path = Path("data/graphs")
    fixtures_dir: Path = Path("data/fixtures")
    output_dir: Path = Path("data/output")

    def ensure_dirs(self):
        """Create directories if they don't exist."""
        for path in [self.graphs_dir, self.fixtures_dir, self.output_dir]:
            path.mkdir(parents=True, exist_ok=True)


@dataclass
class CompressionConfig:
    """Equivalence class and compression settings."""
    min_class_size: int = 1
    anchor_ratio: float = 0.01  # 1% of loops become anchors
    montage_threshold: int = 10  # Compress if > N similar loops
    max_samples_per_class: int = 5
    short_loop_threshold: int = 4  # Loops ending before t4 are "short"


@dataclass
class GenerationConfig:
    """Loop generation settings."""
    max_loops_per_batch: int = 1000
    default_epoch: str = "naive"
    max_subloop_attempts: int = 500
    mutation_rate: float = 0.1  # For slightly_change operator


@dataclass
class NarrativeConfig:
    """Prose generation settings."""
    detail_levels: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    montage_templates: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self):
        if not self.detail_levels:
            self.detail_levels = {
                "full": {
                    "max_words": 5000,
                    "include_all_decisions": True,
                    "include_internal_monologue": True
                },
                "summary": {
                    "max_words": 500,
                    "include_key_decisions": True,
                    "include_outcome": True
                },
                "flash": {
                    "max_words": 100,
                    "include_outcome_only": True
                }
            }

        if not self.montage_templates:
            self.montage_templates = {
                "failure": "He tried every way he could think of to {goal}. {variations}. {count} times, {outcome}.",
                "learning": "Each attempt taught him something. {lessons}. By loop {n}, he knew {knowledge}.",
                "despair": "The attempts blurred together. {count} variations of the same {action}. {effect}.",
                "mastery": "Eventually, muscle memory took over. {count} repetitions until {result}."
            }


@dataclass
class GraphConfig:
    """Day graph settings."""
    max_time_slots: int = 24
    default_graph: str = "example_day.json"
    max_path_search_depth: int = 50
    probability_threshold: float = 0.01  # Ignore transitions below this


@dataclass
class LoopEngineConfig:
    """Master configuration combining all sub-configs."""
    storage: StorageConfig = field(default_factory=StorageConfig)
    compression: CompressionConfig = field(default_factory=CompressionConfig)
    generation: GenerationConfig = field(default_factory=GenerationConfig)
    narrative: NarrativeConfig = field(default_factory=NarrativeConfig)
    graph: GraphConfig = field(default_factory=GraphConfig)

    # Global settings
    debug: bool = False
    log_level: str = "INFO"
    random_seed: int = None  # Set for reproducible generation

    def __post_init__(self):
        # Override from environment if set
        if os.environ.get("LOOP_DEBUG"):
            self.debug = True
            self.log_level = "DEBUG"

        if os.environ.get("LOOP_SEED"):
            self.random_seed = int(os.environ["LOOP_SEED"])

    @classmethod
    def from_env(cls) -> "LoopEngineConfig":
        """Create config with environment overrides."""
        config = cls()

        # Storage overrides
        if db_path := os.environ.get("LOOP_DB_PATH"):
            config.storage.db_path = Path(db_path)

        # Compression overrides
        if anchor_ratio := os.environ.get("LOOP_ANCHOR_RATIO"):
            config.compression.anchor_ratio = float(anchor_ratio)

        return config


# Singleton instance
config = LoopEngineConfig()


# Convenience accessors
def get_db_path() -> Path:
    return config.storage.db_path


def get_default_graph_path() -> Path:
    return config.storage.graphs_dir / config.graph.default_graph


def is_debug() -> bool:
    return config.debug
