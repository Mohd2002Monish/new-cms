import { PostComment } from '../models/PostComment.js';
import { Post } from '../models/Post.js';
import * as audit from '../services/audit.service.js';

export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const comments = await PostComment.find({ postId })
      .populate('authorId', 'name email role')
      .populate('replies.authorId', 'name email role')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: 1 });
      
    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { paragraphKey, body } = req.body;

    if (!paragraphKey || !body) {
      return res.status(400).json({ success: false, message: 'paragraphKey and body are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await PostComment.create({
      postId,
      paragraphKey,
      authorId: req.user._id,
      body,
    });

    await comment.populate('authorId', 'name email role');

    await audit.log({
      req, action: 'COMMENT_CREATED', targetType: 'PostComment', targetId: comment._id, targetLabel: `Comment on ${post.title}`
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ success: false, message: 'Reply body is required' });
    }

    const comment = await PostComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    comment.replies.push({
      authorId: req.user._id,
      body,
    });

    await comment.save();
    
    // We want to return the populated comment so the frontend can display the new reply
    await comment.populate('authorId', 'name email role');
    await comment.populate('replies.authorId', 'name email role');
    await comment.populate('resolvedBy', 'name email');

    res.json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const resolveComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { isResolved } = req.body;

    const comment = await PostComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    comment.isResolved = isResolved;
    comment.resolvedBy = isResolved ? req.user._id : null;
    comment.resolvedAt = isResolved ? new Date() : null;

    await comment.save();

    await comment.populate('authorId', 'name email role');
    await comment.populate('replies.authorId', 'name email role');
    await comment.populate('resolvedBy', 'name email');

    res.json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    
    const comment = await PostComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only admin, or the original comment author can delete
    if (req.user.role !== 'admin' && comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    await audit.log({
      req, action: 'COMMENT_DELETED', targetType: 'PostComment', targetId: comment._id, targetLabel: `Deleted Comment Thread`
    });

    res.json({ success: true, message: 'Comment thread deleted' });
  } catch (error) {
    next(error);
  }
};
