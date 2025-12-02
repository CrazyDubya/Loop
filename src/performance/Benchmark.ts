/**
 * Benchmark - Performance measurement utilities
 *
 * Tools for measuring and reporting on system performance
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  opsPerSecond: number;
  memoryUsedMB?: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalMs: number;
  timestamp: string;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  measureMemory?: boolean;
}

const DEFAULT_OPTIONS: BenchmarkOptions = {
  iterations: 100,
  warmupIterations: 10,
  measureMemory: false,
};

/**
 * Run a single benchmark
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const times: number[] = [];

  // Warmup runs (not measured)
  for (let i = 0; i < opts.warmupIterations!; i++) {
    await fn();
  }

  // Force GC if available before measuring
  if (global.gc) {
    global.gc();
  }

  const memBefore = opts.measureMemory ? process.memoryUsage().heapUsed : 0;

  // Measured runs
  for (let i = 0; i < opts.iterations!; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const memAfter = opts.measureMemory ? process.memoryUsage().heapUsed : 0;

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const opsPerSecond = 1000 / avgMs;

  return {
    name,
    iterations: opts.iterations!,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    opsPerSecond,
    memoryUsedMB: opts.measureMemory
      ? (memAfter - memBefore) / (1024 * 1024)
      : undefined,
  };
}

/**
 * Run a suite of benchmarks
 */
export async function benchmarkSuite(
  name: string,
  benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkSuite> {
  const suiteStart = performance.now();
  const results: BenchmarkResult[] = [];

  for (const bench of benchmarks) {
    const result = await benchmark(bench.name, bench.fn, options);
    results.push(result);
  }

  const suiteEnd = performance.now();

  return {
    name,
    results,
    totalMs: suiteEnd - suiteStart,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format benchmark results as a table
 */
export function formatBenchmarkResults(suite: BenchmarkSuite): string {
  const lines: string[] = [];

  lines.push(`\n=== ${suite.name} ===`);
  lines.push(`Timestamp: ${suite.timestamp}`);
  lines.push(`Total time: ${suite.totalMs.toFixed(2)}ms\n`);

  // Header
  lines.push(
    'Benchmark'.padEnd(40) +
    'Avg (ms)'.padStart(12) +
    'Min (ms)'.padStart(12) +
    'Max (ms)'.padStart(12) +
    'Ops/sec'.padStart(12)
  );
  lines.push('-'.repeat(88));

  // Results
  for (const result of suite.results) {
    lines.push(
      result.name.padEnd(40) +
      result.avgMs.toFixed(3).padStart(12) +
      result.minMs.toFixed(3).padStart(12) +
      result.maxMs.toFixed(3).padStart(12) +
      result.opsPerSecond.toFixed(1).padStart(12)
    );
  }

  return lines.join('\n');
}

/**
 * Compare two benchmark results
 */
export function compareBenchmarks(
  baseline: BenchmarkResult,
  current: BenchmarkResult
): {
  speedup: number;
  percentChange: number;
  improved: boolean;
} {
  const speedup = baseline.avgMs / current.avgMs;
  const percentChange = ((baseline.avgMs - current.avgMs) / baseline.avgMs) * 100;

  return {
    speedup,
    percentChange,
    improved: current.avgMs < baseline.avgMs,
  };
}

/**
 * Time a single operation (for quick measurements)
 */
export function timeOperation<T>(
  name: string,
  fn: () => T
): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  return {
    result,
    durationMs: end - start,
  };
}

/**
 * Time an async operation
 */
export async function timeAsyncOperation<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    result,
    durationMs: end - start,
  };
}
