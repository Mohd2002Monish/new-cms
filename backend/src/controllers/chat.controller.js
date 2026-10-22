import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { ChatMessage } from '../models/ChatMessage.js';
import { User } from '../models/User.js';
import * as presenceService from '../services/presence.service.js';
import * as notification from '../services/notification.service.js';
import { getIO } from '../services/socket.service.js';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/chat/staff
 * Get all staff members (admin, manager, editor) with live presence and unread counts.
 */
export const getStaffUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Fetch all active staff
    const staff = await User.find({
      role: { $in: ['admin', 'manager', 'editor'] },
      status: 'active',
      _id: { $ne: currentUserId }, // Exclude self
    })
      .select('name email role lastLogin')
      .lean();

    // Enrich with presence and unread counts
    const staffList = await Promise.all(
      staff.map(async (u) => {
        const presence = presenceService.getPresence(u._id);

        // Count unread messages sent by this user to the current user
        const unreadCount = await ChatMessage.countDocuments({
          sender: u._id,
          recipient: currentUserId,
          readBy: { $ne: currentUserId },
        });

        // Find the latest message between current user and this staff member
        const lastMsg = await ChatMessage.findOne({
          $or: [
            { sender: currentUserId, recipient: u._id },
            { sender: u._id, recipient: currentUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .select('text attachments createdAt sender')
          .lean();

        return {
          ...u,
          presence,
          unreadCount,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text,
                hasAttachment: lastMsg.attachments && lastMsg.attachments.length > 0,
                createdAt: lastMsg.createdAt,
                isMine: lastMsg.sender.toString() === currentUserId.toString(),
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/messages
 * Get conversation messages for a direct message (recipientId) or channel.
 */
export const getMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { recipientId, channel, limit = 50, before } = req.query;

    const query = {};

    if (channel) {
      query.channel = channel;
    } else if (recipientId) {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
      }
      query.$or = [
        { sender: currentUserId, recipient: recipientId },
        { sender: recipientId, recipient: currentUserId },
      ];
    } else {
      return res.status(400).json({ success: false, message: 'Specify recipientId or channel' });
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(Math.min(parseInt(limit) || 50, 100))
      .populate('sender', 'name email role')
      .lean();

    // Mark messages as read by current user in background
    if (recipientId) {
      ChatMessage.updateMany(
        {
          sender: recipientId,
          recipient: currentUserId,
          readBy: { $ne: currentUserId },
        },
        { $addToSet: { readBy: currentUserId } }
      ).catch(() => {});
    }

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/sign-upload
 * Generate signature for client-to-Cloudinary upload.
 * Supports images, audio, video, and raw documents (PDF, DOC, DOCX, etc.).
 */
export const signUpload = async (req, res) => {
  try {
    const { fileType = 'image' } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'news-cms/chat';

    // Map fileType to Cloudinary resource_type
    // 'image' -> 'image', 'video' & 'audio' -> 'video', 'pdf' & 'doc' -> 'raw'
    let resourceType = 'image';
    if (fileType === 'video' || fileType === 'audio') {
      resourceType = 'video';
    } else if (fileType === 'pdf' || fileType === 'doc') {
      resourceType = 'raw';
    }

    const paramsToSign = {
      timestamp,
      folder,
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
        resourceType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to sign chat upload' });
  }
};

/**
 * POST /api/chat/send
 * REST endpoint to send a message (fallback if WebSocket is unavailable).
 */
export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { recipientId, channel, text, attachments = [] } = req.body;

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: 'Message text or attachment required' });
    }

    const message = await ChatMessage.create({
      sender: senderId,
      recipient: recipientId || null,
      channel: channel || null,
      text: text || '',
      attachments: attachments || [],
      readBy: [senderId],
    });

    const populated = await ChatMessage.findById(message._id)
      .populate('sender', 'name email role')
      .lean();

    // Broadcast via Socket.io
    try {
      const io = getIO();
      if (recipientId) {
        // Direct message
        io.to(`user_${recipientId}`).emit('receive_chat_message', populated);
        io.to(`user_${senderId}`).emit('receive_chat_message', populated);

        // Trigger top notification bar
        await notification.create({
          recipientId,
          type: 'NEW_CHAT_MESSAGE',
          message: `💬 ${req.user.name}: ${text || (attachments.length > 0 ? `Sent an attachment (${attachments[0].fileName})` : 'New message')}`,
          relatedModel: 'ChatMessage',
          relatedId: message._id,
        });
      } else if (channel) {
        // Channel message
        io.to(`channel_${channel}`).emit('receive_chat_message', populated);
      }
    } catch (e) {
      console.warn('[chat] Socket emit error:', e.message);
    }

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/chat/mark-read
 * Mark all messages from a user as read.
 */
export const markAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { senderId, channel } = req.body;

    const filter = { readBy: { $ne: currentUserId } };
    if (channel) {
      filter.channel = channel;
    } else if (senderId) {
      filter.sender = senderId;
      filter.recipient = currentUserId;
    }

    await ChatMessage.updateMany(filter, {
      $addToSet: { readBy: currentUserId },
    });

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
};
