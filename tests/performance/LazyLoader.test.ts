/**
 * Tests for lazy loading utilities
 */

import {
  LazyCollection,
  Deferred,
  BatchLoader,
  StreamProcessor,
} from '../../src/performance/LazyLoader';

describe('LazyCollection', () => {
  describe('basic operations', () => {
    it('should get items by index', () => {
      const data = ['a', 'b', 'c', 'd', 'e'];
      const collection = new LazyCollection<string>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      expect(collection.get(0)).toBe('a');
      expect(collection.get(2)).toBe('c');
      expect(collection.get(4)).toBe('e');
    });

    it('should return count', () => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      expect(collection.count).toBe(100);
    });

    it('should cache count after first access', () => {
      let countCalls = 0;
      const collection = new LazyCollection<number>(
        (offset, limit) => [1, 2, 3].slice(offset, offset + limit),
        () => {
          countCalls++;
          return 3;
        }
      );

      collection.count;
      collection.count;
      collection.count;

      expect(countCalls).toBe(1);
    });
  });

  describe('pagination', () => {
    it('should return paged results', () => {
      const data = Array.from({ length: 25 }, (_, i) => i);
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const page = collection.getPage(0, 10);

      expect(page.items).toHaveLength(10);
      expect(page.page).toBe(0);
      expect(page.pageSize).toBe(10);
      expect(page.totalItems).toBe(25);
      expect(page.totalPages).toBe(3);
      expect(page.hasNext).toBe(true);
      expect(page.hasPrev).toBe(false);
    });

    it('should handle last page correctly', () => {
      const data = Array.from({ length: 25 }, (_, i) => i);
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const page = collection.getPage(2, 10);

      expect(page.items).toHaveLength(5); // Last 5 items
      expect(page.hasNext).toBe(false);
      expect(page.hasPrev).toBe(true);
    });
  });

  describe('iteration', () => {
    it('should iterate over all items', () => {
      const data = [1, 2, 3, 4, 5];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const result = [...collection.iterate(2)];
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should find first matching item', () => {
      const data = [1, 2, 3, 4, 5];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const found = collection.find(x => x > 3);
      expect(found).toBe(4);
    });

    it('should return undefined if not found', () => {
      const data = [1, 2, 3];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const found = collection.find(x => x > 10);
      expect(found).toBeUndefined();
    });

    it('should filter items lazily', () => {
      const data = [1, 2, 3, 4, 5, 6];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const evens = [...collection.filter(x => x % 2 === 0)];
      expect(evens).toEqual([2, 4, 6]);
    });

    it('should map items lazily', () => {
      const data = [1, 2, 3];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const doubled = [...collection.map(x => x * 2)];
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('should take first N items', () => {
      const data = [1, 2, 3, 4, 5];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const first3 = collection.take(3);
      expect(first3).toEqual([1, 2, 3]);
    });

    it('should take first N matching items', () => {
      const data = [1, 2, 3, 4, 5, 6];
      const collection = new LazyCollection<number>(
        (offset, limit) => data.slice(offset, offset + limit),
        () => data.length
      );

      const first2Evens = collection.take(2, x => x % 2 === 0);
      expect(first2Evens).toEqual([2, 4]);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      let loadCount = 0;
      const data = [1, 2, 3];
      const collection = new LazyCollection<number>(
        (offset, limit) => {
          loadCount++;
          return data.slice(offset, offset + limit);
        },
        () => data.length
      );

      collection.get(0);
      collection.get(0); // cached

      collection.clearCache();

      collection.get(0); // reloaded

      expect(loadCount).toBe(2);
    });
  });
});

describe('Deferred', () => {
  describe('loading', () => {
    it('should load value on first access', async () => {
      let loaded = false;
      const deferred = new Deferred(() => {
        loaded = true;
        return 42;
      });

      expect(loaded).toBe(false);
      const value = await deferred.get();
      expect(value).toBe(42);
      expect(loaded).toBe(true);
    });

    it('should cache value after loading', async () => {
      let loadCount = 0;
      const deferred = new Deferred(() => {
        loadCount++;
        return 42;
      });

      await deferred.get();
      await deferred.get();
      await deferred.get();

      expect(loadCount).toBe(1);
    });

    it('should handle async loaders', async () => {
      const deferred = new Deferred(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'loaded';
      });

      const value = await deferred.get();
      expect(value).toBe('loaded');
    });

    it('should deduplicate concurrent loads', async () => {
      let loadCount = 0;
      const deferred = new Deferred(async () => {
        loadCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return 42;
      });

      const [a, b, c] = await Promise.all([
        deferred.get(),
        deferred.get(),
        deferred.get(),
      ]);

      expect(a).toBe(42);
      expect(b).toBe(42);
      expect(c).toBe(42);
      expect(loadCount).toBe(1);
    });
  });

  describe('sync access', () => {
    it('should throw if not loaded', () => {
      const deferred = new Deferred(() => 42);
      expect(() => deferred.getSync()).toThrow('not yet loaded');
    });

    it('should return value if loaded', async () => {
      const deferred = new Deferred(() => 42);
      await deferred.get();
      expect(deferred.getSync()).toBe(42);
    });
  });

  describe('state checks', () => {
    it('should report loaded state', async () => {
      const deferred = new Deferred(() => 42);

      expect(deferred.isLoaded()).toBe(false);
      await deferred.get();
      expect(deferred.isLoaded()).toBe(true);
    });

    it('should preload without returning value', async () => {
      const deferred = new Deferred(() => 42);

      await deferred.preload();
      expect(deferred.isLoaded()).toBe(true);
    });

    it('should reset to unloaded state', async () => {
      const deferred = new Deferred(() => 42);

      await deferred.get();
      expect(deferred.isLoaded()).toBe(true);

      deferred.reset();
      expect(deferred.isLoaded()).toBe(false);
    });
  });
});

describe('BatchLoader', () => {
  describe('batching', () => {
    it('should batch concurrent loads', async () => {
      let batchCount = 0;
      const loader = new BatchLoader<string, number>(
        async (keys) => {
          batchCount++;
          return new Map(keys.map(k => [k, parseInt(k, 10)]));
        },
        { delayMs: 10 }
      );

      const [a, b, c] = await Promise.all([
        loader.load('1'),
        loader.load('2'),
        loader.load('3'),
      ]);

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
      expect(batchCount).toBe(1);
    });

    it('should load many keys at once', async () => {
      const loader = new BatchLoader<string, number>(
        async (keys) => new Map(keys.map(k => [k, parseInt(k, 10)])),
        { delayMs: 0 }
      );

      const results = await loader.loadMany(['1', '2', '3']);

      expect(results.get('1')).toBe(1);
      expect(results.get('2')).toBe(2);
      expect(results.get('3')).toBe(3);
    });

    it('should respect max batch size', async () => {
      const batches: string[][] = [];
      const loader = new BatchLoader<string, number>(
        async (keys) => {
          batches.push([...keys]);
          return new Map(keys.map(k => [k, parseInt(k, 10)]));
        },
        { maxBatchSize: 2, delayMs: 0 }
      );

      await loader.loadMany(['1', '2', '3', '4', '5']);

      expect(batches.length).toBeGreaterThan(1);
      expect(batches.every(b => b.length <= 2)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should reject missing keys', async () => {
      const loader = new BatchLoader<string, number>(
        async () => new Map(), // Returns nothing
        { delayMs: 0 }
      );

      await expect(loader.load('missing')).rejects.toThrow('Key not found');
    });

    it('should propagate loader errors', async () => {
      const loader = new BatchLoader<string, number>(
        async () => {
          throw new Error('Load failed');
        },
        { delayMs: 0 }
      );

      await expect(loader.load('key')).rejects.toThrow('Load failed');
    });

    it('should clear pending requests', async () => {
      const loader = new BatchLoader<string, number>(
        async (keys) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return new Map(keys.map(k => [k, 1]));
        },
        { delayMs: 0 }
      );

      const promise = loader.load('key');
      loader.clear();

      await expect(promise).rejects.toThrow('cleared');
    });
  });
});

describe('StreamProcessor', () => {
  describe('chunking', () => {
    it('should split into chunks', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7];
      const processor = new StreamProcessor(data);

      const chunks: number[][] = [];
      for await (const chunk of processor.chunks(3)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7],
      ]);
    });

    it('should handle empty source', async () => {
      const processor = new StreamProcessor<number>([]);

      const chunks: number[][] = [];
      for await (const chunk of processor.chunks(3)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });
  });

  describe('backpressure processing', () => {
    it('should process with limited concurrency', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const processor = new StreamProcessor(data);

      const processed: number[] = [];
      await processor.processWithBackpressure(
        async (items) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          processed.push(...items);
        },
        2, // chunk size
        2  // max concurrent
      );

      expect(processed.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});
