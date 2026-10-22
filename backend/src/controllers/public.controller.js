import { Post } from '../models/Post.js';
import { Category } from '../models/Category.js';
import { ArticleReaction } from '../models/ArticleReaction.js';
import { ArticleComment } from '../models/ArticleComment.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { SUPPORTED_LANGUAGES } from '../utils/slugify.js';

// Validate a ?lang= query param; returns null (no filter) when absent/invalid
const parseLang = (value) => (SUPPORTED_LANGUAGES.includes(value) ? value : null);

// ─── Internal fields stripped from every public response ─────────────────────
const PUBLIC_POST_FIELDS = `-rejectionReason -deletedAt -deletedBy -reviewedBy
  -reviewedAt -submittedAt -assignedManager -coAuthors`;

import { getRedisClient, isRedisReady } from '../config/redis.js';

// ─── View deduplication (Redis with in-memory fallback, 1-hour TTL per IP+slug) ──
const viewLog = new Map();
const VIEW_TTL_MS = 60 * 60 * 1000; // 1 hour

async function isRecentView(ip, slug) {
  // Use Redis atomic SET if not exists (NX) with 3600 seconds expiration
  if (isRedisReady()) {
    try {
      const client = getRedisClient();
      const redisKey = `view:${ip}:${slug}`;
      const result = await client.set(redisKey, '1', 'EX', 3600, 'NX');
      // result === 'OK' means the key was set (first view in 1 hour)
      // result === null means key already existed (recent view -> debounce)
      return result === null;
    } catch (err) {
      console.warn('[viewTracker] Redis check failed, using memory fallback:', err.message);
    }
  }

  // In-memory fallback
  const key = `${ip}:${slug}`;
  const ts  = viewLog.get(key);
  if (ts && Date.now() - ts < VIEW_TTL_MS) return true;
  viewLog.set(key, Date.now());

  if (viewLog.size > 20_000) {
    const cutoff = Date.now() - VIEW_TTL_MS;
    for (const [k, t] of viewLog) {
      if (t < cutoff) viewLog.delete(k);
    }
  }
  return false;
}

// ─── List Published Articles ──────────────────────────────────────────────────

/**
 * GET /api/public/articles
 * Returns paginated list of live articles.
 * Query: category (slug), tag, author, page, limit, sort (latest|popular), slugs
 */
export const getPublicArticles = async (req, res, next) => {
  try {
    const {
      category,
      subCategory,
      tag,
      author,
      sort  = 'latest',
      slugs,
      isSlider,
    } = req.query;

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const filter = { status: 'live', deletedAt: null };
    const lang = parseLang(req.query.lang);
    if (lang) filter.language = lang;

    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) {
        // Include category and its child subcategories
        const childCats = await Category.find({ parentCategory: cat._id, isActive: true }).select('_id');
        const allCatIds = [cat._id, ...childCats.map((c) => c._id)];
        filter.$or = [
          { category: { $in: allCatIds } },
          { subCategory: { $in: allCatIds } },
        ];
      } else {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit, pages: 0 },
        });
      }
    }

    if (subCategory) {
      const subCat = await Category.findOne({ slug: subCategory, isActive: true });
      if (subCat) {
        filter.subCategory = subCat._id;
      } else {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit, pages: 0 },
        });
      }
    }

    if (tag)    filter.tags   = tag.toLowerCase();
    if (author) filter.author = author;
    if (slugs)  filter.slug   = { $in: slugs.split(',').map(s => s.trim()) };
    if (req.query.excludeSlugs) {
      const excluded = req.query.excludeSlugs.split(',').map(s => s.trim()).filter(Boolean);
      if (excluded.length > 0) {
        filter.slug = { ...(filter.slug || {}), $nin: excluded };
      }
    }
    if (isSlider === 'true') filter.isSlider = true;

    const sortMap = {
      latest:  { publishedAt: -1 },
      popular: { views: -1, publishedAt: -1 },
      slider:  { sliderOrder: 1, publishedAt: -1 },
    };

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortMap[sort] || sortMap.latest)
        .skip(skip)
        .limit(limit)
        .populate('author',   'name')
        .populate('category', 'name slug nameTranslations')
        .populate('subCategory', 'name slug nameTranslations')
        .select(`title slug excerpt featuredImage seo category subCategory tags language
                 publishedAt updatedAt isBreaking priority readingTimeMinutes views`)
        .lean(),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Trending Articles ────────────────────────────────────────────────────────

/**
 * GET /api/public/articles/trending
 * Returns top N articles sorted by view count.
 * Query: limit (default 5, max 10)
 */
export const getTrendingArticles = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    const trendingFilter = { status: 'live', deletedAt: null };
    const lang = parseLang(req.query.lang);
    if (lang) trendingFilter.language = lang;

    const posts = await Post.find(trendingFilter)
      .sort({ views: -1, publishedAt: -1 })
      .limit(limit)
      .populate('author',   'name')
      .populate('category', 'name slug')
      .select('title slug featuredImage category author publishedAt readingTimeMinutes views isBreaking language')
      .lean();

    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// ─── Single Article by Slug ───────────────────────────────────────────────────

/**
 * GET /api/public/articles/:slug
 * Returns a single live article with full Tiptap content.
 */
export const getPublicArticleBySlug = async (req, res, next) => {
  try {
    const rawSlug = req.params.slug;
    let decodedSlug = rawSlug;
    try { decodedSlug = decodeURIComponent(rawSlug); } catch (_) {}
    const post = await Post.findOne({
      slug: { $in: [rawSlug, decodedSlug] },
      status: 'live',
      deletedAt: null
    })
      .populate('author',      'name')
      .populate('category',    'name slug description')
      .populate('subCategory', 'name slug description')
      .select(PUBLIC_POST_FIELDS)
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Sibling translations (for hreflang alternates and language-switch links)
    let translations = [];
    if (post.translationGroup) {
      translations = await Post.find({
        translationGroup: post.translationGroup,
        _id: { $ne: post._id },
        status: 'live',
        deletedAt: null,
      })
        .select('slug language title')
        .lean();
    }
    post.translations = translations;

    // Determine user session from Authorization header
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Ignore invalid token
      }
    }

    // Paywall rules
    const monthlyLimit = 5;
    let paywallLocked = false;
    let lockReason = ''; // 'premium_login_required', 'premium_subscription_required', 'limit_exceeded'

    if (post.isPremium) {
      if (!user) {
        paywallLocked = true;
        lockReason = 'premium_login_required';
      } else if (!user.isPremiumUser) {
        paywallLocked = true;
        lockReason = 'premium_subscription_required';
      }
    } else {
      // Metered views check
      if (user) {
        if (!user.isPremiumUser) {
          const hasRead = user.readArticles && user.readArticles.includes(post.slug);
          if (!hasRead) {
            if (user.monthlyViewsCount >= monthlyLimit) {
              paywallLocked = true;
              lockReason = 'limit_exceeded';
            } else {
              user.monthlyViewsCount += 1;
              await user.save();
            }
          }
        }
      }
    }

    if (paywallLocked) {
      // Return redacted version of the article
      const lockedPost = {
        ...post,
        content: null, // strip ProseMirror/Tiptap structure
        contentHtml: '', // strip HTML string
        isLocked: true,
        lockReason,
        monthlyViewsCount: user ? user.monthlyViewsCount : 0,
        monthlyLimit
      };
      return res.json({ success: true, data: lockedPost });
    }

    res.json({
      success: true,
      data: {
        ...post,
        isLocked: false,
        monthlyViewsCount: user ? user.monthlyViewsCount : 0,
        monthlyLimit
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Related Articles ─────────────────────────────────────────────────────────

/**
 * GET /api/public/articles/:slug/related
 * Returns 4 related articles based on category and tag overlap.
 */
export const getRelatedArticles = async (req, res, next) => {
  try {
    const currentPost = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null }).lean();
    if (!currentPost) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Find up to 20 recent articles in the same category and language (excluding current)
    const recentCategoryPosts = await Post.find({
      _id: { $ne: currentPost._id },
      category: currentPost.category,
      language: currentPost.language || 'en',
      status: 'live',
      deletedAt: null
    })
      .sort({ publishedAt: -1 })
      .limit(20)
      .populate('author', 'name')
      .populate('category', 'name slug')
      .select('title slug featuredImage category author publishedAt readingTimeMinutes views isBreaking tags')
      .lean();

    // Sort by tag overlap count DESC, then publishedAt DESC
    const currentTags = currentPost.tags || [];
    
    recentCategoryPosts.sort((a, b) => {
      const aOverlap = (a.tags || []).filter(t => currentTags.includes(t)).length;
      const bOverlap = (b.tags || []).filter(t => currentTags.includes(t)).length;
      
      if (aOverlap !== bOverlap) {
        return bOverlap - aOverlap; // Descending
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    const related = recentCategoryPosts.slice(0, 4);

    res.json({ success: true, data: related });
  } catch (error) {
    next(error);
  }
};

// ─── Increment View Count ─────────────────────────────────────────────────────

/**
 * POST /api/public/articles/:slug/view
 * Increments the view counter — debounced once per IP per hour.
 */
export const incrementArticleView = async (req, res, next) => {
  try {
    const { slug } = req.params;
    // req.ip respects the trust proxy setting; never trust raw x-forwarded-for
    const ip = req.ip || 'unknown';

    // Skip if this IP already viewed this article in the last hour
    const alreadyViewed = await isRecentView(ip, slug);
    if (alreadyViewed) {
      return res.json({ success: true, deduplicated: true });
    }

    await Post.findOneAndUpdate(
      { slug, status: 'live', deletedAt: null },
      { $inc: { views: 1 } },
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Public Categories ────────────────────────────────────────────────────────

/**
 * GET /api/public/categories
 * Returns all active categories (no auth).
 */
export const getPublicCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true, deletedAt: null })
      .sort({ order: 1, name: 1 })
      .select('name slug description order nameTranslations parentCategory tags')
      .populate('parentCategory', 'name slug')
      .lean();

    // Convenience: localizedName resolved for the requested language (falls
    // back to the canonical name when no translation exists)
    const lang = parseLang(req.query.lang);
    const data = categories.map((cat) => ({
      ...cat,
      tags: Array.isArray(cat.tags) ? cat.tags : [],
      localizedName:
        (lang && lang !== 'en' && cat.nameTranslations?.[lang]) || cat.name,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── Public Tags ──────────────────────────────────────────────────────────────

/**
 * GET /api/public/tags
 * Returns all distinct tags used in live articles.
 */
export const getPublicTags = async (req, res, next) => {
  try {
    const tags = await Post.distinct('tags', { status: 'live', deletedAt: null });
    res.json({ success: true, data: tags.sort() });
  } catch (error) {
    next(error);
  }
};

// ─── Full-Text Search ─────────────────────────────────────────────────────────

/**
 * GET /api/public/search
 * Search published articles using MongoDB text index.
 * Query params:
 *   q        — search query string (required)
 *   category — category slug to filter by
 *   from     — ISO date string (publishedAt >= from)
 *   to       — ISO date string (publishedAt <= to)
 *   page     — page number (default 1)
 *   limit    — results per page (default 12, max 24)
 */
export const searchArticles = async (req, res, next) => {
  try {
    const {
      q,
      category,
      from,
      to,
      page  = 1,
      limit = 12,
    } = req.query;

    // q is required — return empty result set when absent
    if (!q || !q.trim()) {
      return res.json({
        success: true,
        data: [],
        meta: { query: '', total: 0 },
        pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 },
      });
    }

    const safeLimit = Math.min(parseInt(limit) || 12, 24);
    const safePage  = Math.max(parseInt(page) || 1, 1);
    const skip      = (safePage - 1) * safeLimit;

    // Build filter
    const filter = {
      status:    'live',
      deletedAt: null,
      $text:     { $search: q.trim() },
    };

    const lang = parseLang(req.query.lang);
    if (lang) filter.language = lang;

    // Optional category filter (resolve slug → ObjectId)
    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) filter.category = cat._id;
      else filter.category = null; // force no-match if category slug doesn't exist
    }

    // Optional date range filter
    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = new Date(from);
      if (to)   filter.publishedAt.$lte = new Date(to);
    }

    const SEARCH_FIELDS = `title slug excerpt featuredImage seo category tags language
                 publishedAt updatedAt isBreaking priority readingTimeMinutes views`;

    // Run search + count in parallel
    let [posts, total] = await Promise.all([
      Post.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('author',   'name')
        .populate('category', 'name slug nameTranslations')
        .select(SEARCH_FIELDS)
        .lean(),
      Post.countDocuments(filter),
    ]);

    // Fallback: the text index tokenizes on whitespace, so partial words —
    // common when typing Hindi/Gujarati — can miss. Retry as a substring
    // match on the title (input escaped to prevent ReDoS).
    if (total === 0) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const { $text, ...regexFilter } = filter;
      regexFilter.title = { $regex: escaped, $options: 'i' };

      [posts, total] = await Promise.all([
        Post.find(regexFilter)
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate('author',   'name')
          .populate('category', 'name slug nameTranslations')
          .select(SEARCH_FIELDS)
          .lean(),
        Post.countDocuments(regexFilter),
      ]);
    }

    res.json({
      success: true,
      data:    posts,
      meta: {
        query: q.trim(),
        total,
      },
      pagination: {
        total,
        page:  safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Sitemap Data ─────────────────────────────────────────────────────────────

/**
 * GET /api/public/sitemap-data
 * Returns lightweight article metadata for XML sitemap generation.
 * Query: recent=true (only last 48 hours for Google News)
 */
export const getSitemapData = async (req, res, next) => {
  try {
    const isRecent = req.query.recent === 'true';
    const filter = { status: 'live', deletedAt: null };
    const lang = parseLang(req.query.lang);
    if (lang) filter.language = lang;

    if (isRecent) {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      filter.publishedAt = { $gte: fortyEightHoursAgo };
    }

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .limit(1000) // Sanity limit
      .populate('category', 'name')
      .select('title slug publishedAt updatedAt tags language')
      .lean();

    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// ─── Breaking News Ticker ─────────────────────────────────────────────────────

/**
 * GET /api/public/articles/breaking
 * Returns active breaking news for the live ticker.
 */
export const getBreakingArticles = async (req, res, next) => {
  try {
    const breakingFilter = {
      status: 'live',
      deletedAt: null,
      isBreaking: true,
      $or: [
        { breakingExpiresAt: null },
        { breakingExpiresAt: { $gt: new Date() } }
      ]
    };
    const lang = parseLang(req.query.lang);
    if (lang) breakingFilter.language = lang;

    const posts = await Post.find(breakingFilter)
      .sort({ publishedAt: -1 })
      .limit(10)
      .select('title slug isBreaking breakingExpiresAt publishedAt')
      .lean();

    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// ─── Phase 8: Reader Engagement ───────────────────────────────────────────────

/**
 * GET /api/public/articles/:slug/reactions
 */
export const getArticleReactions = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null });
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });

    const reactions = await ArticleReaction.aggregate([
      { $match: { articleId: post._id } },
      { $group: { _id: '$reaction', count: { $sum: 1 } } }
    ]);

    const formatted = reactions.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, { like: 0, love: 0, wow: 0, angry: 0, sad: 0 });

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/articles/:slug/react
 * Body: { reaction: 'like' }
 */
export const reactToArticle = async (req, res, next) => {
  try {
    const { reaction } = req.body;
    if (!['like', 'love', 'wow', 'angry', 'sad'].includes(reaction)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction type' });
    }

    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null });
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });

    // Hash IP for privacy
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');

    // Upsert the reaction
    await ArticleReaction.findOneAndUpdate(
      { articleId: post._id, ip: ipHash },
      { reaction },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Reaction recorded' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/articles/:slug/comments
 */
export const getArticleComments = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null });
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });

    const comments = await ArticleComment.find({ articleId: post._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/articles/:slug/comments
 * Body: { authorName, body }
 */
export const addArticleComment = async (req, res, next) => {
  try {
    const { authorName, body } = req.body;
    if (!authorName || !body || typeof authorName !== 'string' || typeof body !== 'string') {
      return res.status(400).json({ success: false, message: 'authorName and body are required' });
    }
    if (authorName.length > 100 || body.length > 2000) {
      return res.status(400).json({ success: false, message: 'Comment is too long (name ≤ 100, body ≤ 2000 chars)' });
    }

    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null });
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });

    // req.ip respects the trust proxy setting; never trust raw x-forwarded-for
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';

    const comment = await ArticleComment.create({
      articleId: post._id,
      authorName,
      body,
      ipAddress: rawIp,
      isApproved: true, // Auto-approved as per user decision
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// ─── Reader Profile Sync & Recommendations ─────────────────────────────────────

/**
 * POST /api/public/user/read-articles
 * Add a read article slug to logged-in user history.
 */
export const updateReadArticles = async (req, res, next) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug is required' });
    }

    if (!req.user.trackingEnabled) {
      return res.json({ success: true, trackingDisabled: true });
    }

    // Update streak (Duolingo-style reading streaks)
    const now = new Date();
    const lastRead = req.user.lastReadDate;
    if (!lastRead) {
      req.user.readingStreak = 1;
    } else {
      const msDiff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 
                     new Date(lastRead.getFullYear(), lastRead.getMonth(), lastRead.getDate()).getTime();
      const dayDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));
      if (dayDiff === 1) {
        req.user.readingStreak += 1;
      } else if (dayDiff > 1) {
        req.user.readingStreak = 1;
      }
    }
    req.user.lastReadDate = now;

    if (!req.user.readArticles.includes(slug)) {
      req.user.readArticles.push(slug);
    }

    await req.user.save();
    res.json({ success: true, readArticles: req.user.readArticles, streak: req.user.readingStreak });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/user/interests
 * Increment category interest score for logged-in user.
 */
export const updateInterests = async (req, res, next) => {
  try {
    const { categorySlug } = req.body;
    if (!categorySlug) {
      return res.status(400).json({ success: false, message: 'categorySlug is required' });
    }

    if (!req.user.trackingEnabled) {
      return res.json({ success: true, trackingDisabled: true });
    }

    const currentScore = req.user.interests.get(categorySlug) || 0;
    req.user.interests.set(categorySlug, currentScore + 1);
    await req.user.save();

    res.json({ success: true, interests: Object.fromEntries(req.user.interests) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/track-interaction
 * Track reader behavior (view, scroll depth, read complete, like, bookmark, share, tag clicks)
 * to intelligently update interest vectors for accurate content recommendations.
 */
export const trackInteraction = async (req, res, next) => {
  try {
    const {
      articleSlug,
      action = 'view',
      timeSpentSeconds = 0,
      scrollDepthPercent = 0,
      tag,
    } = req.body;

    if (!articleSlug) {
      return res.status(400).json({ success: false, message: 'articleSlug is required' });
    }

    const post = await Post.findOne({ slug: articleSlug, status: 'live', deletedAt: null })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Scoring matrix for user actions
    const ACTION_WEIGHTS = {
      view: 1,
      read_25: 1,
      read_50: 2,
      read_complete: 4,
      like: 3,
      bookmark: 4,
      share: 3,
      tag_click: 2,
    };

    const points = ACTION_WEIGHTS[action] || 1;

    // If reader is logged in and tracking is active, update their affinity profile
    if (req.user && req.user.trackingEnabled) {
      if (!req.user.interests) req.user.interests = new Map();

      // Category affinity boost
      if (post.category?.slug) {
        const curCat = req.user.interests.get(post.category.slug) || 0;
        req.user.interests.set(post.category.slug, curCat + points);
      }

      // Subcategory affinity boost (even more specific)
      if (post.subCategory?.slug) {
        const curSub = req.user.interests.get(post.subCategory.slug) || 0;
        req.user.interests.set(post.subCategory.slug, curSub + points + 1);
      }

      // Tag affinities boost
      if (Array.isArray(post.tags)) {
        post.tags.forEach((t) => {
          const cleanTag = t.trim().toLowerCase();
          if (cleanTag) {
            const curTag = req.user.interests.get(cleanTag) || 0;
            req.user.interests.set(cleanTag, curTag + Math.ceil(points * 0.8));
          }
        });
      }

      // Explicit tag clicked boost
      if (tag && typeof tag === 'string') {
        const cleanClickedTag = tag.trim().toLowerCase();
        if (cleanClickedTag) {
          const curTag = req.user.interests.get(cleanClickedTag) || 0;
          req.user.interests.set(cleanClickedTag, curTag + points + 1);
        }
      }

      // Read history & streak update
      if (['view', 'read_50', 'read_complete'].includes(action)) {
        if (!req.user.readArticles.includes(articleSlug)) {
          req.user.readArticles.push(articleSlug);
        }

        const now = new Date();
        if (req.user.lastReadDate) {
          const dayDiff = Math.floor((now - new Date(req.user.lastReadDate)) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            req.user.readingStreak += 1;
          } else if (dayDiff > 1) {
            req.user.readingStreak = 1;
          }
        } else {
          req.user.readingStreak = 1;
        }
        req.user.lastReadDate = now;
        req.user.monthlyViewsCount = (req.user.monthlyViewsCount || 0) + 1;
      }

      await req.user.save();
    }

    // Increment overall post views on genuine view action
    if (action === 'view') {
      post.views = (post.views || 0) + 1;
      await post.save();
    }

    res.json({
      success: true,
      action,
      articleSlug,
      recorded: true,
      currentStreak: req.user?.readingStreak || 0,
      userInterests: req.user?.interests ? Object.fromEntries(req.user.interests) : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/articles/recommendations
 * Multi-factor recommendation engine combining:
 * 1. User category affinities
 * 2. Topic tags matches
 * 3. Subcategory relevance
 * 4. Freshness/recency decay
 * 5. Popularity/views signal
 * 6. Breaking news boost
 * With graceful fallback to trending/curated content for guests/cold start.
 */
export const getArticleRecommendations = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 6), 30);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const excludeRead = req.query.excludeRead !== 'false';
    const lang = parseLang(req.query.lang);
    const readSlugs = req.user?.readArticles || [];
    const excludeSlugsList = req.query.excludeSlugs
      ? req.query.excludeSlugs.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const allExcludedSlugs = [...new Set([...(excludeRead ? readSlugs : []), ...excludeSlugsList])];

    const userInterests = req.user?.interests ? Object.fromEntries(req.user.interests) : {};
    const hasInterests = Object.keys(userInterests).length > 0;

    let candidatePosts = [];

    // Filter excluding already read/excluded articles if requested
    const baseFilter = {
      status: 'live',
      deletedAt: null,
      ...(lang ? { language: lang } : {}),
      ...(allExcludedSlugs.length > 0 ? { slug: { $nin: allExcludedSlugs } } : {}),
    };

    if (hasInterests) {
      // Pull recent candidate articles from the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const allCandidates = await Post.find({
        ...baseFilter,
        publishedAt: { $gte: thirtyDaysAgo },
      })
        .populate('author', 'name')
        .populate('category', 'name slug nameTranslations')
        .populate('subCategory', 'name slug nameTranslations')
        .select('title slug excerpt featuredImage category subCategory tags author publishedAt readingTimeMinutes views isBreaking language')
        .limit(100)
        .lean();

      // Multi-factor hybrid ranking algorithm
      const scoredPosts = allCandidates.map((post) => {
        let score = 0;
        const now = Date.now();
        const publishedTime = new Date(post.publishedAt || post.createdAt).getTime();
        const ageHours = (now - publishedTime) / (1000 * 60 * 60);

        // 1. Category affinity match
        if (post.category?.slug && userInterests[post.category.slug]) {
          score += (userInterests[post.category.slug] || 0) * 3.5;
        }

        // 2. Subcategory affinity match
        if (post.subCategory?.slug && userInterests[post.subCategory.slug]) {
          score += (userInterests[post.subCategory.slug] || 0) * 4.0;
        }

        // 3. Topic Tag affinity match
        if (Array.isArray(post.tags)) {
          post.tags.forEach((tag) => {
            const cleanTag = tag.trim().toLowerCase();
            if (userInterests[cleanTag]) {
              score += (userInterests[cleanTag] || 0) * 2.5;
            }
          });
        }

        // 4. Recency boost (Fresh news receives priority)
        if (ageHours < 6) score += 12;
        else if (ageHours < 24) score += 8;
        else if (ageHours < 72) score += 4;
        else if (ageHours < 168) score += 2;

        // 5. Breaking news boost
        if (post.isBreaking) score += 6;

        // 6. Popularity logarithmic boost
        const viewsCount = post.views || 0;
        score += Math.log10(Math.max(1, viewsCount)) * 1.5;

        return { ...post, recommendationScore: score };
      });

      // Sort by recommendationScore descending and slice by page
      scoredPosts.sort((a, b) => b.recommendationScore - a.recommendationScore);
      const offset = (page - 1) * limit;
      candidatePosts = scoredPosts.slice(offset, offset + limit);
    }

    // Backfill with top trending / recent articles if candidates are below requested limit
    if (candidatePosts.length < limit) {
      const needed = limit - candidatePosts.length;
      const existingIds = candidatePosts.map((p) => p._id);
      const skip = (page - 1) * limit;

      const backfill = await Post.find({
        ...baseFilter,
        _id: { $nin: existingIds },
      })
        .sort({ isBreaking: -1, views: -1, publishedAt: -1 })
        .skip(hasInterests ? 0 : skip)
        .limit(needed)
        .populate('author', 'name')
        .populate('category', 'name slug nameTranslations')
        .populate('subCategory', 'name slug nameTranslations')
        .select('title slug excerpt featuredImage category subCategory tags author publishedAt readingTimeMinutes views isBreaking language')
        .lean();

      candidatePosts = [...candidatePosts, ...backfill];
    }

    const totalMatching = await Post.countDocuments(baseFilter);

    res.json({
      success: true,
      algorithm: hasInterests ? 'hybrid_personalized_v2' : 'trending_curated_fallback',
      personalized: hasInterests,
      count: candidatePosts.length,
      data: candidatePosts,
      pagination: {
        page,
        limit,
        hasMore: (page * limit) < totalMatching,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Reader Cloud Bookmarks Sync ───────────────────────────────────────────────

/**
 * POST /api/public/user/bookmarks
 * Toggle a bookmark slug in logged-in user history.
 */
export const toggleUserBookmark = async (req, res, next) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug is required' });
    }

    const index = req.user.bookmarks.indexOf(slug);
    if (index === -1) {
      req.user.bookmarks.push(slug);
    } else {
      req.user.bookmarks.splice(index, 1);
    }

    await req.user.save();
    res.json({ success: true, bookmarks: req.user.bookmarks });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/user/bookmarks
 * Get list of synced bookmark slugs for logged-in user.
 */
export const getUserBookmarks = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user.bookmarks || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/user/bookmarks/sync
 * Bulk sync local bookmarks to database on login.
 */
export const syncAllUserBookmarks = async (req, res, next) => {
  try {
    const { slugs } = req.body;
    if (!slugs || !Array.isArray(slugs)) {
      return res.status(400).json({ success: false, message: 'Slugs array is required' });
    }

    // Merge slugs uniquely
    const current = new Set(req.user.bookmarks || []);
    slugs.forEach(s => current.add(s));
    req.user.bookmarks = Array.from(current);

    await req.user.save();
    res.json({ success: true, bookmarks: req.user.bookmarks });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/user/history
 * Returns detailed article items matching the user's reading history.
 */
export const getUserHistory = async (req, res, next) => {
  try {
    const slugs = req.user.readArticles || [];
    
    // Check if the streak needs to be reset
    const now = new Date();
    const lastRead = req.user.lastReadDate;
    if (lastRead) {
      const msDiff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 
                     new Date(lastRead.getFullYear(), lastRead.getMonth(), lastRead.getDate()).getTime();
      const dayDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));
      if (dayDiff > 1) {
        req.user.readingStreak = 0;
        await req.user.save();
      }
    }

    const posts = await Post.find({ slug: { $in: slugs }, status: 'live', deletedAt: null })
      .populate('author', 'name')
      .populate('category', 'name slug')
      .select('title slug excerpt featuredImage category author publishedAt readingTimeMinutes views')
      .lean();

    const postMap = posts.reduce((acc, p) => {
      acc[p.slug] = p;
      return acc;
    }, {});

    const orderedPosts = slugs
      .map(s => postMap[s])
      .filter(Boolean)
      .reverse(); // Return most recently read first

    res.json({ success: true, data: orderedPosts });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/public/user/history
 * Clears the user's reading history list and interests map.
 */
export const clearUserHistory = async (req, res, next) => {
  try {
    req.user.readArticles = [];
    req.user.interests = new Map();
    await req.user.save();
    res.json({ success: true, message: 'Reading history cleared successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/user/tracking
 * Body: { enabled: boolean }
 * Toggles history tracking.
 */
export const toggleUserTracking = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled value must be a boolean' });
    }

    req.user.trackingEnabled = enabled;
    await req.user.save();
    res.json({
      success: true,
      trackingEnabled: req.user.trackingEnabled,
      message: `Reading history tracking has been ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/user/me
 * Returns reader's details.
 */
export const getReaderProfile = async (req, res, next) => {
  try {
    const now = new Date();
    const lastRead = req.user.lastReadDate;
    if (lastRead) {
      const msDiff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 
                     new Date(lastRead.getFullYear(), lastRead.getMonth(), lastRead.getDate()).getTime();
      const dayDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));
      if (dayDiff > 1) {
        req.user.readingStreak = 0;
        await req.user.save();
      }
    }

    res.json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        readingStreak: req.user.readingStreak || 0,
        lastReadDate: req.user.lastReadDate || null,
        trackingEnabled: req.user.trackingEnabled !== false,
        bookmarks: req.user.bookmarks || [],
        isPremiumUser: req.user.isPremiumUser === true,
        monthlyViewsCount: req.user.monthlyViewsCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/user/subscribe
 * Mock endpoint to upgrade reader to Premium.
 */
export const subscribeUser = async (req, res, next) => {
  try {
    req.user.isPremiumUser = true;
    await req.user.save();
    res.json({
      success: true,
      isPremiumUser: req.user.isPremiumUser,
      message: 'Successfully upgraded to Premium Subscription (Mock)!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/user/unsubscribe
 * Mock endpoint to downgrade reader.
 */
export const unsubscribeUser = async (req, res, next) => {
  try {
    req.user.isPremiumUser = false;
    req.user.monthlyViewsCount = 0; // Reset metered counts
    await req.user.save();
    res.json({
      success: true,
      isPremiumUser: req.user.isPremiumUser,
      message: 'Successfully unsubscribed from Premium (Mock)!'
    });
  } catch (error) {
    next(error);
  }
};
