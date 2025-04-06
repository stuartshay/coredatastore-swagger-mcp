/**
 * Cache module for storing API responses temporarily
 */

/**
 * In-memory cache implementation with time-based expiration
 */
export class ResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTtl = options.defaultTtl || 5 * 60 * 1000; // 5 minutes by default
    this.maxSize = options.maxSize || 1000; // Maximum number of entries
    this.enabled = options.enabled !== false; // Enabled by default

    // If cleanup interval is provided, set up automatic cleanup
    if (options.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupInterval);
    }
  }

  /**
   * Generate a cache key from request details
   * @param {string} method - HTTP method
   * @param {string} url - URL of the request
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  generateKey(method, url, params = {}) {
    // Convert params object to a stable string representation
    const normalizedParams = JSON.stringify(
      Object.keys(params)
        .sort()
        .reduce((result, key) => {
          result[key] = params[key];
          return result;
        }, {})
    );

    return `${method}:${url}:${normalizedParams}`;
  }

  /**
   * Check if a response is cacheable
   * @param {Object} response - Response object
   * @param {number} status - HTTP status code
   * @returns {boolean} Whether the response is cacheable
   */
  isCacheable(response, status) {
    // Only cache successful responses
    if (status !== 200) {
      return false;
    }

    // Don't cache null or undefined responses
    if (response === null || response === undefined) {
      return false;
    }

    return true;
  }

  /**
   * Set a response in the cache
   * @param {string} key - Cache key
   * @param {any} data - Response data
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = this.defaultTtl) {
    if (!this.enabled) {
      return;
    }

    // Check if we need to evict entries due to size constraints
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expiry,
    });
  }

  /**
   * Get a response from the cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found or expired
   */
  get(key) {
    if (!this.enabled) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if the entry is expired
    if (entry.expiry <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Remove an entry from the cache
   * @param {string} key - Cache key
   */
  remove(key) {
    this.cache.delete(key);
  }

  /**
   * Get a value using the provided function if not in cache
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} Cached or fetched data
   */
  async getOrFetch(key, fetchFn, ttl = this.defaultTtl) {
    if (!this.enabled) {
      return fetchFn();
    }

    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Not in cache, fetch it
    const value = await fetchFn();

    // Store in cache if it's a valid response
    if (value !== null && value !== undefined) {
      this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Remove expired entries from the cache
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict the oldest entries when cache is full
   * @param {number} count - Number of entries to evict
   */
  evictOldest(count = 1) {
    // Sort entries by expiry time
    const entries = [...this.cache.entries()].sort((a, b) => a[1].expiry - b[1].expiry);

    // Remove the oldest entries
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  stats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiry > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      size: this.cache.size,
      activeEntries,
      expiredEntries,
      maxSize: this.maxSize,
      enabled: this.enabled,
    };
  }

  /**
   * Clean up resources when done with the cache
   */
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Default cache configurations for different types of data
const defaultCacheOptions = {
  lookup: {
    defaultTtl: 30 * 60 * 1000, // 30 minutes for lookup tables
    maxSize: 500,
    cleanupInterval: 15 * 60 * 1000, // Clean up every 15 minutes
  },
  report: {
    defaultTtl: 10 * 60 * 1000, // 10 minutes for reports
    maxSize: 200,
    cleanupInterval: 5 * 60 * 1000, // Clean up every 5 minutes
  },
  default: {
    defaultTtl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 1000,
    cleanupInterval: 5 * 60 * 1000, // Clean up every 5 minutes
  },
};

// Create and export default cache instances
export const lookupCache = new ResponseCache(defaultCacheOptions.lookup);
export const reportCache = new ResponseCache(defaultCacheOptions.report);
export const defaultCache = new ResponseCache(defaultCacheOptions.default);

// Create a utility function to select the appropriate cache
export function getCache(type) {
  switch (type) {
  case 'lookup':
    return lookupCache;
  case 'report':
    return reportCache;
  default:
    return defaultCache;
  }
}
