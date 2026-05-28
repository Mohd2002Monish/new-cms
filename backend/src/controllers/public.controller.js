import { Post } from '../models/Post.js';
import { Category } from '../models/Category.js';
import { ArticleReaction } from '../models/ArticleReaction.js';
import { ArticleComment } from '../models/ArticleComment.js';
import crypto from 'crypto';

// ─── Internal fields stripped from every public response ─────────────────────
const PUBLIC_POST_FIELDS = `-rejectionReason -deletedAt -deletedBy -reviewedBy
  -reviewedAt -submittedAt -assignedManager -coAuthors`;

// ─── View deduplication (in-memory, 1-hour TTL per IP+slug) ──────────────────
// Key: `${ip}:${slug}`, Value: timestamp of last view
const viewLog = new Map();
const VIEW_TTL_MS = 60 * 60 * 1000; // 1 hour

function isRecentView(ip, slug) {
  const key = `${ip}:${slug}`;
  const ts  = viewLog.get(key);
  if (ts && Date.now() - ts < VIEW_TTL_MS) return true;
  viewLog.set(key, Date.now());

  // Prune stale entries when the map grows large (prevent memory leak)
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
      tag,
      author,
      page  = 1,
      limit = 12,
      sort  = 'latest',
      slugs,
      isSlider,
    } = req.query;

    const filter = { status: 'live', deletedAt: null };

    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) filter.category = cat._id;
      else return res.json({
        success: true, data: [],
        pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 },
      });
    }

    if (tag)    filter.tags   = tag.toLowerCase();
    if (author) filter.author = author;
    if (slugs)  filter.slug   = { $in: slugs.split(',').map(s => s.trim()) };
    if (isSlider === 'true') filter.isSlider = true;

    const sortMap = {
      latest:  { publishedAt: -1 },
      popular: { views: -1, publishedAt: -1 },
      slider:  { sliderOrder: 1, publishedAt: -1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortMap[sort] || sortMap.latest)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author',   'name')
        .populate('category', 'name slug')
        .select(`title slug excerpt featuredImage seo category tags
                 publishedAt updatedAt isBreaking priority readingTimeMinutes views`)
        .lean(),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
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

    const posts = await Post.find({ status: 'live', deletedAt: null })
      .sort({ views: -1, publishedAt: -1 })
      .limit(limit)
      .populate('author',   'name')
      .populate('category', 'name slug')
      .select('title slug featuredImage category author publishedAt readingTimeMinutes views isBreaking')
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
    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null })
      .populate('author',   'name')
      .populate('category', 'name slug description')
      .select(PUBLIC_POST_FIELDS)
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: post });
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

    // Find up to 20 recent articles in the same category (excluding current)
    const recentCategoryPosts = await Post.find({
      _id: { $ne: currentPost._id },
      category: currentPost.category,
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
    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown')
      .split(',')[0].trim();

    // Skip if this IP already viewed this article in the last hour
    if (isRecentView(ip, slug)) {
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
      .select('name slug description order')
      .lean();

    res.json({ success: true, data: categories });
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
    const skip      = (parseInt(page) - 1) * safeLimit;

    // Build filter
    const filter = {
      status:    'live',
      deletedAt: null,
      $text:     { $search: q.trim() },
    };

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

    // Run search + count in parallel
    const [posts, total] = await Promise.all([
      Post.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('author',   'name')
        .populate('category', 'name slug')
        .select(`title slug excerpt featuredImage seo category tags
                 publishedAt updatedAt isBreaking priority readingTimeMinutes views`)
        .lean(),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data:    posts,
      meta: {
        query: q.trim(),
        total,
      },
      pagination: {
        total,
        page:  parseInt(page),
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

    if (isRecent) {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      filter.publishedAt = { $gte: fortyEightHoursAgo };
    }

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .limit(1000) // Sanity limit
      .populate('category', 'name')
      .select('title slug publishedAt updatedAt tags')
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
    const posts = await Post.find({
      status: 'live',
      deletedAt: null,
      isBreaking: true,
      $or: [
        { breakingExpiresAt: null },
        { breakingExpiresAt: { $gt: new Date() } }
      ]
    })
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
    if (!authorName || !body) {
      return res.status(400).json({ success: false, message: 'authorName and body are required' });
    }

    const post = await Post.findOne({ slug: req.params.slug, status: 'live', deletedAt: null });
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

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
