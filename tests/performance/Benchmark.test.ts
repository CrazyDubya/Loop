/**
 * Tests for benchmarking utilities
 */

import {
  benchmark,
  benchmarkSuite,
  formatBenchmarkResults,
  compareBenchmarks,
  timeOperation,
  timeAsyncOperation,
} from '../../src/performance/Benchmark';

describe('benchmark', () => {
  it('should measure function execution time', async () => {
    const result = await benchmark('simple', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
    }, { iterations: 10, warmupIterations: 2 });

    expect(result.name).toBe('simple');
    expect(result.iterations).toBe(10);
    expect(result.totalMs).toBeGreaterThan(0);
    expect(result.avgMs).toBeGreaterThan(0);
    expect(result.minMs).toBeLessThanOrEqual(result.avgMs);
    expect(result.maxMs).toBeGreaterThanOrEqual(result.avgMs);
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  it('should handle async functions', async () => {
    const result = await benchmark('async', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    }, { iterations: 3, warmupIterations: 1 });

    expect(result.avgMs).toBeGreaterThanOrEqual(5);
  });

  it('should use default options', async () => {
    const result = await benchmark('default', () => {});

    expect(result.iterations).toBe(100); // Default
  });
});

describe('benchmarkSuite', () => {
  it('should run multiple benchmarks', async () => {
    const suite = await benchmarkSuite('test suite', [
      { name: 'fast', fn: () => {} },
      { name: 'slow', fn: () => { for (let i = 0; i < 10000; i++); } },
    ], { iterations: 10, warmupIterations: 2 });

    expect(suite.name).toBe('test suite');
    expect(suite.results).toHaveLength(2);
    expect(suite.results[0].name).toBe('fast');
    expect(suite.results[1].name).toBe('slow');
    expect(suite.totalMs).toBeGreaterThan(0);
    expect(suite.timestamp).toBeDefined();
  });
});

describe('formatBenchmarkResults', () => {
  it('should format results as table', async () => {
    const suite = await benchmarkSuite('format test', [
      { name: 'benchmark1', fn: () => {} },
      { name: 'benchmark2', fn: () => {} },
    ], { iterations: 5, warmupIterations: 1 });

    const formatted = formatBenchmarkResults(suite);

    expect(formatted).toContain('format test');
    expect(formatted).toContain('Timestamp');
    expect(formatted).toContain('Total time');
    expect(formatted).toContain('Benchmark');
    expect(formatted).toContain('Avg (ms)');
    expect(formatted).toContain('benchmark1');
    expect(formatted).toContain('benchmark2');
  });
});

describe('compareBenchmarks', () => {
  it('should detect improvement', () => {
    const baseline = { name: 'test', iterations: 10, totalMs: 100, avgMs: 10, minMs: 8, maxMs: 12, opsPerSecond: 100 };
    const current = { name: 'test', iterations: 10, totalMs: 50, avgMs: 5, minMs: 4, maxMs: 6, opsPerSecond: 200 };

    const comparison = compareBenchmarks(baseline, current);

    expect(comparison.improved).toBe(true);
    expect(comparison.speedup).toBe(2);
    expect(comparison.percentChange).toBe(50);
  });

  it('should detect regression', () => {
    const baseline = { name: 'test', iterations: 10, totalMs: 50, avgMs: 5, minMs: 4, maxMs: 6, opsPerSecond: 200 };
    const current = { name: 'test', iterations: 10, totalMs: 100, avgMs: 10, minMs: 8, maxMs: 12, opsPerSecond: 100 };

    const comparison = compareBenchmarks(baseline, current);

    expect(comparison.improved).toBe(false);
    expect(comparison.speedup).toBe(0.5);
    expect(comparison.percentChange).toBe(-100);
  });
});

describe('timeOperation', () => {
  it('should time synchronous operation', () => {
    const { result, durationMs } = timeOperation('test', () => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += i;
      return sum;
    });

    expect(result).toBe(49995000);
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('timeAsyncOperation', () => {
  it('should time async operation', async () => {
    const { result, durationMs } = await timeAsyncOperation('test', async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return 'done';
    });

    expect(result).toBe('done');
    // Allow some tolerance for timer imprecision
    expect(durationMs).toBeGreaterThanOrEqual(15);
  });
});
