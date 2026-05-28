import mongoose from 'mongoose';

// @desc    Get all active rate limits
// @route   GET /api/admin/rate-limits
// @access  Private (Admin only)
export const getRateLimits = async (req, res, next) => {
  try {
    const rateLimitsCollection = mongoose.connection.db.collection('rate_limits');
    
    // Default rate-limit-mongo uses 'key' for IP/identifier, 'hits' for count, and 'expireAt' or 'resetTime'
    const limits = await rateLimitsCollection.find({}).sort({ expireAt: 1 }).toArray();
    
    res.status(200).json({
      success: true,
      data: limits
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear a specific rate limit
// @route   DELETE /api/admin/rate-limits/:id
// @access  Private (Admin only)
export const deleteRateLimit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rateLimitsCollection = mongoose.connection.db.collection('rate_limits');
    
    await rateLimitsCollection.deleteOne({ key: id });
    
    res.status(200).json({
      success: true,
      message: 'Rate limit cleared for this IP'
    });
  } catch (error) {
    next(error);
  }
};
