import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Public Article API ───────────────────────────────────────────────────────

export const publicApi = {
  /**
   * List published articles with optional filters.
   * @param {object} params - { category, tag, author, page, limit, sort, slugs }
   */
  getArticles: (params = {}) =>
    api.get('/public/articles', { params }).then(r => r.data),

  /**
   * Fetch a single article by its slug.
   */
  getArticle: (slug) =>
    api.get(`/public/articles/${slug}`).then(r => r.data),

  /**
   * Fetch related articles by slug.
   */
  getRelatedArticles: (slug) =>
    api.get(`/public/articles/${slug}/related`).then(r => r.data),

  /**
   * Increment the view count for an article.
   */
  incrementView: (slug) =>
    api.post(`/public/articles/${slug}/view`).then(r => r.data),

  /**
   * Fetch top N trending articles by view count.
   */
  getTrending: (limit = 5) =>
    api.get('/public/articles/trending', { params: { limit } }).then(r => r.data),

  /**
   * Fetch articles for a specific category slug (convenience wrapper).
   */
  getArticlesByCategory: (categorySlug, params = {}) =>
    api.get('/public/articles', { params: { category: categorySlug, ...params } }).then(r => r.data),

  /**
   * Fetch all active categories.
   */
  getCategories: () =>
    api.get('/public/categories').then(r => r.data),

  /**
   * Fetch all distinct tags from live articles.
   */
  getTags: () =>
    api.get('/public/tags').then(r => r.data),

  /**
   * Search articles with query and filters.
   */
  search: (params = {}) =>
    api.get('/public/search', { params }).then(r => r.data),

  /**
   * Fetch lightweight metadata for XML sitemaps.
   */
  getSitemapData: (params = {}) =>
    api.get('/public/sitemap-data', { params }).then(r => r.data),

  /**
   * Fetch reactions for an article.
   */
  getReactions: (slug) =>
    api.get(`/public/articles/${slug}/reactions`).then(r => r.data),

  /**
   * Submit a reaction to an article.
   */
  reactToArticle: (slug, reaction) =>
    api.post(`/public/articles/${slug}/react`, { reaction }).then(r => r.data),

  /**
   * Fetch comments for an article.
   */
  getComments: (slug) =>
    api.get(`/public/articles/${slug}/comments`).then(r => r.data),

  /**
   * Submit a comment to an article.
   */
  addComment: (slug, data) =>
    api.post(`/public/articles/${slug}/comments`, data).then(r => r.data),

  /**
   * Fetch active breaking news articles for the ticker.
   */
  getBreaking: () =>
    api.get('/public/articles/breaking').then(r => r.data),
};

export default api;
