import { Router } from 'express';
import {
  getPublicArticles,
  getTrendingArticles,
  getPublicArticleBySlug,
  incrementArticleView,
  getPublicCategories,
  getPublicTags,
  searchArticles,
  getSitemapData,
  getBreakingArticles,
  getArticleReactions,
  reactToArticle,
  getArticleComments,
  addArticleComment,
  getRelatedArticles,
  updateReadArticles,
  updateInterests,
  getArticleRecommendations,
  toggleUserBookmark,
  getUserBookmarks,
  syncAllUserBookmarks,
  getUserHistory,
  clearUserHistory,
  toggleUserTracking,
  getReaderProfile,
  subscribeUser,
  unsubscribeUser,
} from '../controllers/public.controller.js';

import {
  registerReader,
  loginPassword,
  sendOtp,
  loginOtp,
  forgotPassword,
  resetPassword,
  readerRegisterSchema,
  readerLoginPasswordSchema,
  readerSendOtpSchema,
  readerLoginOtpSchema,
  readerForgotPasswordSchema,
  readerResetPasswordSchema,
} from '../controllers/publicAuth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// ─── Cache Middleware ─────────────────────────────────────────────────────────
// Set Cache-Control headers for all public GET requests to improve Core Web Vitals
router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
});

// ─── Search ───────────────────────────────────────────────────────────────────
// GET  /api/public/search  ← MUST be before /:slug routes
router.get('/search', searchArticles);

// ─── Articles ─────────────────────────────────────────────────────────────────
// GET  /api/public/articles
router.get('/articles', getPublicArticles);

// GET  /api/public/articles/trending  ← MUST be before /:slug to avoid conflict
router.get('/articles/trending', getTrendingArticles);

// GET  /api/public/articles/breaking  ← MUST be before /:slug
router.get('/articles/breaking', getBreakingArticles);

// GET  /api/public/articles/:slug
router.get('/articles/:slug', getPublicArticleBySlug);

// GET  /api/public/articles/:slug/related
router.get('/articles/:slug/related', getRelatedArticles);

// POST /api/public/articles/:slug/view
router.post('/articles/:slug/view', incrementArticleView);

// GET  /api/public/articles/:slug/reactions
router.get('/articles/:slug/reactions', getArticleReactions);

// POST /api/public/articles/:slug/react
router.post('/articles/:slug/react', reactToArticle);

// GET  /api/public/articles/:slug/comments
router.get('/articles/:slug/comments', getArticleComments);

// POST /api/public/articles/:slug/comments
router.post('/articles/:slug/comments', addArticleComment);

// ─── Categories ───────────────────────────────────────────────────────────────
// GET  /api/public/categories
router.get('/categories', getPublicCategories);

// ─── Tags ─────────────────────────────────────────────────────────────────────
// GET  /api/public/tags
router.get('/tags', getPublicTags);

// ─── Sitemap Data ─────────────────────────────────────────────────────────────
// GET  /api/public/sitemap-data
router.get('/sitemap-data', getSitemapData);

// ─── Public Reader Authentication ──────────────────────────────────────────────
router.post('/auth/register', validate(readerRegisterSchema), registerReader);
router.post('/auth/login-password', validate(readerLoginPasswordSchema), loginPassword);
router.post('/auth/send-otp', validate(readerSendOtpSchema), sendOtp);
router.post('/auth/login-otp', validate(readerLoginOtpSchema), loginOtp);
router.post('/auth/forgot-password', validate(readerForgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', validate(readerResetPasswordSchema), resetPassword);

// ─── Reader Preferences & recommendations ──────────────────────────────────────
router.post('/user/read-articles', authenticate, updateReadArticles);
router.post('/user/interests', authenticate, updateInterests);
router.get('/articles/recommendations', authenticate, getArticleRecommendations);

// ─── Reader Bookmarks sync ─────────────────────────────────────────────────────
router.post('/user/bookmarks', authenticate, toggleUserBookmark);
router.get('/user/bookmarks', authenticate, getUserBookmarks);
router.post('/user/bookmarks/sync', authenticate, syncAllUserBookmarks);

// ─── Reader Profile & History ──────────────────────────────────────────────────
router.get('/user/me', authenticate, getReaderProfile);
router.get('/user/history', authenticate, getUserHistory);
router.delete('/user/history', authenticate, clearUserHistory);
router.post('/user/tracking', authenticate, toggleUserTracking);
router.post('/user/subscribe', authenticate, subscribeUser);
router.post('/user/unsubscribe', authenticate, unsubscribeUser);

// ─── Opinion Polls ────────────────────────────────────────────────────────────
import { getPublicPoll, voteInPoll } from '../controllers/polls.controller.js';
router.get('/polls/:id', getPublicPoll);
router.post('/polls/:id/vote', voteInPoll);

export default router;
