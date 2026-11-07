import client from './client';

export const newsApi = {
  /**
   * Fetch top 20-30 stories of the day for the daily audio briefing
   */
  async getDailyBriefingArticles(limit = 25, lang = 'en') {
    try {
      const res = await client.get('/public/articles', {
        params: {
          limit,
          sort: 'latest',
          lang,
        },
      });
      return res.data?.data || [];
    } catch (err) {
      console.warn('newsApi.getDailyBriefingArticles failed, trying trending fallback', err?.message);
      try {
        const trendRes = await client.get('/public/articles/trending', {
          params: { limit, lang },
        });
        return trendRes.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  },

  /**
   * Get paginated articles list
   */
  async getArticles({ page = 1, limit = 10, category = null, lang = 'en', sort = 'latest' } = {}) {
    const params = { page, limit, lang, sort };
    if (category && category !== 'all') {
      params.category = category;
    }
    const res = await client.get('/public/articles', { params });
    return res.data;
  },

  /**
   * Fetch a single article by its slug
   */
  async getArticleBySlug(slug) {
    const res = await client.get(`/public/articles/${encodeURIComponent(slug)}`);
    return res.data?.data || null;
  },

  /**
   * Fetch all categories
   */
  async getCategories(lang = 'en') {
    const res = await client.get('/public/categories', { params: { lang } });
    return res.data?.data || [];
  },

  /**
   * Search news articles
   */
  async searchArticles({ query = '', page = 1, limit = 15, lang = 'en' } = {}) {
    const res = await client.get('/public/search', {
      params: { q: query, page, limit, lang },
    });
    return res.data;
  },

  /**
   * Fetch breaking news ticker
   */
  async getBreakingNews(lang = 'en') {
    const res = await client.get('/public/articles/breaking', { params: { lang } });
    return res.data?.data || [];
  },
};

export default newsApi;

