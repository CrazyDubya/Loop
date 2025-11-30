/**
 * Tests for LRU Cache implementation
 */

import { LRUCache, TieredCache, memoize } from '../../src/performance/Cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string>();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should return undefined for missing keys', () => {
      const cache = new LRUCache<string>();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check key existence', () => {
      const cache = new LRUCache<string>();
      cache.set('exists', 'value');

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = new LRUCache<string>();
      cache.set('key', 'value');

      expect(cache.delete('key')).toBe(true);
      expect(cache.has('key')).toBe(false);
      expect(cache.delete('missing')).toBe(false);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
    });

    it('should report size', () => {
      const cache = new LRUCache<string>();
      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });

    it('should list keys', () => {
      const cache = new LRUCache<string>();
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      const keys = cache.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      const cache = new LRUCache<string>({ maxSize: 3 });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // Should evict 'a'

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should update LRU order on get', () => {
      const cache = new LRUCache<string>({ maxSize: 3 });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it recently used
      cache.get('a');

      cache.set('d', '4'); // Should evict 'b' (now LRU)

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should update LRU order on set of existing key', () => {
      const cache = new LRUCache<string>({ maxSize: 3 });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Update 'a' to make it recently used
      cache.set('a', 'updated');

      cache.set('d', '4'); // Should evict 'b'

      expect(cache.has('a')).toBe(true);
      expect(cache.get('a')).toBe('updated');
      expect(cache.has('b')).toBe(false);
    });

    it('should call onEvict callback', () => {
      const evicted: Array<{ key: string; value: string }> = [];
      const cache = new LRUCache<string>({
        maxSize: 2,
        onEvict: (key, value) => evicted.push({ key, value: value as string }),
      });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3'); // Evicts 'a'

      expect(evicted).toHaveLength(1);
      expect(evicted[0]).toEqual({ key: 'a', value: '1' });
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<string>({ ttlMs: 50 });

      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.get('key')).toBeUndefined();
    });

    it('should not return expired entries via has()', async () => {
      const cache = new LRUCache<string>({ ttlMs: 50 });

      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.has('key')).toBe(false);
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value if present', () => {
      const cache = new LRUCache<number>();
      cache.set('key', 42);

      let computed = false;
      const result = cache.getOrCompute('key', () => {
        computed = true;
        return 100;
      });

      expect(result).toBe(42);
      expect(computed).toBe(false);
    });

    it('should compute and cache if missing', () => {
      const cache = new LRUCache<number>();

      const result = cache.getOrCompute('key', () => 42);

      expect(result).toBe(42);
      expect(cache.get('key')).toBe(42);
    });
  });

  describe('getOrComputeAsync', () => {
    it('should return cached value if present', async () => {
      const cache = new LRUCache<number>();
      cache.set('key', 42);

      let computed = false;
      const result = await cache.getOrComputeAsync('key', async () => {
        computed = true;
        return 100;
      });

      expect(result).toBe(42);
      expect(computed).toBe(false);
    });

    it('should compute and cache if missing', async () => {
      const cache = new LRUCache<number>();

      const result = await cache.getOrComputeAsync('key', async () => 42);

      expect(result).toBe(42);
      expect(cache.get('key')).toBe(42);
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      const cache = new LRUCache<string>();
      cache.set('key', 'value');

      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track evictions', () => {
      const cache = new LRUCache<string>({ maxSize: 2 });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3'); // eviction
      cache.set('d', '4'); // eviction

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it('should report size and maxSize', () => {
      const cache = new LRUCache<string>({ maxSize: 100 });
      cache.set('a', '1');
      cache.set('b', '2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });
});

describe('TieredCache', () => {
  it('should store in both levels', () => {
    const cache = new TieredCache<string>();
    cache.set('key', 'value');

    expect(cache.has('key')).toBe(true);
  });

  it('should check both levels', () => {
    const cache = new TieredCache<string>();
    expect(cache.has('missing')).toBe(false);
  });

  it('should promote L2 hits to L1', () => {
    const cache = new TieredCache<string>(
      { maxSize: 2 },
      { maxSize: 10 }
    );

    // Fill L1 to capacity
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // 'a' evicted from L1, still in L2

    // Access 'a' - should come from L2 and be promoted to L1
    const value = cache.get('a');
    expect(value).toBe('1');
  });

  it('should delete from both levels', () => {
    const cache = new TieredCache<string>();
    cache.set('key', 'value');
    cache.delete('key');

    expect(cache.has('key')).toBe(false);
  });

  it('should clear both levels', () => {
    const cache = new TieredCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
  });

  it('should report stats for both levels', () => {
    const cache = new TieredCache<string>();
    cache.set('key', 'value');
    cache.get('key');

    const stats = cache.getStats();
    expect(stats.l1).toBeDefined();
    expect(stats.l2).toBeDefined();
    expect(stats.l1.hits).toBe(1);
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it('should use different cache keys for different args', () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(10)).toBe(20);
    expect(callCount).toBe(2);
  });

  it('should expose cache for inspection', () => {
    const fn = memoize((x: number) => x * 2);
    fn(5);

    expect(fn.cache.size).toBe(1);
  });

  it('should allow cache clearing', () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    fn(5);
    fn.clearCache();
    fn(5);

    expect(callCount).toBe(2);
  });

  it('should use custom key function', () => {
    const fn = memoize(
      (obj: { id: number; name: string }) => obj.id * 10,
      { keyFn: (obj) => String(obj.id) }
    );

    expect(fn({ id: 5, name: 'a' })).toBe(50);
    expect(fn({ id: 5, name: 'b' })).toBe(50); // Same key, cached
  });
});
