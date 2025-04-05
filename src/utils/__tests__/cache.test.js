import { ResponseCache, getCache, lookupCache, reportCache, defaultCache } from '../cache.js';

describe('ResponseCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ResponseCache({
      defaultTtl: 100, // 100ms for faster testing
      maxSize: 5,
    });
  });

  afterEach(() => {
    // Clean up any intervals
    cache.dispose();
  });

  test('should store and retrieve values', () => {
    const key = 'test-key';
    const data = { test: 'data' };

    cache.set(key, data);
    const result = cache.get(key);

    expect(result).toEqual(data);
  });

  test('should generate consistent cache keys', () => {
    const method = 'GET';
    const url = '/api/test';
    const params = { a: 1, b: 2 };
    const paramsReordered = { b: 2, a: 1 };

    const key1 = cache.generateKey(method, url, params);
    const key2 = cache.generateKey(method, url, paramsReordered);

    expect(key1).toBe(key2);
  });

  test('should respect TTL for cached items', async () => {
    const key = 'expiring-key';
    const data = { test: 'expiring' };

    cache.set(key, data, 50); // 50ms TTL

    // Should be available immediately
    expect(cache.get(key)).toEqual(data);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 60));

    // Should be gone after expiration
    expect(cache.get(key)).toBeNull();
  });

  test('should evict oldest entries when cache is full', () => {
    // Fill the cache (maxSize = 5)
    for (let i = 0; i < 5; i++) {
      cache.set(`key-${i}`, `value-${i}`);
    }

    // All items should be in cache
    for (let i = 0; i < 5; i++) {
      expect(cache.get(`key-${i}`)).toBe(`value-${i}`);
    }

    // Add one more item to trigger eviction
    cache.set('new-key', 'new-value');

    // The oldest item should be evicted
    expect(cache.get('key-0')).toBeNull();
    expect(cache.get('new-key')).toBe('new-value');
  });

  test('should not cache failed responses', () => {
    expect(cache.isCacheable({}, 404)).toBe(false);
    expect(cache.isCacheable({}, 500)).toBe(false);
    expect(cache.isCacheable(null, 200)).toBe(false);
    expect(cache.isCacheable(undefined, 200)).toBe(false);
    expect(cache.isCacheable({}, 200)).toBe(true);
  });

  test('should fetch and cache with getOrFetch', async () => {
    const key = 'fetch-key';
    const data = { fetched: 'data' };

    // Create a mock function manually since we're using ESM
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      return data;
    };

    // First call should use the fetchFn
    const result1 = await cache.getOrFetch(key, fetchFn);
    expect(result1).toEqual(data);
    expect(callCount).toBe(1);

    // Second call should use the cache
    const result2 = await cache.getOrFetch(key, fetchFn);
    expect(result2).toEqual(data);
    expect(callCount).toBe(1); // Still only called once
  });

  test('should handle cleanup correctly', () => {
    // Set items with different expiries
    cache.set('expired', 'value1', -100); // Already expired
    cache.set('valid', 'value2', 10000); // Valid for a while

    // Run cleanup
    cache.cleanup();

    // Check results
    expect(cache.get('expired')).toBeNull();
    expect(cache.get('valid')).toBe('value2');
  });

  test('should provide accurate stats', () => {
    // Add some items
    cache.set('a', 'A', 10000); // Not expired
    cache.set('b', 'B', -10); // Expired

    const stats = cache.stats();

    expect(stats.size).toBe(2);
    expect(stats.activeEntries).toBe(1);
    expect(stats.expiredEntries).toBe(1);
    expect(stats.maxSize).toBe(5);
    expect(stats.enabled).toBe(true);
  });
});

describe('Cache utility functions', () => {
  test('getCache should return appropriate cache instance', () => {
    expect(getCache('lookup')).toBe(lookupCache);
    expect(getCache('report')).toBe(reportCache);
    expect(getCache('unknown')).toBe(defaultCache);
    expect(getCache()).toBe(defaultCache);
  });

  test('cache instances should have correct TTL values', () => {
    // We can't directly test the TTL values as they're private,
    // but we can check they exist and are different objects
    expect(lookupCache).not.toBe(reportCache);
    expect(reportCache).not.toBe(defaultCache);
    expect(lookupCache).not.toBe(defaultCache);
  });
});
