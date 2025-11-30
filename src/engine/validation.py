"""
Validation and Integrity Checks for Loop Engine.

This module provides validation functions for:
- Loop objects
- SubLoop objects
- LoopClass objects
- Parent chain integrity
- Epoch ordering
"""

from __future__ import annotations

from typing import List, Optional, TYPE_CHECKING

from src.models import (
    Loop,
    SubLoop,
    LoopClass,
    EpochType,
    LoopID,
)

if TYPE_CHECKING:
    from src.engine.storage import LoopStorage


class ValidationError(Exception):
    """Raised when validation fails."""

    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(f"{field}: {message}" if field else message)


# === Epoch Ordering ===

EPOCH_ORDER = [
    EpochType.NAIVE,
    EpochType.MAPPING,
    EpochType.OBSESSION,
    EpochType.RUTHLESS,
    EpochType.SYNTHESIS,
]


def epoch_index(epoch: EpochType) -> int:
    """Get the ordinal index of an epoch."""
    return EPOCH_ORDER.index(epoch)


def is_valid_epoch_progression(from_epoch: EpochType, to_epoch: EpochType) -> bool:
    """
    Check if epoch progression is valid.

    Normally epochs progress forward, but regression is allowed
    (e.g., from RUTHLESS back to NAIVE after a breakthrough).
    """
    # All progressions are technically valid for narrative flexibility
    return True


def is_forward_progression(from_epoch: EpochType, to_epoch: EpochType) -> bool:
    """Check if this is forward epoch progression."""
    return epoch_index(to_epoch) >= epoch_index(from_epoch)


# === Loop Validation ===

def validate_loop(loop: Loop, storage: Optional['LoopStorage'] = None) -> List[str]:
    """
    Validate a Loop object.

    Args:
        loop: The loop to validate
        storage: Optional storage for reference checks

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    # Required fields
    if not loop.id:
        errors.append("Loop must have an ID")

    if not loop.id.startswith("loop-"):
        errors.append("Loop ID must start with 'loop-'")

    # Epoch validation
    if not isinstance(loop.epoch, EpochType):
        errors.append(f"Invalid epoch type: {loop.epoch}")

    # Key choices should be non-negative
    if loop.key_choices < 0:
        errors.append("key_choices must be non-negative")

    # Tags should be a list
    if not isinstance(loop.tags, list):
        errors.append("tags must be a list")

    # Decision trace should be a list
    if not isinstance(loop.decision_trace, list):
        errors.append("decision_trace must be a list")

    # Parent reference check
    if loop.parent_id and storage:
        parent = storage.get_loop(loop.parent_id)
        if not parent:
            errors.append(f"Parent loop not found: {loop.parent_id}")

    # Self-reference check
    if loop.parent_id == loop.id:
        errors.append("Loop cannot be its own parent")

    return errors


def validate_subloop(subloop: SubLoop, storage: Optional['LoopStorage'] = None) -> List[str]:
    """
    Validate a SubLoop object.

    Args:
        subloop: The sub-loop to validate
        storage: Optional storage for reference checks

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    # Required fields
    if not subloop.id:
        errors.append("SubLoop must have an ID")

    if not subloop.parent_loop_id:
        errors.append("SubLoop must have a parent_loop_id")

    # Time window validation
    if subloop.start_time < 0:
        errors.append("start_time must be non-negative")

    if subloop.end_time <= subloop.start_time:
        errors.append("end_time must be greater than start_time")

    # Attempts count
    if subloop.attempts_count < 1:
        errors.append("attempts_count must be at least 1")

    # Parent reference check
    if storage and subloop.parent_loop_id:
        parent = storage.get_loop(subloop.parent_loop_id)
        if not parent:
            errors.append(f"Parent loop not found: {subloop.parent_loop_id}")

    return errors


def validate_loop_class(loop_class: LoopClass, storage: Optional['LoopStorage'] = None) -> List[str]:
    """
    Validate a LoopClass object.

    Args:
        loop_class: The class to validate
        storage: Optional storage for reference checks

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    # Required fields
    if not loop_class.id:
        errors.append("LoopClass must have an ID")

    if not loop_class.outcome_hash:
        errors.append("LoopClass must have an outcome_hash")

    # Count validation
    if loop_class.count < 1:
        errors.append("count must be at least 1")

    # Sample count shouldn't exceed total count
    if len(loop_class.sample_ids) > loop_class.count:
        errors.append("sample_ids count exceeds total count")

    # Representative should be in samples
    if loop_class.representative_id and loop_class.sample_ids:
        if loop_class.representative_id not in loop_class.sample_ids:
            errors.append("representative_id should be in sample_ids")

    # Reference checks
    if storage:
        for sample_id in loop_class.sample_ids:
            loop = storage.get_loop(sample_id)
            if not loop:
                errors.append(f"Sample loop not found: {sample_id}")

    return errors


def validate_parent_chain(
    loop_id: LoopID,
    storage: 'LoopStorage',
    max_depth: int = 10000
) -> List[str]:
    """
    Validate the parent chain of a loop.

    Checks for:
    - Circular references
    - Missing parents
    - Reasonable chain length

    Args:
        loop_id: Starting loop ID
        storage: Storage to lookup loops
        max_depth: Maximum chain depth before error

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []
    visited = set()
    current_id = loop_id
    depth = 0

    while current_id:
        # Check for circular reference
        if current_id in visited:
            errors.append(f"Circular reference detected at loop: {current_id}")
            break

        visited.add(current_id)
        depth += 1

        # Check for excessive depth
        if depth > max_depth:
            errors.append(f"Parent chain exceeds maximum depth of {max_depth}")
            break

        # Get the loop
        loop = storage.get_loop(current_id)
        if not loop:
            errors.append(f"Loop not found in chain: {current_id}")
            break

        current_id = loop.parent_id

    return errors


def validate_epoch_ordering(
    loop_id: LoopID,
    storage: 'LoopStorage'
) -> List[str]:
    """
    Validate that epoch progression in the parent chain makes sense.

    Note: This is advisory, not strict - epochs can regress.

    Args:
        loop_id: Starting loop ID
        storage: Storage to lookup loops

    Returns:
        List of warning messages about unusual epoch progressions
    """
    warnings = []
    lineage = storage.get_loop_lineage(loop_id)

    if len(lineage) < 2:
        return warnings

    for i in range(1, len(lineage)):
        prev_loop = lineage[i - 1]
        curr_loop = lineage[i]

        if not is_forward_progression(prev_loop.epoch, curr_loop.epoch):
            warnings.append(
                f"Epoch regression: {prev_loop.epoch.value} -> {curr_loop.epoch.value} "
                f"at loop {curr_loop.id}"
            )

    return warnings


# === Integrity Checks ===

def check_storage_integrity(storage: 'LoopStorage') -> dict:
    """
    Run comprehensive integrity checks on storage.

    Returns:
        Dict with 'errors' and 'warnings' lists
    """
    errors = []
    warnings = []

    # Check all loops
    all_loops = storage.get_all_loops(limit=100000)
    for loop in all_loops:
        loop_errors = validate_loop(loop, storage)
        errors.extend([f"Loop {loop.id}: {e}" for e in loop_errors])

        # Check parent chain
        chain_errors = validate_parent_chain(loop.id, storage)
        errors.extend([f"Loop {loop.id}: {e}" for e in chain_errors])

    # Check all classes
    all_classes = storage.get_all_classes()
    for loop_class in all_classes:
        class_errors = validate_loop_class(loop_class, storage)
        errors.extend([f"Class {loop_class.id}: {e}" for e in class_errors])

    # Check orphaned class assignments
    for loop in all_loops:
        if loop.class_id:
            loop_class = storage.get_class(loop.class_id)
            if not loop_class:
                errors.append(f"Loop {loop.id} references missing class {loop.class_id}")

    return {
        'errors': errors,
        'warnings': warnings,
        'loops_checked': len(all_loops),
        'classes_checked': len(all_classes)
    }
