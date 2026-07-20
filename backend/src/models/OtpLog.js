import mongoose from 'mongoose';

const otpLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Auto-delete document when current time equals/exceeds expiresAt
  },
  used: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true
});

// Auth flows look up active OTPs by user
otpLogSchema.index({ userId: 1, used: 1, expiresAt: 1 });

export const OtpLog = mongoose.model('OtpLog', otpLogSchema);
