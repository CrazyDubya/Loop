/**
 * Performance Module - Scaling and optimization utilities
 *
 * This module provides tools for:
 * - Benchmarking and performance measurement
 * - LRU caching for expensive computations
 * - Lazy loading for large datasets
 * - Honest capacity documentation
 */

// Benchmarking
export {
  benchmark,
  benchmarkSuite,
  formatBenchmarkResults,
  compareBenchmarks,
  timeOperation,
  timeAsyncOperation,
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkOptions,
} from './Benchmark';

// Caching
export {
  LRUCache,
  TieredCache,
  memoize,
  CacheStats,
  CacheEntry,
  CacheOptions,
} from './Cache';

// Lazy Loading
export {
  LazyCollection,
  Deferred,
  BatchLoader,
  StreamProcessor,
  PagedResult,
  LazyIteratorOptions,
} from './LazyLoader';

// Capacity Limits
export {
  SMALL_PROJECT,
  MEDIUM_PROJECT,
  LARGE_PROJECT,
  KNOWN_LIMITATIONS,
  getCapacityProfile,
  checkCapacity,
  formatCapacityReport,
  CapacityProfile,
  CapacityLimits,
} from './CapacityLimits';
