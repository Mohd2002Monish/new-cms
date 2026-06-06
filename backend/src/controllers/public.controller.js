import { Post } from '../models/Post.js';
import { Category } from '../models/Category.js';
import { ArticleReaction } from '../models/ArticleReaction.js';
import { ArticleComment } from '../models/ArticleComment.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

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
 * GET /api/public/articles/recommendations
 * Returns up to 4 personalized recommendations based on interests.
 */
export const getArticleRecommendations = async (req, res, next) => {
  try {
    const readSlugs = req.user.readArticles || [];
    const userInterests = req.user.interests ? Object.fromEntries(req.user.interests) : {};

    // Sort interest categories by score descending
    const sortedCategories = Object.entries(userInterests)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    let recommendedPosts = [];

    if (sortedCategories.length > 0) {
      // Find category documents to get their IDs
      const categoryDocs = await Category.find({ slug: { $in: sortedCategories }, isActive: true });
      const categoryIdMap = categoryDocs.reduce((acc, cat) => {
        acc[cat.slug] = cat._id;
        return acc;
      }, {});

      // Build target IDs list in sorted order of interest
      const sortedIds = sortedCategories
        .map(slug => categoryIdMap[slug])
        .filter(Boolean);

      if (sortedIds.length > 0) {
        // Query database excluding read articles
        recommendedPosts = await Post.find({
          status: 'live',
          deletedAt: null,
          slug: { $nin: readSlugs },
          category: { $in: sortedIds }
        })
          .populate('author', 'name')
          .populate('category', 'name slug')
          .select('title slug excerpt featuredImage category author publishedAt readingTimeMinutes views isBreaking')
          .limit(4)
          .lean();

        // Sort posts dynamically according to category interest weight
        const idWeights = {};
        sortedIds.forEach((id, idx) => {
          idWeights[id.toString()] = idx;
        });

        recommendedPosts.sort((a, b) => {
          const weightA = idWeights[a.category?._id?.toString()] ?? 999;
          const weightB = idWeights[b.category?._id?.toString()] ?? 999;
          return weightA - weightB;
        });
      }
    }

    // Backfill with general trending/recent posts if we have less than 4 recommendations
    if (recommendedPosts.length < 4) {
      const needed = 4 - recommendedPosts.length;
      const existingIds = recommendedPosts.map(p => p._id);
      
      const backfill = await Post.find({
        status: 'live',
        deletedAt: null,
        _id: { $nin: existingIds },
        slug: { $nin: readSlugs }
      })
        .sort({ views: -1, publishedAt: -1 })
        .limit(needed)
        .populate('author', 'name')
        .populate('category', 'name slug')
        .select('title slug excerpt featuredImage category author publishedAt readingTimeMinutes views isBreaking')
        .lean();

      recommendedPosts = [...recommendedPosts, ...backfill];
    }

    res.json({ success: true, data: recommendedPosts });
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
