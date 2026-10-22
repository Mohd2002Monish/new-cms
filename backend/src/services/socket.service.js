import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatMessage } from '../models/ChatMessage.js';
import * as presenceService from './presence.service.js';
import * as notification from './notification.service.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CORS_ORIGIN || 'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // JWT Authentication middleware for sockets
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      // Treat invalid token as guest instead of rejecting connection
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const isStaff = socket.user && ['admin', 'manager', 'editor'].includes(socket.user.role);

    console.log(
      `[socket] Connected: ${socket.id} (User: ${socket.user ? socket.user.id : 'Guest'}, Role: ${socket.user ? socket.user.role : 'none'})`
    );

    if (socket.user) {
      const userId = socket.user.id;
      socket.join(`user_${userId}`);

      if (isStaff) {
        // Staff joins shared staff room and newsroom channels
        socket.join('staff_room');
        socket.join('channel_editorial-desk');
        socket.join('channel_urgent-news');
        socket.join('channel_general');

        // Register presence as 'active' on connection
        const presenceUpdate = presenceService.setUserConnected(userId, socket.id, socket.user);
        if (presenceUpdate) {
          io.to('staff_room').emit('presence_update', presenceUpdate);
        }
      }
    }

    // ─── Teams-style Presence Event ──────────────────────────────────────────
    // Client emits when tab is hidden/blurred ('away') or visible/active ('active')
    socket.on('presence_status', ({ status }) => {
      if (!socket.user || !isStaff) return;
      const update = presenceService.setUserPresence(socket.user.id, status);
      if (update) {
        io.to('staff_room').emit('presence_update', update);
      }
    });

    // Client requests all current staff presence
    socket.on('get_all_presence', (callback) => {
      if (typeof callback === 'function') {
        callback(presenceService.getAllPresence());
      }
    });

    // ─── Real-time Chat Messaging ─────────────────────────────────────────────
    socket.on('send_chat_message', async (data, ack) => {
      if (!socket.user || !isStaff) {
        if (typeof ack === 'function') ack({ success: false, message: 'Unauthorized' });
        return;
      }

      try {
        const { recipientId, channel, text, attachments = [] } = data;

        if (!text && (!attachments || attachments.length === 0)) {
          if (typeof ack === 'function') ack({ success: false, message: 'Message cannot be empty' });
          return;
        }

        const message = await ChatMessage.create({
          sender: socket.user.id,
          recipient: recipientId || null,
          channel: channel || null,
          text: text || '',
          attachments: attachments || [],
          readBy: [socket.user.id],
        });

        const populated = await ChatMessage.findById(message._id)
          .populate('sender', 'name email role')
          .lean();

        if (recipientId) {
          // Direct 1-on-1 message: deliver to both recipient & sender
          io.to(`user_${recipientId}`).emit('receive_chat_message', populated);
          io.to(`user_${socket.user.id}`).emit('receive_chat_message', populated);

          // Push into the top notification bar
          const previewText =
            text ||
            (attachments.length > 0
              ? `Sent an attachment (${attachments[0].fileName})`
              : 'New message');

          await notification.create({
            recipientId,
            type: 'NEW_CHAT_MESSAGE',
            message: `💬 ${populated.sender?.name || 'Staff'}: ${previewText}`,
            relatedModel: 'ChatMessage',
            relatedId: message._id,
          });
        } else if (channel) {
          // Channel message: deliver to everyone in channel
          io.to(`channel_${channel}`).emit('receive_chat_message', populated);
        }

        if (typeof ack === 'function') {
          ack({ success: true, data: populated });
        }
      } catch (err) {
        console.error('[chat] Socket send_chat_message error:', err);
        if (typeof ack === 'function') ack({ success: false, message: err.message });
      }
    });

    // ─── Typing Indicator ─────────────────────────────────────────────────────
    socket.on('chat_typing', ({ recipientId, channel, isTyping }) => {
      if (!socket.user) return;
      const payload = {
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping: Boolean(isTyping),
        channel,
      };

      if (recipientId) {
        io.to(`user_${recipientId}`).emit('user_typing', payload);
      } else if (channel) {
        socket.to(`channel_${channel}`).emit('user_typing', payload);
      }
    });

    // ─── Mark as Read ─────────────────────────────────────────────────────────
    socket.on('mark_chat_read', async ({ senderId, channel }) => {
      if (!socket.user) return;
      const currentUserId = socket.user.id;

      try {
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

        if (senderId) {
          io.to(`user_${senderId}`).emit('messages_read_by', {
            readByUserId: currentUserId,
          });
        }
      } catch (err) {
        console.warn('[chat] Error marking read via socket:', err.message);
      }
    });

    // ─── Live Blog Room Handling (Public Readers) ─────────────────────────────
    socket.on('join_article', (slug) => {
      socket.join(`article_${slug}`);
    });

    socket.on('leave_article', (slug) => {
      socket.leave(`article_${slug}`);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.user && isStaff) {
        const update = presenceService.setUserDisconnected(socket.user.id, socket.id);
        if (update && update.status === 'offline') {
          io.to('staff_room').emit('presence_update', update);
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const emitToUser = (userId, eventName, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(eventName, data);
  }
};
