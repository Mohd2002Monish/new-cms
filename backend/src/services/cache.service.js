import { getRedisClient, isRedisReady, inMemoryCache } from '../config/redis.js';

const CACHE_PREFIX = 'newscms:';

/**
 * Fetch a value from Redis or in-memory fallback.
 */
export async function getCache(key) {
  const fullKey = `${CACHE_PREFIX}${key}`;

  if (isRedisReady()) {
    try {
      const client = getRedisClient();
      const raw = await client.get(fullKey);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn(`[cache] Redis get failed for ${fullKey}:`, err.message);
    }
  }

  // In-memory fallback
  const item = inMemoryCache.get(fullKey);
  if (item) {
    if (Date.now() < item.expiry) {
      return item.data;
    }
    inMemoryCache.delete(fullKey);
  }

  return null;
}

/**
 * Store a value in Redis or in-memory fallback with TTL in seconds.
 */
export async function setCache(key, value, ttlSeconds = 60) {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const serialized = JSON.stringify(value);

  if (isRedisReady()) {
    try {
      const client = getRedisClient();
      await client.set(fullKey, serialized, 'EX', ttlSeconds);
      return;
    } catch (err) {
      console.warn(`[cache] Redis set failed for ${fullKey}:`, err.message);
    }
  }

  // In-memory fallback
  inMemoryCache.set(fullKey, {
    data: value,
    expiry: Date.now() + ttlSeconds * 1000,
  });

  // Keep in-memory cache pruned
  if (inMemoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of inMemoryCache) {
      if (v.expiry < now) inMemoryCache.delete(k);
    }
  }
}

/**
 * Delete a specific key from cache.
 */
export async function delCache(key) {
  const fullKey = `${CACHE_PREFIX}${key}`;

  if (isRedisReady()) {
    try {
      const client = getRedisClient();
      await client.del(fullKey);
    } catch (err) {
      console.warn(`[cache] Redis del failed for ${fullKey}:`, err.message);
    }
  }

  inMemoryCache.delete(fullKey);
}

/**
 * Invalidate all keys matching a pattern (e.g. 'public:*').
 */
export async function delCachePattern(pattern) {
  const fullPattern = `${CACHE_PREFIX}${pattern}`;

  if (isRedisReady()) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(fullPattern);
      if (keys && keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      console.warn(`[cache] Redis delPattern failed for ${fullPattern}:`, err.message);
    }
  }

  // Clear matching in-memory keys
  const regex = new RegExp(`^${fullPattern.replace('*', '.*')}`);
  for (const k of inMemoryCache.keys()) {
    if (regex.test(k)) inMemoryCache.delete(k);
  }
}

/**
 * Clear all public feeds cache (used when posts/categories change).
 */
export async function clearPublicArticlesCache() {
  await delCachePattern('public:*');
}

/**
 * Express Middleware to cache public GET routes.
 * Emits X-Cache: HIT or MISS headers for debugging and CDN verification.
 */
export function cacheRoute(ttlSeconds = 60) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Key format: public:/api/public/articles?page=1&lang=en...
    const cacheKey = `public:${req.originalUrl || req.url}`;

    try {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=300`);
        return res.json(cachedData);
      }

      // Intercept res.json to store into cache before sending
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful JSON responses
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
          setCache(cacheKey, body, ttlSeconds).catch((err) => {
            console.warn('[cache] Failed to set route cache:', err.message);
          });
        }
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=300`);
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn('[cache] Middleware error, bypassing cache:', err.message);
      next();
    }
  };
}
