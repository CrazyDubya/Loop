/**
 * LazyLoader - Lazy loading utilities for large datasets
 *
 * Provides pagination, streaming, and deferred loading patterns
 * for handling large collections of loops and graph data.
 */

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LazyIteratorOptions {
  batchSize?: number;
  prefetch?: boolean;
}

/**
 * Lazy collection that loads items on demand
 */
export class LazyCollection<T> {
  private cache: Map<number, T> = new Map();
  private totalCount?: number;

  constructor(
    private loader: (offset: number, limit: number) => T[],
    private counter: () => number
  ) {}

  /**
   * Get total count (cached after first call)
   */
  get count(): number {
    if (this.totalCount === undefined) {
      this.totalCount = this.counter();
    }
    return this.totalCount;
  }

  /**
   * Get a single item by index
   */
  get(index: number): T | undefined {
    if (this.cache.has(index)) {
      return this.cache.get(index);
    }

    // Load a batch around this index
    const batchStart = Math.floor(index / 100) * 100;
    const items = this.loader(batchStart, 100);

    for (let i = 0; i < items.length; i++) {
      this.cache.set(batchStart + i, items[i]);
    }

    return this.cache.get(index);
  }

  /**
   * Get a page of items
   */
  getPage(page: number, pageSize: number = 50): PagedResult<T> {
    const offset = page * pageSize;
    const items = this.loader(offset, pageSize);
    const totalItems = this.count;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Cache loaded items
    for (let i = 0; i < items.length; i++) {
      this.cache.set(offset + i, items[i]);
    }

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0,
    };
  }

  /**
   * Iterate over all items lazily
   */
  *iterate(batchSize: number = 100): Generator<T, void, unknown> {
    let offset = 0;
    const total = this.count;

    while (offset < total) {
      const items = this.loader(offset, batchSize);
      for (const item of items) {
        yield item;
      }
      offset += items.length;

      // Safety: break if no items returned
      if (items.length === 0) break;
    }
  }

  /**
   * Find first item matching predicate
   */
  find(predicate: (item: T) => boolean, batchSize: number = 100): T | undefined {
    for (const item of this.iterate(batchSize)) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Filter items lazily
   */
  *filter(predicate: (item: T) => boolean, batchSize: number = 100): Generator<T, void, unknown> {
    for (const item of this.iterate(batchSize)) {
      if (predicate(item)) {
        yield item;
      }
    }
  }

  /**
   * Map items lazily
   */
  *map<U>(mapper: (item: T) => U, batchSize: number = 100): Generator<U, void, unknown> {
    for (const item of this.iterate(batchSize)) {
      yield mapper(item);
    }
  }

  /**
   * Collect first N matching items
   */
  take(n: number, predicate?: (item: T) => boolean): T[] {
    const results: T[] = [];
    const iterator = predicate ? this.filter(predicate) : this.iterate();

    for (const item of iterator) {
      results.push(item);
      if (results.length >= n) break;
    }

    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.totalCount = undefined;
  }
}

/**
 * Deferred value that loads on first access
 */
export class Deferred<T> {
  private value?: T;
  private loaded = false;
  private loading?: Promise<T>;

  constructor(private loader: () => T | Promise<T>) {}

  /**
   * Get the value (loads if necessary)
   */
  async get(): Promise<T> {
    if (this.loaded) {
      return this.value!;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = Promise.resolve(this.loader()).then(value => {
      this.value = value;
      this.loaded = true;
      this.loading = undefined;
      return value;
    });

    return this.loading;
  }

  /**
   * Get synchronously (throws if not loaded)
   */
  getSync(): T {
    if (!this.loaded) {
      throw new Error('Deferred value not yet loaded');
    }
    return this.value!;
  }

  /**
   * Check if value is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Preload the value
   */
  preload(): Promise<void> {
    return this.get().then(() => {});
  }

  /**
   * Reset to unloaded state
   */
  reset(): void {
    this.value = undefined;
    this.loaded = false;
    this.loading = undefined;
  }
}

/**
 * Batch loader for efficient bulk loading
 */
export class BatchLoader<K, V> {
  private pending: Map<K, {
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }[]> = new Map();
  private scheduled = false;

  constructor(
    private loader: (keys: K[]) => Promise<Map<K, V>>,
    private options: { maxBatchSize?: number; delayMs?: number } = {}
  ) {}

  /**
   * Load a single value (batched with others)
   */
  load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      if (!this.pending.has(key)) {
        this.pending.set(key, []);
      }
      this.pending.get(key)!.push({ resolve, reject });

      this.scheduleBatch();
    });
  }

  /**
   * Load multiple values
   */
  async loadMany(keys: K[]): Promise<Map<K, V>> {
    const promises = keys.map(key =>
      this.load(key).then(value => [key, value] as [K, V])
    );
    const entries = await Promise.all(promises);
    return new Map(entries);
  }

  private scheduleBatch(): void {
    if (this.scheduled) return;
    this.scheduled = true;

    const delay = this.options.delayMs ?? 0;

    setTimeout(() => {
      this.executeBatch();
    }, delay);
  }

  private async executeBatch(): Promise<void> {
    this.scheduled = false;

    const pending = this.pending;
    this.pending = new Map();

    const keys = Array.from(pending.keys());
    const maxBatchSize = this.options.maxBatchSize ?? 100;

    // Process in chunks if too many keys
    for (let i = 0; i < keys.length; i += maxBatchSize) {
      const batchKeys = keys.slice(i, i + maxBatchSize);

      try {
        const results = await this.loader(batchKeys);

        for (const key of batchKeys) {
          const callbacks = pending.get(key)!;
          const value = results.get(key);

          if (value !== undefined) {
            for (const { resolve } of callbacks) {
              resolve(value);
            }
          } else {
            for (const { reject } of callbacks) {
              reject(new Error(`Key not found: ${key}`));
            }
          }
        }
      } catch (error) {
        for (const key of batchKeys) {
          const callbacks = pending.get(key)!;
          for (const { reject } of callbacks) {
            reject(error as Error);
          }
        }
      }
    }
  }

  /**
   * Clear pending requests
   */
  clear(): void {
    for (const callbacks of this.pending.values()) {
      for (const { reject } of callbacks) {
        reject(new Error('BatchLoader cleared'));
      }
    }
    this.pending.clear();
  }
}

/**
 * Streaming processor for large datasets
 */
export class StreamProcessor<T> {
  constructor(private source: Iterable<T> | AsyncIterable<T>) {}

  /**
   * Process items in chunks
   */
  async *chunks(size: number): AsyncGenerator<T[], void, unknown> {
    let chunk: T[] = [];

    for await (const item of this.source as AsyncIterable<T>) {
      chunk.push(item);
      if (chunk.length >= size) {
        yield chunk;
        chunk = [];
      }
    }

    if (chunk.length > 0) {
      yield chunk;
    }
  }

  /**
   * Process with backpressure
   */
  async processWithBackpressure(
    processor: (items: T[]) => Promise<void>,
    chunkSize: number = 100,
    maxConcurrent: number = 3
  ): Promise<void> {
    const inFlight: Promise<void>[] = [];

    for await (const chunk of this.chunks(chunkSize)) {
      // Wait if too many in flight
      while (inFlight.length >= maxConcurrent) {
        await Promise.race(inFlight);
        // Remove completed promises
        for (let i = inFlight.length - 1; i >= 0; i--) {
          // Check if resolved by trying to race with immediate
          const result = await Promise.race([
            inFlight[i].then(() => true),
            Promise.resolve(false),
          ]);
          if (result) {
            inFlight.splice(i, 1);
          }
        }
      }

      const promise = processor(chunk).finally(() => {
        const idx = inFlight.indexOf(promise);
        if (idx >= 0) inFlight.splice(idx, 1);
      });
      inFlight.push(promise);
    }

    // Wait for remaining
    await Promise.all(inFlight);
  }
}
