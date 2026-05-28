import { PostRevision } from '../models/PostRevision.js';
import { Post } from '../models/Post.js';
import * as postRevisionService from '../services/postRevision.service.js';
import * as audit from '../services/audit.service.js';

export const getRevisions = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Access control: editors can only view their own post revisions
    if (req.user.role === 'editor') {
      const isOwner = post.author.toString() === req.user._id.toString();
      const isCoAuthor = post.coAuthors.some(id => id.toString() === req.user._id.toString());
      if (!isOwner && !isCoAuthor) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const revisions = await PostRevision.find({ postId: req.params.id })
      .sort({ version: -1 })
      .populate('savedBy', 'name email');

    res.json({ success: true, data: revisions });
  } catch (error) {
    next(error);
  }
};

export const restoreRevision = async (req, res, next) => {
  try {
    const { id, version } = req.params;
    
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const isOwner = post.author.toString() === req.user._id.toString();
    const isCoAuthor = post.coAuthors.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    // Same rules as editing: must be author, co-author or admin, and post must be draft/rejected
    if (!isOwner && !isCoAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only author, co-author or admin can restore revisions' });
    }
    
    const editableStatuses = ['draft', 'rejected'];
    if (!editableStatuses.includes(post.status) && !isAdmin) {
      return res.status(409).json({ success: false, message: `Cannot restore while post is ${post.status}` });
    }

    const revision = await PostRevision.findOne({ postId: id, version: parseInt(version) });
    if (!revision) return res.status(404).json({ success: false, message: 'Revision not found' });

    // Restore data
    post.title = revision.title || post.title;
    post.content = revision.content;
    post.contentHtml = revision.contentHtml;
    post.excerpt = revision.excerpt || '';
    post.category = revision.category || null;
    post.tags = revision.tags || [];
    post.featuredImage = revision.featuredImage || { url: '', publicId: '', alt: '' };
    post.seo = revision.seo || { metaTitle: '', metaDescription: '', ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', noIndex: false, focusKeyword: '' };
    post.coAuthors = revision.coAuthors || [];
    post.isBreaking = revision.isBreaking || false;
    post.priority = revision.priority || 'normal';
    post.breakingExpiresAt = revision.breakingExpiresAt || null;
    
    if (post.status === 'rejected') {
      post.status = 'draft';
    }

    await post.save();
    
    // Create new snapshot for the restored state
    await postRevisionService.snapshot(post, req.user._id);

    await audit.log({
      req, action: 'POST_REVISION_RESTORED', targetType: 'Post', targetId: post._id, targetLabel: post.title,
      newState: { restoredFromVersion: revision.version }
    });

    res.json({ success: true, message: `Restored version ${revision.version}`, data: post });
  } catch (error) {
    next(error);
  }
};
