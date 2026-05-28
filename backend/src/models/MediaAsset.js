import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema({
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  mimeType: String,
  sizeBytes: Number,
  width: Number,
  height: Number,
  altText: {
    type: String,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
