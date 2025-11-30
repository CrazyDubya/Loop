"""
SQLite Storage Layer for Loop Engine.

This module provides persistent storage for:
- Loops
- SubLoops
- LoopClasses

Implements the full CRUD + query interface defined in api-contracts.md.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, Iterator, List, Optional

from src.models import (
    Loop,
    SubLoop,
    LoopClass,
    LoopID,
    ClassID,
    EpochType,
)


class LoopStorage:
    """
    SQLite-based storage for Loop Engine data.

    Usage:
        storage = LoopStorage("data/loops.db")
        storage.initialize()
        storage.create_loop(loop)
        loop = storage.get_loop(loop_id)
    """

    def __init__(self, db_path: str | Path = "data/loops.db"):
        """
        Initialize storage with database path.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection: Optional[sqlite3.Connection] = None

    @contextmanager
    def _get_connection(self) -> Iterator[sqlite3.Connection]:
        """Get a database connection with proper cleanup."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self) -> None:
        """Create database tables if they don't exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Loops table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS loops (
                    id TEXT PRIMARY KEY,
                    parent_id TEXT REFERENCES loops(id),
                    epoch TEXT NOT NULL,
                    key_choices INTEGER NOT NULL DEFAULT 0,
                    outcome_hash TEXT NOT NULL DEFAULT '',
                    knowledge_id TEXT NOT NULL DEFAULT '',
                    mood_id TEXT NOT NULL DEFAULT '',
                    tags TEXT DEFAULT '[]',
                    decision_trace TEXT DEFAULT '[]',
                    created_at REAL NOT NULL,
                    notes TEXT,
                    class_id TEXT REFERENCES loop_classes(id)
                )
            """)

            # Indexes for loops
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_loops_outcome ON loops(outcome_hash)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_loops_epoch ON loops(epoch)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_loops_parent ON loops(parent_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_loops_knowledge ON loops(knowledge_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_loops_class ON loops(class_id)")

            # SubLoops table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sub_loops (
                    id TEXT PRIMARY KEY,
                    parent_loop_id TEXT NOT NULL REFERENCES loops(id),
                    start_time INTEGER NOT NULL,
                    end_time INTEGER NOT NULL,
                    attempts_count INTEGER DEFAULT 1,
                    best_outcome_hash TEXT DEFAULT '',
                    knowledge_gained TEXT DEFAULT '[]',
                    emotional_effect TEXT DEFAULT 'neutral'
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_subloops_parent ON sub_loops(parent_loop_id)")

            # LoopClasses table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS loop_classes (
                    id TEXT PRIMARY KEY,
                    outcome_hash TEXT NOT NULL,
                    knowledge_id TEXT NOT NULL DEFAULT '',
                    knowledge_delta TEXT DEFAULT '[]',
                    mood_delta TEXT DEFAULT '',
                    count INTEGER DEFAULT 1,
                    representative_id TEXT,
                    sample_ids TEXT DEFAULT '[]',
                    created_at REAL NOT NULL,
                    notes TEXT
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_classes_outcome ON loop_classes(outcome_hash)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_classes_knowledge ON loop_classes(knowledge_id)")

    # === Loop CRUD ===

    def create_loop(self, loop: Loop) -> LoopID:
        """
        Store a new loop.

        Args:
            loop: Loop object to store

        Returns:
            The loop's ID
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO loops (
                    id, parent_id, epoch, key_choices, outcome_hash,
                    knowledge_id, mood_id, tags, decision_trace,
                    created_at, notes, class_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                loop.id,
                loop.parent_id,
                loop.epoch.value,
                loop.key_choices,
                loop.outcome_hash,
                loop.knowledge_id,
                loop.mood_id,
                json.dumps(loop.tags),
                json.dumps(loop.decision_trace),
                loop.created_at,
                loop.notes,
                loop.class_id
            ))
        return loop.id

    def get_loop(self, loop_id: LoopID) -> Optional[Loop]:
        """
        Retrieve a loop by ID.

        Args:
            loop_id: The loop's unique identifier

        Returns:
            Loop object or None if not found
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loops WHERE id = ?", (loop_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_loop(row)
        return None

    def update_loop(self, loop_id: LoopID, updates: Dict) -> bool:
        """
        Update loop fields.

        Args:
            loop_id: The loop to update
            updates: Dict of field -> new value

        Returns:
            True if loop was found and updated
        """
        if not updates:
            return False

        # Handle special fields
        if 'tags' in updates:
            updates['tags'] = json.dumps(updates['tags'])
        if 'decision_trace' in updates:
            updates['decision_trace'] = json.dumps(updates['decision_trace'])
        if 'epoch' in updates and isinstance(updates['epoch'], EpochType):
            updates['epoch'] = updates['epoch'].value

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [loop_id]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE loops SET {set_clause} WHERE id = ?", values)
            return cursor.rowcount > 0

    def delete_loop(self, loop_id: LoopID) -> bool:
        """
        Delete a loop.

        Args:
            loop_id: The loop to delete

        Returns:
            True if loop was found and deleted
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # First delete any sub-loops
            cursor.execute("DELETE FROM sub_loops WHERE parent_loop_id = ?", (loop_id,))
            # Then delete the loop
            cursor.execute("DELETE FROM loops WHERE id = ?", (loop_id,))
            return cursor.rowcount > 0

    # === Loop Queries ===

    def get_loops_by_epoch(self, epoch: EpochType) -> List[Loop]:
        """Get all loops in a given epoch."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loops WHERE epoch = ? ORDER BY created_at", (epoch.value,))
            return [self._row_to_loop(row) for row in cursor.fetchall()]

    def get_loops_by_outcome(self, outcome_hash: str) -> List[Loop]:
        """Get all loops with matching outcome hash."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loops WHERE outcome_hash = ?", (outcome_hash,))
            return [self._row_to_loop(row) for row in cursor.fetchall()]

    def get_loops_by_knowledge(self, knowledge_id: str) -> List[Loop]:
        """Get all loops with matching knowledge state."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loops WHERE knowledge_id = ?", (knowledge_id,))
            return [self._row_to_loop(row) for row in cursor.fetchall()]

    def get_loop_lineage(self, loop_id: LoopID) -> List[Loop]:
        """
        Get the chain of loops from this one back to the root.

        Returns loops in order from oldest ancestor to the specified loop.
        """
        lineage = []
        current_id = loop_id

        while current_id:
            loop = self.get_loop(current_id)
            if loop:
                lineage.append(loop)
                current_id = loop.parent_id
            else:
                break

        return list(reversed(lineage))

    def get_loops_by_class(self, class_id: ClassID) -> List[Loop]:
        """Get all loops in an equivalence class."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loops WHERE class_id = ?", (class_id,))
            return [self._row_to_loop(row) for row in cursor.fetchall()]

    def count_loops(self, criteria: Optional[Dict] = None) -> int:
        """
        Count loops matching criteria.

        Args:
            criteria: Dict of field -> value to match

        Returns:
            Number of matching loops
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if not criteria:
                cursor.execute("SELECT COUNT(*) FROM loops")
            else:
                where_clause = " AND ".join(f"{k} = ?" for k in criteria.keys())
                values = list(criteria.values())
                cursor.execute(f"SELECT COUNT(*) FROM loops WHERE {where_clause}", values)
            return cursor.fetchone()[0]

    def get_all_loops(self, limit: int = 1000, offset: int = 0) -> List[Loop]:
        """Get all loops with pagination."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM loops ORDER BY created_at LIMIT ? OFFSET ?",
                (limit, offset)
            )
            return [self._row_to_loop(row) for row in cursor.fetchall()]

    # === SubLoop CRUD ===

    def create_subloop(self, subloop: SubLoop) -> str:
        """Store a new sub-loop."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sub_loops (
                    id, parent_loop_id, start_time, end_time,
                    attempts_count, best_outcome_hash, knowledge_gained,
                    emotional_effect
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                subloop.id,
                subloop.parent_loop_id,
                subloop.start_time,
                subloop.end_time,
                subloop.attempts_count,
                subloop.best_outcome_hash,
                json.dumps(subloop.knowledge_gained),
                subloop.emotional_effect
            ))
        return subloop.id

    def get_subloop(self, subloop_id: str) -> Optional[SubLoop]:
        """Get a sub-loop by ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sub_loops WHERE id = ?", (subloop_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_subloop(row)
        return None

    def get_subloops_for_loop(self, loop_id: LoopID) -> List[SubLoop]:
        """Get all sub-loops within a parent loop."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM sub_loops WHERE parent_loop_id = ? ORDER BY start_time",
                (loop_id,)
            )
            return [self._row_to_subloop(row) for row in cursor.fetchall()]

    def delete_subloop(self, subloop_id: str) -> bool:
        """Delete a sub-loop."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sub_loops WHERE id = ?", (subloop_id,))
            return cursor.rowcount > 0

    # === LoopClass CRUD ===

    def create_class(self, loop_class: LoopClass) -> ClassID:
        """Store a new equivalence class."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO loop_classes (
                    id, outcome_hash, knowledge_id, knowledge_delta,
                    mood_delta, count, representative_id, sample_ids,
                    created_at, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                loop_class.id,
                loop_class.outcome_hash,
                loop_class.knowledge_id,
                json.dumps(loop_class.knowledge_delta),
                loop_class.mood_delta,
                loop_class.count,
                loop_class.representative_id,
                json.dumps(loop_class.sample_ids),
                loop_class.created_at,
                loop_class.notes
            ))
        return loop_class.id

    def get_class(self, class_id: ClassID) -> Optional[LoopClass]:
        """Get an equivalence class by ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loop_classes WHERE id = ?", (class_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_class(row)
        return None

    def get_class_by_equivalence(self, outcome_hash: str, knowledge_id: str) -> Optional[LoopClass]:
        """Find a class by its equivalence key."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM loop_classes WHERE outcome_hash = ? AND knowledge_id = ?",
                (outcome_hash, knowledge_id)
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_class(row)
        return None

    def update_class(self, class_id: ClassID, updates: Dict) -> bool:
        """Update class fields."""
        if not updates:
            return False

        # Handle special fields
        if 'knowledge_delta' in updates:
            updates['knowledge_delta'] = json.dumps(updates['knowledge_delta'])
        if 'sample_ids' in updates:
            updates['sample_ids'] = json.dumps(updates['sample_ids'])

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [class_id]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE loop_classes SET {set_clause} WHERE id = ?", values)
            return cursor.rowcount > 0

    def delete_class(self, class_id: ClassID) -> bool:
        """Delete an equivalence class."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # First unassign loops from this class
            cursor.execute("UPDATE loops SET class_id = NULL WHERE class_id = ?", (class_id,))
            # Then delete the class
            cursor.execute("DELETE FROM loop_classes WHERE id = ?", (class_id,))
            return cursor.rowcount > 0

    def get_all_classes(self) -> List[LoopClass]:
        """Get all equivalence classes."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM loop_classes ORDER BY count DESC")
            return [self._row_to_class(row) for row in cursor.fetchall()]

    def count_classes(self) -> int:
        """Count total equivalence classes."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM loop_classes")
            return cursor.fetchone()[0]

    # === Utility Methods ===

    def assign_loop_to_class(self, loop_id: LoopID, class_id: ClassID) -> bool:
        """Assign a loop to an equivalence class."""
        return self.update_loop(loop_id, {'class_id': class_id})

    def get_or_create_class(self, loop: Loop) -> LoopClass:
        """
        Get existing class for loop or create new one.

        This is the main entry point for equivalence class assignment.
        """
        # Check for existing class
        existing = self.get_class_by_equivalence(loop.outcome_hash, loop.knowledge_id)
        if existing:
            # Update the existing class
            existing.add_loop(loop.id)
            self.update_class(existing.id, {
                'count': existing.count,
                'sample_ids': existing.sample_ids
            })
            self.assign_loop_to_class(loop.id, existing.id)
            return existing

        # Create new class
        from src.models import create_class_from_loop
        new_class = create_class_from_loop(loop)
        self.create_class(new_class)
        self.assign_loop_to_class(loop.id, new_class.id)
        return new_class

    def get_statistics(self) -> Dict:
        """Get overall storage statistics."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM loops")
            total_loops = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM loop_classes")
            total_classes = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM sub_loops")
            total_subloops = cursor.fetchone()[0]

            cursor.execute("SELECT epoch, COUNT(*) FROM loops GROUP BY epoch")
            loops_by_epoch = dict(cursor.fetchall())

            compression_ratio = total_loops / total_classes if total_classes > 0 else 0

            return {
                'total_loops': total_loops,
                'total_classes': total_classes,
                'total_subloops': total_subloops,
                'compression_ratio': compression_ratio,
                'loops_by_epoch': loops_by_epoch
            }

    def clear_all(self) -> None:
        """Clear all data. Use with caution!"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sub_loops")
            cursor.execute("DELETE FROM loops")
            cursor.execute("DELETE FROM loop_classes")

    # === Row Conversion Helpers ===

    def _row_to_loop(self, row: sqlite3.Row) -> Loop:
        """Convert a database row to a Loop object."""
        return Loop(
            id=row['id'],
            parent_id=row['parent_id'],
            epoch=EpochType(row['epoch']),
            key_choices=row['key_choices'],
            outcome_hash=row['outcome_hash'],
            knowledge_id=row['knowledge_id'],
            mood_id=row['mood_id'],
            tags=json.loads(row['tags']),
            decision_trace=json.loads(row['decision_trace']),
            created_at=row['created_at'],
            notes=row['notes'],
            class_id=row['class_id']
        )

    def _row_to_subloop(self, row: sqlite3.Row) -> SubLoop:
        """Convert a database row to a SubLoop object."""
        return SubLoop(
            id=row['id'],
            parent_loop_id=row['parent_loop_id'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            attempts_count=row['attempts_count'],
            best_outcome_hash=row['best_outcome_hash'],
            knowledge_gained=json.loads(row['knowledge_gained']),
            emotional_effect=row['emotional_effect']
        )

    def _row_to_class(self, row: sqlite3.Row) -> LoopClass:
        """Convert a database row to a LoopClass object."""
        return LoopClass(
            id=row['id'],
            outcome_hash=row['outcome_hash'],
            knowledge_id=row['knowledge_id'],
            knowledge_delta=json.loads(row['knowledge_delta']),
            mood_delta=row['mood_delta'],
            count=row['count'],
            representative_id=row['representative_id'],
            sample_ids=json.loads(row['sample_ids']),
            created_at=row['created_at'],
            notes=row['notes']
        )


# === Convenience Functions ===

def create_storage(db_path: str = "data/loops.db") -> LoopStorage:
    """Create and initialize a storage instance."""
    storage = LoopStorage(db_path)
    storage.initialize()
    return storage
