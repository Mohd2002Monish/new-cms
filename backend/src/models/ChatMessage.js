import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'audio', 'pdf', 'doc'],
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  mimeType: {
    type: String,
    default: '',
  },
  publicId: {
    type: String,
    default: '',
  },
});

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null, // Null for group/channel messages
    },
    channel: {
      type: String,
      enum: ['editorial-desk', 'urgent-news', 'general', null],
      default: null,
      index: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: [attachmentSchema],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Compound indexes for fast conversation fetching
chatMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
chatMessageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });
chatMessageSchema.index({ channel: 1, createdAt: -1 });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
