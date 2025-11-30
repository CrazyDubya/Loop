"""
Tests for Loop Engine storage layer.

Tests cover:
- CRUD operations for Loop, SubLoop, LoopClass
- Query operations
- Equivalence class management
- Statistics
"""

import os
import tempfile
import pytest

from src.models import (
    Loop,
    SubLoop,
    LoopClass,
    EpochType,
)
from src.engine.storage import LoopStorage, create_storage


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    os.unlink(path)


@pytest.fixture
def storage(temp_db):
    """Create an initialized storage instance."""
    s = LoopStorage(temp_db)
    s.initialize()
    return s


class TestLoopCRUD:
    """Tests for Loop CRUD operations."""

    def test_create_and_get_loop(self, storage):
        """Test creating and retrieving a loop."""
        loop = Loop(
            epoch=EpochType.NAIVE,
            outcome_hash="test123",
            knowledge_id="know123"
        )
        loop_id = storage.create_loop(loop)

        retrieved = storage.get_loop(loop_id)
        assert retrieved is not None
        assert retrieved.id == loop_id
        assert retrieved.epoch == EpochType.NAIVE
        assert retrieved.outcome_hash == "test123"

    def test_get_nonexistent_loop(self, storage):
        """Test getting a loop that doesn't exist."""
        result = storage.get_loop("loop-nonexistent")
        assert result is None

    def test_update_loop(self, storage):
        """Test updating a loop."""
        loop = Loop(epoch=EpochType.NAIVE)
        loop_id = storage.create_loop(loop)

        success = storage.update_loop(loop_id, {
            'epoch': EpochType.MAPPING,
            'outcome_hash': 'updated_hash'
        })
        assert success

        updated = storage.get_loop(loop_id)
        assert updated.epoch == EpochType.MAPPING
        assert updated.outcome_hash == 'updated_hash'

    def test_delete_loop(self, storage):
        """Test deleting a loop."""
        loop = Loop()
        loop_id = storage.create_loop(loop)

        success = storage.delete_loop(loop_id)
        assert success
        assert storage.get_loop(loop_id) is None

    def test_delete_nonexistent_loop(self, storage):
        """Test deleting a loop that doesn't exist."""
        success = storage.delete_loop("loop-nonexistent")
        assert not success


class TestLoopQueries:
    """Tests for Loop query operations."""

    def test_get_loops_by_epoch(self, storage):
        """Test querying loops by epoch."""
        # Create loops in different epochs
        for epoch in [EpochType.NAIVE, EpochType.NAIVE, EpochType.MAPPING]:
            storage.create_loop(Loop(epoch=epoch))

        naive_loops = storage.get_loops_by_epoch(EpochType.NAIVE)
        assert len(naive_loops) == 2

        mapping_loops = storage.get_loops_by_epoch(EpochType.MAPPING)
        assert len(mapping_loops) == 1

    def test_get_loops_by_outcome(self, storage):
        """Test querying loops by outcome hash."""
        storage.create_loop(Loop(outcome_hash="same_outcome"))
        storage.create_loop(Loop(outcome_hash="same_outcome"))
        storage.create_loop(Loop(outcome_hash="different"))

        same = storage.get_loops_by_outcome("same_outcome")
        assert len(same) == 2

    def test_get_loops_by_knowledge(self, storage):
        """Test querying loops by knowledge ID."""
        storage.create_loop(Loop(knowledge_id="knows_secret"))
        storage.create_loop(Loop(knowledge_id="knows_nothing"))

        result = storage.get_loops_by_knowledge("knows_secret")
        assert len(result) == 1

    def test_get_loop_lineage(self, storage):
        """Test getting loop lineage (parent chain)."""
        # Create a chain: grandparent -> parent -> child
        grandparent = Loop(id="loop-grandparent")
        storage.create_loop(grandparent)

        parent = Loop(id="loop-parent", parent_id="loop-grandparent")
        storage.create_loop(parent)

        child = Loop(id="loop-child", parent_id="loop-parent")
        storage.create_loop(child)

        lineage = storage.get_loop_lineage("loop-child")
        assert len(lineage) == 3
        assert lineage[0].id == "loop-grandparent"
        assert lineage[1].id == "loop-parent"
        assert lineage[2].id == "loop-child"

    def test_count_loops(self, storage):
        """Test counting loops."""
        for _ in range(5):
            storage.create_loop(Loop())

        assert storage.count_loops() == 5
        assert storage.count_loops({'epoch': EpochType.NAIVE.value}) == 5

    def test_get_all_loops_pagination(self, storage):
        """Test getting all loops with pagination."""
        for i in range(10):
            storage.create_loop(Loop())

        first_page = storage.get_all_loops(limit=5, offset=0)
        assert len(first_page) == 5

        second_page = storage.get_all_loops(limit=5, offset=5)
        assert len(second_page) == 5

        # Ensure no overlap
        first_ids = {l.id for l in first_page}
        second_ids = {l.id for l in second_page}
        assert first_ids.isdisjoint(second_ids)


class TestSubLoopCRUD:
    """Tests for SubLoop CRUD operations."""

    def test_create_and_get_subloop(self, storage):
        """Test creating and retrieving a sub-loop."""
        # First create parent loop
        parent = Loop(id="loop-parent")
        storage.create_loop(parent)

        subloop = SubLoop(
            parent_loop_id="loop-parent",
            start_time=3,
            end_time=5,
            attempts_count=50
        )
        subloop_id = storage.create_subloop(subloop)

        retrieved = storage.get_subloop(subloop_id)
        assert retrieved is not None
        assert retrieved.parent_loop_id == "loop-parent"
        assert retrieved.attempts_count == 50

    def test_get_subloops_for_loop(self, storage):
        """Test getting all sub-loops for a parent loop."""
        parent = Loop(id="loop-parent")
        storage.create_loop(parent)

        for i in range(3):
            storage.create_subloop(SubLoop(
                parent_loop_id="loop-parent",
                start_time=i,
                end_time=i + 1
            ))

        subloops = storage.get_subloops_for_loop("loop-parent")
        assert len(subloops) == 3

    def test_delete_subloop(self, storage):
        """Test deleting a sub-loop."""
        parent = Loop(id="loop-parent")
        storage.create_loop(parent)

        subloop = SubLoop(parent_loop_id="loop-parent", start_time=0, end_time=1)
        subloop_id = storage.create_subloop(subloop)

        success = storage.delete_subloop(subloop_id)
        assert success
        assert storage.get_subloop(subloop_id) is None


class TestLoopClassCRUD:
    """Tests for LoopClass CRUD operations."""

    def test_create_and_get_class(self, storage):
        """Test creating and retrieving a loop class."""
        lc = LoopClass(
            outcome_hash="outcome123",
            knowledge_id="know123",
            count=10
        )
        class_id = storage.create_class(lc)

        retrieved = storage.get_class(class_id)
        assert retrieved is not None
        assert retrieved.outcome_hash == "outcome123"
        assert retrieved.count == 10

    def test_get_class_by_equivalence(self, storage):
        """Test finding class by equivalence key."""
        lc = LoopClass(
            outcome_hash="outcome_xyz",
            knowledge_id="knowledge_xyz"
        )
        storage.create_class(lc)

        found = storage.get_class_by_equivalence("outcome_xyz", "knowledge_xyz")
        assert found is not None
        assert found.outcome_hash == "outcome_xyz"

        not_found = storage.get_class_by_equivalence("nonexistent", "nope")
        assert not_found is None

    def test_update_class(self, storage):
        """Test updating a class."""
        lc = LoopClass(outcome_hash="test", knowledge_id="test", count=1)
        class_id = storage.create_class(lc)

        storage.update_class(class_id, {'count': 100})

        updated = storage.get_class(class_id)
        assert updated.count == 100

    def test_delete_class(self, storage):
        """Test deleting a class."""
        lc = LoopClass(outcome_hash="test", knowledge_id="test")
        class_id = storage.create_class(lc)

        success = storage.delete_class(class_id)
        assert success
        assert storage.get_class(class_id) is None

    def test_get_all_classes(self, storage):
        """Test getting all classes."""
        for i in range(3):
            storage.create_class(LoopClass(
                outcome_hash=f"outcome{i}",
                knowledge_id=f"know{i}"
            ))

        classes = storage.get_all_classes()
        assert len(classes) == 3


class TestEquivalenceClassManagement:
    """Tests for equivalence class management."""

    def test_assign_loop_to_class(self, storage):
        """Test assigning a loop to a class."""
        loop = Loop()
        loop_id = storage.create_loop(loop)

        lc = LoopClass(outcome_hash="test", knowledge_id="test")
        class_id = storage.create_class(lc)

        success = storage.assign_loop_to_class(loop_id, class_id)
        assert success

        updated_loop = storage.get_loop(loop_id)
        assert updated_loop.class_id == class_id

    def test_get_or_create_class_new(self, storage):
        """Test get_or_create_class creating a new class."""
        loop = Loop(outcome_hash="unique1", knowledge_id="unique1")
        storage.create_loop(loop)

        lc = storage.get_or_create_class(loop)
        assert lc is not None
        assert lc.outcome_hash == "unique1"
        assert storage.count_classes() == 1

    def test_get_or_create_class_existing(self, storage):
        """Test get_or_create_class with existing class."""
        # Create first loop and class
        loop1 = Loop(outcome_hash="shared", knowledge_id="shared")
        storage.create_loop(loop1)
        lc1 = storage.get_or_create_class(loop1)

        # Create second loop with same equivalence
        loop2 = Loop(outcome_hash="shared", knowledge_id="shared")
        storage.create_loop(loop2)
        lc2 = storage.get_or_create_class(loop2)

        # Should be same class
        assert lc1.id == lc2.id
        assert storage.count_classes() == 1

        # Class should have updated count
        updated_class = storage.get_class(lc1.id)
        assert updated_class.count == 2

    def test_get_loops_by_class(self, storage):
        """Test getting loops by class."""
        # Create loops with same equivalence
        for _ in range(3):
            loop = Loop(outcome_hash="same", knowledge_id="same")
            storage.create_loop(loop)
            storage.get_or_create_class(loop)

        # Get all classes to find the one we created
        classes = storage.get_all_classes()
        assert len(classes) == 1

        loops = storage.get_loops_by_class(classes[0].id)
        assert len(loops) == 3


class TestStatistics:
    """Tests for storage statistics."""

    def test_get_statistics(self, storage):
        """Test getting storage statistics."""
        # Create some data
        for epoch in [EpochType.NAIVE, EpochType.NAIVE, EpochType.MAPPING]:
            loop = Loop(epoch=epoch, outcome_hash="same", knowledge_id="same")
            storage.create_loop(loop)
            storage.get_or_create_class(loop)

        stats = storage.get_statistics()
        assert stats['total_loops'] == 3
        assert stats['total_classes'] == 1
        assert stats['compression_ratio'] == 3.0
        assert stats['loops_by_epoch']['naive'] == 2
        assert stats['loops_by_epoch']['mapping'] == 1

    def test_clear_all(self, storage):
        """Test clearing all data."""
        # Create some data
        storage.create_loop(Loop())
        storage.create_class(LoopClass(outcome_hash="t", knowledge_id="t"))

        storage.clear_all()

        assert storage.count_loops() == 0
        assert storage.count_classes() == 0


class TestCreateStorage:
    """Tests for the create_storage convenience function."""

    def test_create_storage(self, temp_db):
        """Test creating storage with convenience function."""
        storage = create_storage(temp_db)
        assert storage is not None

        # Should be able to use immediately
        loop = Loop()
        loop_id = storage.create_loop(loop)
        assert storage.get_loop(loop_id) is not None
