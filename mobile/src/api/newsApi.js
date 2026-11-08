import client from './client';
import storage from '../utils/storage';
import { safeJsonParse } from '../utils/formatters';

// In-memory cache for instant UI rendering across navigation and category filters
const memoryCache = new Map();

function getCache(key, ttlMs = 120000) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

async function getPersistentCache(key, ttlMs = 300000) {
  const mem = getCache(key, ttlMs);
  if (mem) return mem;

  try {
    const raw = await storage.getItem(`@cache_${key}`);
    if (raw) {
      const parsed = safeJsonParse(raw);
      if (parsed && parsed.data) {
        // Return cached data immediately if within TTL or as stale-fallback
        if (!ttlMs || Date.now() - (parsed.time || 0) < ttlMs) {
          memoryCache.set(key, { data: parsed.data, time: parsed.time || Date.now() });
          return parsed.data;
        }
      }
    }
  } catch (_) {}
  return null;
}

function setCache(key, data, persistToDisk = true) {
  if (!data) return;
  if (memoryCache.size > 80) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  const time = Date.now();
  memoryCache.set(key, { data, time });

  if (persistToDisk) {
    storage.setItem(`@cache_${key}`, JSON.stringify({ data, time })).catch(() => {});
  }
}

export const newsApi = {
  clearCache() {
    memoryCache.clear();
  },

  /**
   * Fetch top 20-30 stories of the day for the daily audio briefing
   */
  async getDailyBriefingArticles(limit = 25, lang = 'en', forceRefresh = false) {
    const cacheKey = `briefing:${limit}:${lang}`;
    if (!forceRefresh) {
      const cached = await getPersistentCache(cacheKey, 15 * 60 * 1000);
      if (cached) return cached;
    }

    try {
      const res = await client.get('/public/articles', {
        params: {
          limit,
          sort: 'latest',
          lang,
        },
      });
      const data = res.data?.data || [];
      if (data.length > 0) setCache(cacheKey, data, true);
      return data;
    } catch (err) {
      console.warn('newsApi.getDailyBriefingArticles failed, trying trending fallback', err?.message);
      try {
        const trendRes = await client.get('/public/articles/trending', {
          params: { limit, lang },
        });
        const data = trendRes.data?.data || [];
        if (data.length > 0) setCache(cacheKey, data, true);
        return data;
      } catch (e) {
        // Return stale cache if available when offline
        const stale = await getPersistentCache(cacheKey, 24 * 60 * 60 * 1000);
        return stale || [];
      }
    }
  },

  /**
   * Get paginated articles list
   */
  async getArticles({ page = 1, limit = 10, category = null, lang = 'en', sort = 'latest', forceRefresh = false } = {}) {
    const cacheKey = `articles:${page}:${limit}:${category || 'all'}:${lang}:${sort}`;
    if (!forceRefresh) {
      const cached = await getPersistentCache(cacheKey, 90 * 1000);
      if (cached) return cached;
    }

    const params = { page, limit, lang, sort };
    if (category && category !== 'all') {
      params.category = category;
    }

    try {
      const res = await client.get('/public/articles', { params });
      if (res.data) {
        setCache(cacheKey, res.data, page === 1);
      }
      return res.data;
    } catch (err) {
      // Offline fallback: try reading stale cache from disk
      const stale = await getPersistentCache(cacheKey, 24 * 60 * 60 * 1000);
      if (stale) return stale;
      throw err;
    }
  },

  /**
   * Fetch a single article by its slug
   */
  async getArticleBySlug(slug, forceRefresh = false) {
    const cacheKey = `article:${slug}`;
    if (!forceRefresh) {
      const cached = await getPersistentCache(cacheKey, 10 * 60 * 1000);
      if (cached) return cached;
    }

    try {
      const res = await client.get(`/public/articles/${encodeURIComponent(slug)}`);
      const data = res.data?.data || null;
      if (data) {
        setCache(cacheKey, data, true);
      }
      return data;
    } catch (err) {
      const stale = await getPersistentCache(cacheKey, 48 * 60 * 60 * 1000);
      if (stale) return stale;
      throw err;
    }
  },

  /**
   * Fetch all categories
   */
  async getCategories(lang = 'en', forceRefresh = false) {
    const cacheKey = `categories:${lang}`;
    if (!forceRefresh) {
      const cached = await getPersistentCache(cacheKey, 30 * 60 * 1000);
      if (cached) return cached;
    }

    try {
      const res = await client.get('/public/categories', { params: { lang } });
      const data = res.data?.data || [];
      if (data.length > 0) {
        setCache(cacheKey, data, true);
      }
      return data;
    } catch (err) {
      const stale = await getPersistentCache(cacheKey, 7 * 24 * 60 * 60 * 1000);
      return stale || [];
    }
  },

  /**
   * Search news articles
   */
  async searchArticles({ query = '', page = 1, limit = 15, lang = 'en' } = {}) {
    const cacheKey = `search:${query}:${page}:${limit}:${lang}`;
    const cached = getCache(cacheKey, 60 * 1000);
    if (cached) return cached;

    const res = await client.get('/public/search', {
      params: { q: query, page, limit, lang },
    });
    if (res.data) {
      setCache(cacheKey, res.data, false);
    }
    return res.data;
  },

  /**
   * Fetch breaking news ticker
   */
  async getBreakingNews(lang = 'en', forceRefresh = false) {
    const cacheKey = `breaking:${lang}`;
    if (!forceRefresh) {
      const cached = await getPersistentCache(cacheKey, 3 * 60 * 1000);
      if (cached) return cached;
    }

    try {
      const res = await client.get('/public/articles/breaking', { params: { lang } });
      const data = res.data?.data || [];
      if (data.length > 0) {
        setCache(cacheKey, data, true);
      }
      return data;
    } catch (err) {
      const stale = await getPersistentCache(cacheKey, 12 * 60 * 60 * 1000);
      return stale || [];
    }
  },
};

export default newsApi;
