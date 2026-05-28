import Notification from '../models/notification.model.js';
import { emitToUser } from './socket.service.js';

/**
 * Creates a new notification.
 * @param {Object} data
 * @param {mongoose.Types.ObjectId|string} data.recipientId - User to receive notification
 * @param {string} data.type - Event type
 * @param {string} data.message - Human readable text
 * @param {string} data.relatedModel - Model name ('Post', 'User', etc)
 * @param {mongoose.Types.ObjectId|string} data.relatedId - ID of related object
 */
export const create = async ({ recipientId, type, message, relatedModel, relatedId }) => {
  try {
    const notif = await Notification.create({
      recipientId,
      type,
      message,
      relatedModel,
      relatedId,
    });

    emitToUser(recipientId.toString(), 'new_notification', notif);

    return notif;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - we don't want to break the main transaction just because a notification failed
  }
};
