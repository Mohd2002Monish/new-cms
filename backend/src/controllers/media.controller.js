import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { Post } from '../models/Post.js';
import * as audit from '../services/audit.service.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const getUploadSignature = (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = req.body.folder || 'news-cms';

    const paramsToSign = {
      timestamp,
      folder,
      ...(req.body.public_id ? { public_id: req.body.public_id } : {}),
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        folder,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate upload signature' });
  }
};

export const listMedia = async (req, res, next) => {
  try {
    const { search, tag, page = 1, limit = 20 } = req.query;
    
    const query = { deletedAt: null };
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { altText: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [assets, total] = await Promise.all([
      MediaAsset.find(query)
        .populate('uploadedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MediaAsset.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: assets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerMedia = async (req, res, next) => {
  try {
    const { fileName, cloudinaryPublicId, url, thumbnailUrl, mimeType, sizeBytes, width, height, altText, tags } = req.body;

    if (!cloudinaryPublicId || !url) {
      return res.status(400).json({ success: false, message: 'Missing required Cloudinary response data' });
    }

    const asset = await MediaAsset.create({
      uploadedBy: req.user._id,
      fileName: fileName || 'Untitled',
      cloudinaryPublicId,
      url,
      thumbnailUrl: thumbnailUrl || url,
      mimeType,
      sizeBytes,
      width,
      height,
      altText,
      tags: tags || [],
    });

    await asset.populate('uploadedBy', 'name email role');
    
    await audit.log({
      req, action: 'MEDIA_UPLOADED', targetType: 'MediaAsset', targetId: asset._id, targetLabel: asset.fileName
    });

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

export const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { altText, tags } = req.body;

    const asset = await MediaAsset.findOne({ _id: id, deletedAt: null });
    if (!asset) return res.status(404).json({ success: false, message: 'Media asset not found' });

    if (altText !== undefined) asset.altText = altText;
    if (tags !== undefined) asset.tags = tags;

    await asset.save();
    
    await audit.log({
      req, action: 'MEDIA_UPDATED', targetType: 'MediaAsset', targetId: asset._id, targetLabel: asset.fileName
    });

    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const asset = await MediaAsset.findOne({ _id: id, deletedAt: null });
    if (!asset) return res.status(404).json({ success: false, message: 'Media asset not found' });

    // Check if image is in use in any non-deleted post
    // This looks for the cloudinaryPublicId string inside the contentHtml or featuredImage
    const isInUse = await Post.exists({
      deletedAt: null,
      $or: [
        { contentHtml: { $regex: asset.cloudinaryPublicId, $options: 'i' } },
        { 'featuredImage.url': { $regex: asset.cloudinaryPublicId, $options: 'i' } }
      ]
    });

    if (isInUse) {
      return res.status(400).json({ success: false, message: 'Cannot delete image. It is currently in use in a post.' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(asset.cloudinaryPublicId);

    // Soft delete from DB
    asset.deletedAt = new Date();
    await asset.save();

    await audit.log({
      req, action: 'MEDIA_DELETED', targetType: 'MediaAsset', targetId: asset._id, targetLabel: asset.fileName
    });

    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    next(error);
  }
};
