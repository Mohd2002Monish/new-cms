import mongoose from 'mongoose';

const postRevisionSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  version: {
    type: Number,
    required: true,
  },
  title: String,
  content: mongoose.Schema.Types.Mixed,
  contentHtml: String,
  excerpt: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  tags: [String],
  featuredImage: {
    url: String,
    publicId: String,
    alt: String,
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    canonicalUrl: String,
    noIndex: Boolean,
    focusKeyword: String,
  },
  isBreaking: Boolean,
  priority: String,
  breakingExpiresAt: {
    type: Date,
    default: null,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  coAuthors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

postRevisionSchema.index({ postId: 1, version: -1 });

export const PostRevision = mongoose.model('PostRevision', postRevisionSchema);
