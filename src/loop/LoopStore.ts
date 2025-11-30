/**
 * LoopStore: Interface for loop persistence
 */

import {
  Loop,
  EquivalenceClass,
  LoopQuery,
  LoopQueryResult,
  LoopStatus,
  OutcomeType,
  OperatorType,
} from './types';

/**
 * Abstract interface for loop storage
 * Implementations can be in-memory, SQLite, PostgreSQL, etc.
 */
export interface LoopStore {
  // ============================================
  // Loop CRUD
  // ============================================

  /**
   * Save a loop (insert or update)
   */
  saveLoop(loop: Loop): Promise<void>;

  /**
   * Get a loop by ID
   */
  getLoop(id: string): Promise<Loop | null>;

  /**
   * Delete a loop by ID
   */
  deleteLoop(id: string): Promise<boolean>;

  /**
   * Check if a loop exists
   */
  hasLoop(id: string): Promise<boolean>;

  /**
   * Get total loop count
   */
  getLoopCount(): Promise<number>;

  /**
   * Get all loops (use with caution for large datasets)
   */
  getAllLoops(): Promise<Loop[]>;

  // ============================================
  // Loop Queries
  // ============================================

  /**
   * Query loops with filters
   */
  queryLoops(query: LoopQuery): Promise<LoopQueryResult>;

  /**
   * Get loops by epoch
   */
  getLoopsByEpoch(epochId: string): Promise<Loop[]>;

  /**
   * Get loops by status
   */
  getLoopsByStatus(status: LoopStatus): Promise<Loop[]>;

  /**
   * Get loops by outcome type
   */
  getLoopsByOutcomeType(outcomeType: OutcomeType): Promise<Loop[]>;

  /**
   * Get loops by tag (any loop with this tag)
   */
  getLoopsByTag(tag: string): Promise<Loop[]>;

  /**
   * Get loops by tags (loops with ALL specified tags)
   */
  getLoopsByTags(tags: string[], match: 'all' | 'any'): Promise<Loop[]>;

  /**
   * Get loops by operator used
   */
  getLoopsByOperator(operator: OperatorType): Promise<Loop[]>;

  /**
   * Get anchor loops only
   */
  getAnchorLoops(): Promise<Loop[]>;

  /**
   * Get loops in an equivalence class
   */
  getLoopsInEquivalenceClass(classId: string): Promise<Loop[]>;

  /**
   * Get loop ancestry (parent chain)
   */
  getLoopAncestry(loopId: string): Promise<Loop[]>;

  /**
   * Get loop descendants (children, recursively)
   */
  getLoopDescendants(loopId: string): Promise<Loop[]>;

  /**
   * Get next sequence number
   */
  getNextSequenceNumber(): Promise<number>;

  // ============================================
  // Equivalence Class CRUD
  // ============================================

  /**
   * Save an equivalence class
   */
  saveEquivalenceClass(ec: EquivalenceClass): Promise<void>;

  /**
   * Get an equivalence class by ID
   */
  getEquivalenceClass(id: string): Promise<EquivalenceClass | null>;

  /**
   * Get equivalence class by composite hash
   */
  getEquivalenceClassByHash(compositeHash: string): Promise<EquivalenceClass | null>;

  /**
   * Delete an equivalence class
   */
  deleteEquivalenceClass(id: string): Promise<boolean>;

  /**
   * Get all equivalence classes
   */
  getAllEquivalenceClasses(): Promise<EquivalenceClass[]>;

  /**
   * Get equivalence class count
   */
  getEquivalenceClassCount(): Promise<number>;

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Save multiple loops in a batch
   */
  saveLoopsBatch(loops: Loop[]): Promise<void>;

  /**
   * Clear all data (use with caution!)
   */
  clear(): Promise<void>;

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get loop statistics
   */
  getStatistics(): Promise<LoopStoreStatistics>;
}

export interface LoopStoreStatistics {
  totalLoops: number;
  loopsByStatus: Record<LoopStatus, number>;
  loopsByEpoch: Record<string, number>;
  loopsByOutcomeType: Record<OutcomeType, number>;
  anchorLoopCount: number;
  equivalenceClassCount: number;
  averageLoopsPerClass: number;
}
