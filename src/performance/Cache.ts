/**
 * Cache - LRU Cache implementation for performance optimization
 *
 * Used for caching expensive computations like:
 * - Equivalence class lookups
 * - Path finding results
 * - Hash computations
 */

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  onEvict?: (key: string, value: unknown) => void;
}

const DEFAULT_OPTIONS: CacheOptions = {
  maxSize: 1000,
  ttlMs: 0, // 0 means no expiration
};

/**
 * LRU (Least Recently Used) Cache
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private onEvict?: (key: string, value: T) => void;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.maxSize = opts.maxSize!;
    this.ttlMs = opts.ttlMs!;
    this.onEvict = opts.onEvict as (key: string, value: T) => void;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (this.ttlMs > 0) {
      const age = Date.now() - entry.createdAt;
      if (age > this.ttlMs) {
        this.delete(key);
        this.misses++;
        return undefined;
      }
    }

    // Update access info and move to end (most recently used)
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    // Re-insert to update order
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;

      // Move to end
      this.cache.delete(key);
      this.cache.set(key, entry);
      return;
    }

    // Evict if necessary
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
    });
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    if (!this.cache.has(key)) {
      return false;
    }

    // Check TTL
    if (this.ttlMs > 0) {
      const entry = this.cache.get(key)!;
      const age = Date.now() - entry.createdAt;
      if (age > this.ttlMs) {
        this.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache) {
        this.onEvict(key, entry.value);
      }
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute a value
   */
  getOrCompute(key: string, compute: () => T): T {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = compute();
    this.set(key, value);
    return value;
  }

  /**
   * Get or compute a value (async)
   */
  async getOrComputeAsync(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value);
    return value;
  }

  private evictLRU(): void {
    // Map maintains insertion order, first entry is LRU
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.cache.get(firstKey);
      if (entry && this.onEvict) {
        this.onEvict(firstKey, entry.value);
      }
      this.cache.delete(firstKey);
      this.evictions++;
    }
  }
}

/**
 * Memoization decorator for functions
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: CacheOptions & { keyFn?: (...args: Parameters<T>) => string } = {}
): T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void } {
  const cache = new LRUCache<ReturnType<T>>(options);
  const keyFn = options.keyFn ?? ((...args) => JSON.stringify(args));

  const memoized = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyFn(...args);
    return cache.getOrCompute(key, () => fn.apply(this, args));
  } as T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void };

  memoized.cache = cache;
  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Multi-level cache (L1 small+fast, L2 large+slow)
 */
export class TieredCache<T> {
  private l1: LRUCache<T>;
  private l2: LRUCache<T>;

  constructor(l1Options: CacheOptions = {}, l2Options: CacheOptions = {}) {
    this.l1 = new LRUCache<T>({
      maxSize: 100,
      ...l1Options,
    });
    this.l2 = new LRUCache<T>({
      maxSize: 1000,
      ...l2Options,
    });
  }

  get(key: string): T | undefined {
    // Try L1 first
    let value = this.l1.get(key);
    if (value !== undefined) {
      return value;
    }

    // Try L2
    value = this.l2.get(key);
    if (value !== undefined) {
      // Promote to L1
      this.l1.set(key, value);
      return value;
    }

    return undefined;
  }

  set(key: string, value: T): void {
    this.l1.set(key, value);
    this.l2.set(key, value);
  }

  has(key: string): boolean {
    return this.l1.has(key) || this.l2.has(key);
  }

  delete(key: string): boolean {
    const l1Deleted = this.l1.delete(key);
    const l2Deleted = this.l2.delete(key);
    return l1Deleted || l2Deleted;
  }

  clear(): void {
    this.l1.clear();
    this.l2.clear();
  }

  getStats(): { l1: CacheStats; l2: CacheStats } {
    return {
      l1: this.l1.getStats(),
      l2: this.l2.getStats(),
    };
  }
}
