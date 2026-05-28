import mongoose from 'mongoose';

const articleCommentSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  authorName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isApproved: {
    type: Boolean,
    default: true, // Auto-approved as per user decision (Option A without admin moderation)
  },
  ipAddress: {
    type: String,
    required: true, // for basic spam detection if needed later
  }
}, { timestamps: true });

export const ArticleComment = mongoose.model('ArticleComment', articleCommentSchema);
