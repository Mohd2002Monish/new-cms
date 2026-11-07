import client from './client';

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

function setCache(key, data) {
  if (memoryCache.size > 80) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, time: Date.now() });
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
      const cached = getCache(cacheKey, 3 * 60 * 1000);
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
      if (data.length > 0) setCache(cacheKey, data);
      return data;
    } catch (err) {
      console.warn('newsApi.getDailyBriefingArticles failed, trying trending fallback', err?.message);
      try {
        const trendRes = await client.get('/public/articles/trending', {
          params: { limit, lang },
        });
        const data = trendRes.data?.data || [];
        if (data.length > 0) setCache(cacheKey, data);
        return data;
      } catch (e) {
        return [];
      }
    }
  },

  /**
   * Get paginated articles list
   */
  async getArticles({ page = 1, limit = 10, category = null, lang = 'en', sort = 'latest', forceRefresh = false } = {}) {
    const cacheKey = `articles:${page}:${limit}:${category || 'all'}:${lang}:${sort}`;
    if (!forceRefresh) {
      const cached = getCache(cacheKey, 90 * 1000);
      if (cached) return cached;
    }

    const params = { page, limit, lang, sort };
    if (category && category !== 'all') {
      params.category = category;
    }
    const res = await client.get('/public/articles', { params });
    if (res.data) {
      setCache(cacheKey, res.data);
    }
    return res.data;
  },

  /**
   * Fetch a single article by its slug
   */
  async getArticleBySlug(slug, forceRefresh = false) {
    const cacheKey = `article:${slug}`;
    if (!forceRefresh) {
      const cached = getCache(cacheKey, 5 * 60 * 1000);
      if (cached) return cached;
    }

    const res = await client.get(`/public/articles/${encodeURIComponent(slug)}`);
    const data = res.data?.data || null;
    if (data) {
      setCache(cacheKey, data);
    }
    return data;
  },

  /**
   * Fetch all categories
   */
  async getCategories(lang = 'en', forceRefresh = false) {
    const cacheKey = `categories:${lang}`;
    if (!forceRefresh) {
      const cached = getCache(cacheKey, 10 * 60 * 1000);
      if (cached) return cached;
    }

    const res = await client.get('/public/categories', { params: { lang } });
    const data = res.data?.data || [];
    if (data.length > 0) {
      setCache(cacheKey, data);
    }
    return data;
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
      setCache(cacheKey, res.data);
    }
    return res.data;
  },

  /**
   * Fetch breaking news ticker
   */
  async getBreakingNews(lang = 'en', forceRefresh = false) {
    const cacheKey = `breaking:${lang}`;
    if (!forceRefresh) {
      const cached = getCache(cacheKey, 2 * 60 * 1000);
      if (cached) return cached;
    }

    const res = await client.get('/public/articles/breaking', { params: { lang } });
    const data = res.data?.data || [];
    if (data.length > 0) {
      setCache(cacheKey, data);
    }
    return data;
  },
};

export default newsApi;
