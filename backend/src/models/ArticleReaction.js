import mongoose from 'mongoose';

const articleReactionSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  ip: {
    type: String,
    required: true, // we will hash the IP before saving for privacy
  },
  reaction: {
    type: String,
    enum: ['like', 'love', 'wow', 'angry', 'sad'],
    required: true,
  }
}, { timestamps: true });

// A user (IP) can only leave one reaction per article
articleReactionSchema.index({ articleId: 1, ip: 1 }, { unique: true });

export const ArticleReaction = mongoose.model('ArticleReaction', articleReactionSchema);
