import mongoose from 'mongoose';

const promptHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: '',
    },
    userName: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      enum: ['generate-article', 'suggest-metadata', 'edit-article'],
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    instruction: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'en',
    },
    title: {
      type: String,
      default: '',
    },
    resultSummary: {
      type: String,
      default: '',
    },
    resultHtml: {
      type: String,
      default: '',
    },
    suggestions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isMocked: {
      type: Boolean,
      default: false,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    provider: {
      type: String,
      default: 'gemini',
    },
    model: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

promptHistorySchema.index({ userId: 1, createdAt: -1 });
promptHistorySchema.index({ action: 1, createdAt: -1 });

export const PromptHistory =
  mongoose.models.PromptHistory || mongoose.model('PromptHistory', promptHistorySchema);

export default PromptHistory;
