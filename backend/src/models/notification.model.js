import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      // Examples: 'POST_APPROVED', 'POST_REJECTED', 'POST_SUBMITTED', 'USER_STATUS_TOGGLED'
    },
    message: {
      type: String,
      required: true,
    },
    relatedModel: {
      type: String,
      enum: ['Post', 'User', 'Category', 'System'],
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Adding TTL index for notifications (e.g. keep for 90 days)
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 90, // 90 days
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
