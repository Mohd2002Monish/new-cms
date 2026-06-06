import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import Joi from 'joi';
import { getIO } from '../services/socket.service.js';
import * as audit from '../services/audit.service.js';
import * as notification from '../services/notification.service.js';
import * as postRevisionService from '../services/postRevision.service.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.object().optional().allow(null),
  contentHtml: Joi.string().optional().allow('', null),
  excerpt: Joi.string().max(500).allow('').optional(),
  category: Joi.string().hex().length(24).optional().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  featuredImage: Joi.object({
    url: Joi.string().optional().allow(null, ''),   // accepts https:// and data: URIs
    publicId: Joi.string().optional().allow(null, ''),
    alt: Joi.string().max(200).optional().allow(''),
  }).optional().allow(null),
  seo: Joi.object({
    metaTitle: Joi.string().max(60).optional().allow(''),
    metaDescription: Joi.string().max(160).optional().allow(''),
    ogTitle: Joi.string().optional().allow(''),
    ogDescription: Joi.string().optional().allow(''),
    ogImage: Joi.string().optional().allow(''),
    canonicalUrl: Joi.string().optional().allow(''),
    noIndex: Joi.boolean().optional(),
    focusKeyword: Joi.string().optional().allow(''),
  }).optional().allow(null),
  isBreaking: Joi.boolean().optional(),
  isSlider: Joi.boolean().optional(),
  sliderOrder: Joi.number().optional(),
  priority: Joi.string().valid('normal', 'high', 'urgent').optional(),
  breakingExpiresAt: Joi.date().optional().allow(null),
  coAuthors: Joi.array().items(Joi.string().hex().length(24)).optional(),
  status: Joi.string().valid('draft', 'live', 'pending_approval').optional(),
  isLiveBlog: Joi.boolean().optional(),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  content: Joi.object().optional().allow(null),
  contentHtml: Joi.string().optional().allow('', null),
  excerpt: Joi.string().max(500).allow('').optional(),
  category: Joi.string().hex().length(24).optional().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  featuredImage: Joi.object({
    url: Joi.string().optional().allow(null, ''),   // accepts https:// and data: URIs
    publicId: Joi.string().optional().allow(null, ''),
    alt: Joi.string().max(200).optional().allow(''),
  }).optional().allow(null),
  seo: Joi.object({
    metaTitle: Joi.string().max(60).optional().allow(''),
    metaDescription: Joi.string().max(160).optional().allow(''),
    ogTitle: Joi.string().optional().allow(''),
    ogDescription: Joi.string().optional().allow(''),
    ogImage: Joi.string().optional().allow(''),
    canonicalUrl: Joi.string().optional().allow(''),
    noIndex: Joi.boolean().optional(),
    focusKeyword: Joi.string().optional().allow(''),
  }).optional().allow(null),
  isBreaking: Joi.boolean().optional(),
  isSlider: Joi.boolean().optional(),
  sliderOrder: Joi.number().optional(),
  priority: Joi.string().valid('normal', 'high', 'urgent').optional(),
  breakingExpiresAt: Joi.date().optional().allow(null),
  coAuthors: Joi.array().items(Joi.string().hex().length(24)).optional(),
  status: Joi.string().valid('draft', 'live', 'pending_approval').optional(),
  isLiveBlog: Joi.boolean().optional(),
});

const rejectSchema = Joi.object({
  reason: Joi.string().min(5).max(1000).required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the MongoDB filter based on user role for list queries.
 */
function buildVisibilityFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') {
    return { assignedManager: user._id };
  }
  // editor: only own posts or posts where they are a co-author
  return { $or: [{ author: user._id }, { coAuthors: user._id }] };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/posts
 * List posts with role-based visibility, pagination, and status filter.
 */
export const getPosts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search, category, showDeleted } = req.query;
    const filter = buildVisibilityFilter(req.user);

    if (showDeleted === 'true' && req.user.role === 'admin') {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .setOptions({ includeDeleted: showDeleted === 'true' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'name email role')
        .populate('coAuthors', 'name email role')
        .populate('assignedManager', 'name email')
        .populate('category', 'name slug')
        .select('-content'), // exclude heavy Tiptap JSON in list view
      Post.countDocuments(filter).setOptions({ includeDeleted: showDeleted === 'true' }),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/posts/:id
 * Get a single post with full content (Tiptap JSON included).
 */
export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email role')
      .populate('coAuthors', 'name email role')
      .populate('assignedManager', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('category', 'name slug');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Access control: editors can only read their own posts or posts they co-author
    if (req.user.role === 'editor') {
      const isOwner = post.author._id.toString() === req.user._id.toString();
      const isCoAuthor = post.coAuthors.some(c => c._id.toString() === req.user._id.toString());
      if (!isOwner && !isCoAuthor) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    // Managers can only read posts assigned to them
    if (req.user.role === 'manager' && post.assignedManager?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/posts
 * Create a new draft post.
 */
export const createPost = async (req, res, next) => {
  try {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    if (req.user.role === 'editor') {
      delete value.isBreaking;
      delete value.priority;
      delete value.breakingExpiresAt;
      delete value.coAuthors;
    }

    if (req.user.role !== 'admin') {
      delete value.status;
    }

    // Determine assigned manager: use editor's assignedManager field
    let assignedManager = null;
    if (req.user.role === 'editor') {
      const editorDoc = await User.findById(req.user._id).select('assignedManager');
      assignedManager = editorDoc?.assignedManager || null;
    } else if (req.user.role === 'manager') {
      assignedManager = req.user._id;
    }

    // Determine status & publication time
    let status = 'draft';
    let publishedAt = null;
    if (req.user.role === 'admin' && value.status === 'live') {
      status = 'live';
      publishedAt = new Date();
    }

    const post = await Post.create({
      ...value,
      author: req.user._id,
      assignedManager,
      status,
      publishedAt,
    });

    await audit.log({
      req, action: 'POST_CREATED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      newState: { status }
    });

    await postRevisionService.snapshot(post, req.user._id);

    res.status(201).json({ success: true, message: 'Post created as draft', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/posts/:id
 * Update post content (only while draft or rejected).
 */
export const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Only the author, co-authors, or admin can edit
    const isOwner = post.author.toString() === req.user._id.toString();
    const isCoAuthor = post.coAuthors.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isCoAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the author, co-authors, or admin can edit this post' });
    }

    // Lifecycle: only draft or rejected posts can be freely edited
    const editableStatuses = ['draft', 'rejected'];
    if (!editableStatuses.includes(post.status) && !isAdmin) {
      return res.status(409).json({
        success: false,
        message: `Post cannot be edited while in "${post.status}" state`,
      });
    }

    const { error, value } = updatePostSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (req.user.role === 'editor') {
      delete value.isBreaking;
      delete value.priority;
      delete value.breakingExpiresAt;
      delete value.coAuthors;
    }

    if (req.user.role !== 'admin') {
      delete value.status;
    }

    // If editing a rejected post, move it back to draft
    if (post.status === 'rejected') value.status = 'draft';

    // If admin is publishing directly
    if (req.user.role === 'admin' && value.status === 'live') {
      if (!post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    const previousState = { title: post.title, status: post.status };
    Object.assign(post, value);
    await post.save();

    await audit.log({
      req, action: 'POST_UPDATED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      previousState, newState: { title: post.title, status: post.status }
    });

    await postRevisionService.snapshot(post, req.user._id);

    res.json({ success: true, message: 'Post updated', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/posts/:id/submit
 * Editor submits a draft for manager approval.
 */
export const submitPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const isOwner = post.author.toString() === req.user._id.toString();
    const isCoAuthor = post.coAuthors.some(id => id.toString() === req.user._id.toString());
    if (!isOwner && !isCoAuthor) {
      return res.status(403).json({ success: false, message: 'Only authors or co-authors can submit this post' });
    }

    if (post.status !== 'draft' && post.status !== 'rejected') {
      return res.status(409).json({ success: false, message: `Cannot submit a post in "${post.status}" state` });
    }

    const previousState = { status: post.status };
    post.status = 'pending_approval';
    post.submittedAt = new Date();
    await post.save();

    await audit.log({
      req, action: 'POST_SUBMITTED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      previousState, newState: { status: 'pending_approval' }
    });

    if (post.assignedManager) {
      await notification.create({
        recipientId: post.assignedManager,
        type: 'POST_SUBMITTED',
        message: `A new post "${post.title}" has been submitted for your review.`,
        relatedModel: 'Post',
        relatedId: post._id,
      });
    } else {
      // Notify admins if no manager assigned
      const admins = await User.find({ role: 'admin', status: 'active' });
      for (const admin of admins) {
        await notification.create({
          recipientId: admin._id,
          type: 'POST_SUBMITTED',
          message: `A new post "${post.title}" has been submitted and needs review.`,
          relatedModel: 'Post',
          relatedId: post._id,
        });
      }
    }

    res.json({ success: true, message: 'Post submitted for approval', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/posts/:id/approve
 * Manager or Admin approves and publishes a pending post.
 */
export const approvePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.status !== 'pending_approval') {
      return res.status(409).json({ success: false, message: 'Only pending posts can be approved' });
    }

    // Manager can only approve posts assigned to them
    if (req.user.role === 'manager' && post.assignedManager?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the assigned manager for this post' });
    }

    const { scheduledPublishAt, isBreaking, priority, breakingExpiresAt } = req.body;
    let newStatus = 'live';
    let publishedAt = new Date();
    
    if (scheduledPublishAt) {
      const scheduledDate = new Date(scheduledPublishAt);
      if (scheduledDate > new Date()) {
        newStatus = 'scheduled';
        publishedAt = null;
        post.scheduledPublishAt = scheduledDate;
      }
    }

    if (isBreaking !== undefined) post.isBreaking = isBreaking;
    if (priority !== undefined) post.priority = priority;
    if (breakingExpiresAt !== undefined) post.breakingExpiresAt = breakingExpiresAt;

    const previousState = { status: post.status };
    post.status = newStatus;
    post.reviewedBy = req.user._id;
    post.reviewedAt = new Date();
    if (publishedAt) post.publishedAt = publishedAt;
    post.rejectionReason = null;
    await post.save();

    await audit.log({
      req, action: newStatus === 'scheduled' ? 'POST_SCHEDULED' : 'POST_APPROVED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      previousState, newState: { status: newStatus, scheduledPublishAt: post.scheduledPublishAt }
    });

    await notification.create({
      recipientId: post.author,
      type: newStatus === 'scheduled' ? 'POST_SCHEDULED' : 'POST_APPROVED',
      message: newStatus === 'scheduled' 
        ? `Your post "${post.title}" has been approved and scheduled for ${post.scheduledPublishAt.toLocaleString()}.`
        : `Your post "${post.title}" has been approved and is now live.`,
      relatedModel: 'Post',
      relatedId: post._id,
    });
    
    // Notify co-authors
    for (const coAuthorId of post.coAuthors) {
      await notification.create({
        recipientId: coAuthorId,
        type: newStatus === 'scheduled' ? 'POST_SCHEDULED' : 'POST_APPROVED',
        message: newStatus === 'scheduled' 
          ? `A post you co-authored ("${post.title}") has been scheduled for ${post.scheduledPublishAt.toLocaleString()}.`
          : `A post you co-authored ("${post.title}") has been approved and is now live.`,
        relatedModel: 'Post',
        relatedId: post._id,
      });
    }

    res.json({ success: true, message: `Post ${newStatus}`, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/posts/:id/reject
 * Manager or Admin rejects a pending post with a reason.
 */
export const rejectPost = async (req, res, next) => {
  try {
    const { error, value } = rejectSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.status !== 'pending_approval') {
      return res.status(409).json({ success: false, message: 'Only pending posts can be rejected' });
    }

    if (req.user.role === 'manager' && post.assignedManager?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the assigned manager for this post' });
    }

    const previousState = { status: post.status };
    post.status = 'rejected';
    post.reviewedBy = req.user._id;
    post.reviewedAt = new Date();
    post.rejectionReason = value.reason;
    await post.save();

    await audit.log({
      req, action: 'POST_REJECTED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      previousState, newState: { status: 'rejected', rejectionReason: value.reason }
    });

    await notification.create({
      recipientId: post.author,
      type: 'POST_REJECTED',
      message: `Your post "${post.title}" has been rejected. Reason: ${value.reason}`,
      relatedModel: 'Post',
      relatedId: post._id,
    });

    // Notify co-authors
    for (const coAuthorId of post.coAuthors) {
      await notification.create({
        recipientId: coAuthorId,
        type: 'POST_REJECTED',
        message: `A post you co-authored ("${post.title}") has been rejected. Reason: ${value.reason}`,
        relatedModel: 'Post',
        relatedId: post._id,
      });
    }

    res.json({ success: true, message: 'Post rejected', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/posts/:id
 * Hard-delete a post (Admin only, or author deleting their own draft).
 */
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const isOwner = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Editors can only delete their own drafts
    if (!isAdmin && !(isOwner && post.status === 'draft')) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own draft posts',
      });
    }

    const targetLabel = post.title;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;
    await post.save();
    
    await audit.log({
      req, action: 'POST_DELETED', targetType: 'Post', targetId: post._id, targetLabel,
      previousState: { status: post.status, deletedAt: null }
    });

    res.json({ success: true, message: 'Post soft deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/posts/:id/restore
 * Restore a soft-deleted post (Admin only).
 */
export const restorePost = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const post = await Post.findOne({ _id: req.params.id }).setOptions({ includeDeleted: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    
    if (!post.deletedAt) {
      return res.status(400).json({ success: false, message: 'Post is not deleted' });
    }

    post.deletedAt = null;
    post.deletedBy = null;
    await post.save();

    await audit.log({
      req, action: 'POST_RESTORED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      previousState: { deletedAt: new Date() }, newState: { deletedAt: null }
    });

    res.json({ success: true, message: 'Post restored', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/posts/reorder-slider
 * Reorder slider posts via drag and drop in the admin panel.
 */
export const reorderSlider = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array' });
    }

    // Update each post with its new index in the orderedIds array
    const updates = orderedIds.map((id, index) => {
      return Post.findByIdAndUpdate(id, { sliderOrder: index });
    });

    await Promise.all(updates);

    await audit.log({
      req, action: 'POST_SLIDER_REORDERED', targetType: 'Post', targetLabel: 'Bulk Slider Reorder'
    });

    res.json({ success: true, message: 'Slider order updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/posts/:id/live-updates
 * Adds a rolling live update to a post and pushes it in real-time via Socket.io.
 */
export const addLiveUpdate = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    // Access control: only the author, co-author, or manager/admin can update
    const isOwner = post.author.toString() === req.user._id.toString();
    const isCoAuthor = post.coAuthors.some(id => id.toString() === req.user._id.toString());
    const isAuthorized = ['admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isCoAuthor && !isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot update this live blog' });
    }

    // Add update
    const newUpdate = {
      title,
      content,
      publishedAt: new Date()
    };

    post.liveUpdates.push(newUpdate);
    post.isLiveBlog = true;
    await post.save();

    const savedUpdate = post.liveUpdates[post.liveUpdates.length - 1];

    // Emit live update via Socket.io to the room: article_${post.slug}
    try {
      const io = getIO();
      io.to(`article_${post.slug}`).emit('live_update_added', {
        postSlug: post.slug,
        update: savedUpdate
      });
    } catch (socketErr) {
      console.error('Failed to emit live update via socket', socketErr);
    }

    // Audit log
    await audit.log({
      req, action: 'LIVE_UPDATE_ADDED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      newState: { liveUpdateId: savedUpdate._id }
    });

    res.status(201).json({ success: true, data: savedUpdate });
  } catch (error) {
    next(error);
  }
};
