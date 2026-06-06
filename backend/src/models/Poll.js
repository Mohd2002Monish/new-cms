import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Poll question is required'],
    trim: true,
  },
  options: [{
    text: { type: String, required: true, trim: true },
    votes: { type: Number, default: 0 }
  }],
  voters: [{ type: String }] // Hashed IP hashes to prevent duplicate voting
}, {
  timestamps: true
});

export const Poll = mongoose.model('Poll', pollSchema);
