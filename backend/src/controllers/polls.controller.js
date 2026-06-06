import { Poll } from '../models/Poll.js';
import crypto from 'crypto';

/**
 * POST /api/polls
 * Create a new poll (Editor/Manager/Admin).
 */
export const createPoll = async (req, res, next) => {
  try {
    const { question, options } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question and at least two options are required' });
    }

    const poll = await Poll.create({
      question,
      options: options.map(opt => ({ text: opt, votes: 0 }))
    });

    res.status(201).json({ success: true, data: poll });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/polls/:id
 * Retrieve a poll's current voting details.
 */
export const getPublicPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    // Determine if the client has already voted in this poll
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
    const hasVoted = poll.voters.includes(ipHash);

    res.json({
      success: true,
      data: {
        _id: poll._id,
        question: poll.question,
        options: poll.options.map(opt => ({
          _id: opt._id,
          text: opt.text,
          votes: opt.votes
        })),
        hasVoted,
        totalVotes: poll.voters.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/polls/:id/vote
 * Submit a vote for an option in the poll.
 */
export const voteInPoll = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      return res.status(400).json({ success: false, message: 'optionId is required' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    // Uniqueness constraint using IP hashes
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');

    if (poll.voters.includes(ipHash)) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    // Locate matching subdocument option
    const option = poll.options.id(optionId);
    if (!option) {
      return res.status(400).json({ success: false, message: 'Invalid option selected' });
    }

    option.votes += 1;
    poll.voters.push(ipHash);
    await poll.save();

    res.json({
      success: true,
      data: {
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        hasVoted: true,
        totalVotes: poll.voters.length
      }
    });
  } catch (error) {
    next(error);
  }
};
