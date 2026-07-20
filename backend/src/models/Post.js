import mongoose from 'mongoose';
import { slugify, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../utils/slugify.js';

// ─── Tiptap reading time helper ──────────────────────────────────────────────

/**
 * Recursively extract plain text from a Tiptap/ProseMirror JSON document.
 */
function extractTextFromTiptapJSON(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (!node.content || !Array.isArray(node.content)) return '';
  return node.content.map(extractTextFromTiptapJSON).join(' ');
}

/**
 * Calculate estimated reading time in minutes (200 wpm average).
 */
export function calcReadingTime(tiptapJson) {
  if (!tiptapJson) return 1;
  const text = extractTextFromTiptapJSON(tiptapJson);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

const POST_STATUSES = ['draft', 'pending_approval', 'approved', 'scheduled', 'live', 'rejected'];

const embedSchema = new mongoose.Schema({
  type: { type: String, enum: ['youtube', 'twitter', 'instagram', 'custom'] },
  url: String,
  html: String, // raw embed HTML snapshot
}, { _id: false });

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // Content language. NOTE: the text index below must keep a custom
  // language_override — MongoDB would otherwise read this field as a text-index
  // language and reject 'hi'/'gu' as unsupported.
  language: {
    type: String,
    enum: SUPPORTED_LANGUAGES,
    default: DEFAULT_LANGUAGE,
    index: true,
  },
  // Articles that are translations of each other share a translationGroup,
  // enabling hreflang alternates and "read in हिन्दी/ગુજરાતી" links.
  translationGroup: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true,
  },
  // Tiptap JSON document object
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Rendered HTML snapshot (generated server-side or at publish)
  contentHtml: {
    type: String,
    default: '',
  },
  excerpt: {
    type: String,
    default: '',
    maxlength: [500, 'Excerpt cannot exceed 500 characters'],
  },
  featuredImage: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }, // Cloudinary public_id
    alt: { type: String, default: '' },
  },
  seo: {
    metaTitle:       { type: String, maxlength: 60, default: '' },
    metaDescription: { type: String, maxlength: 160, default: '' },
    ogTitle:         { type: String, default: '' },
    ogDescription:   { type: String, default: '' },
    ogImage:         { type: String, default: '' },
    canonicalUrl:    { type: String, default: '' },
    noIndex:         { type: Boolean, default: false },
    focusKeyword:    { type: String, default: '' },
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  tags: [{ type: String, trim: true, lowercase: true }],
  embeds: [embedSchema],
  status: {
    type: String,
    enum: POST_STATUSES,
    default: 'draft',
  },
  isBreaking: {
    type: Boolean,
    default: false,
  },
  isSlider: {
    type: Boolean,
    default: false,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  sliderOrder: {
    type: Number,
    default: 0,
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal',
  },
  breakingExpiresAt: {
    type: Date,
    default: null,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coAuthors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  scheduledPublishAt: {
    type: Date,
    default: null,
  },
  views: {
    type: Number,
    default: 0,
  },
  // Calculated reading time in minutes (updated on every content save)
  readingTimeMinutes: {
    type: Number,
    default: 1,
  },
  isLiveBlog: {
    type: Boolean,
    default: false,
  },
  liveUpdates: [{
    title: { type: String, required: true },
    content: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now }
  }],
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, {
  timestamps: true,
});

// Auto-generate slug from title + compute reading time
postSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    // Unicode-aware: Hindi/Gujarati titles keep their native script in the slug
    const base = slugify(this.title) || 'article';
    this.slug = `${base}-${Date.now()}`;
  }

  // Recalculate reading time whenever the Tiptap JSON content changes
  if (this.isModified('content') && this.content) {
    this.readingTimeMinutes = calcReadingTime(this.content);
  }

  next();
});

// Pre-find middleware to exclude soft-deleted records
postSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Text index for search.
// default_language 'none' disables English stemming/stop-words so Hindi and
// Gujarati tokens are indexed as-is; language_override points at a field that
// does not exist so our own `language` field is never misread by MongoDB.
// (Run scripts/migrate-multilingual.js once to replace the old English-analyzer index.)
postSchema.index(
  { title: 'text', excerpt: 'text', tags: 'text' },
  { default_language: 'none', language_override: 'textIndexLanguageOverride' }
);

// Compound indexes matching the hot query paths (public lists, trending,
// category pages, admin list sorted by updatedAt) — language leads the public
// paths since every reader-facing query is now language-scoped.
postSchema.index({ language: 1, status: 1, deletedAt: 1, publishedAt: -1 });
postSchema.index({ language: 1, status: 1, deletedAt: 1, views: -1 });
postSchema.index({ category: 1, status: 1, publishedAt: -1 });
postSchema.index({ author: 1, updatedAt: -1 });

export const Post = mongoose.model('Post', postSchema);
