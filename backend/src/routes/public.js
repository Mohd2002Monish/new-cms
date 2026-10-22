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
  trackInteraction,
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
  getGoogleAuthConfig,
  googleAuth,
  googleRedirect,
  googleCallback,
  readerRegisterSchema,
  readerLoginPasswordSchema,
  readerSendOtpSchema,
  readerLoginOtpSchema,
  readerForgotPasswordSchema,
  readerResetPasswordSchema,
} from '../controllers/publicAuth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimiter.js';
import { synthesizeAudio, getTtsLanguages } from '../controllers/tts.controller.js';

import { cacheRoute } from '../services/cache.service.js';

const router = Router();

// ─── Text to Speech (TTS) ──────────────────────────────────────────────────────
router.post('/tts/synthesize', synthesizeAudio);
router.get('/tts/languages', getTtsLanguages);

// ─── Search ───────────────────────────────────────────────────────────────────
// GET  /api/public/search  ← MUST be before /:slug routes
router.get('/search', cacheRoute(30), searchArticles);

// ─── Articles ─────────────────────────────────────────────────────────────────
// GET  /api/public/articles
router.get('/articles', cacheRoute(60), getPublicArticles);

// GET  /api/public/articles/trending  ← MUST be before /:slug to avoid conflict
router.get('/articles/trending', cacheRoute(60), getTrendingArticles);

// GET  /api/public/articles/breaking  ← MUST be before /:slug
router.get('/articles/breaking', cacheRoute(30), getBreakingArticles);

// GET  /api/public/articles/recommendations  ← MUST be before /:slug to avoid conflict
router.get('/articles/recommendations', optionalAuthenticate, getArticleRecommendations);

// GET  /api/public/articles/:slug
router.get('/articles/:slug', cacheRoute(60), getPublicArticleBySlug);

// GET  /api/public/articles/:slug/related
router.get('/articles/:slug/related', cacheRoute(120), getRelatedArticles);

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
router.get('/categories', cacheRoute(300), getPublicCategories);

// ─── Tags ─────────────────────────────────────────────────────────────────────
// GET  /api/public/tags
router.get('/tags', cacheRoute(300), getPublicTags);

// ─── Sitemap Data ─────────────────────────────────────────────────────────────
// GET  /api/public/sitemap-data
router.get('/sitemap-data', getSitemapData);

// ─── Public Reader Authentication ──────────────────────────────────────────────
// Request limiters stop email bombing; verify limiters stop OTP/password brute force.
router.post('/auth/register', otpRequestLimiter, validate(readerRegisterSchema), registerReader);
router.post('/auth/login-password', otpVerifyLimiter, validate(readerLoginPasswordSchema), loginPassword);
router.post('/auth/send-otp', otpRequestLimiter, validate(readerSendOtpSchema), sendOtp);
router.post('/auth/login-otp', otpVerifyLimiter, validate(readerLoginOtpSchema), loginOtp);
router.post('/auth/forgot-password', otpRequestLimiter, validate(readerForgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', otpVerifyLimiter, validate(readerResetPasswordSchema), resetPassword);

// ─── Google OAuth Routes ───────────────────────────────────────────────────────
router.get('/auth/google/config', getGoogleAuthConfig);
router.post('/auth/google', googleAuth);
router.get('/auth/google/redirect', googleRedirect);
router.get('/auth/google/callback', googleCallback);

// ─── Reader Preferences ──────────────────────────────────────────────────────────
router.post('/track-interaction', optionalAuthenticate, trackInteraction);
router.post('/user/read-articles', authenticate, updateReadArticles);
router.post('/user/interests', authenticate, updateInterests);

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
