import mongoose from 'mongoose';

// @desc    Get all active rate limits
// @route   GET /api/admin/rate-limits
// @access  Private (Admin only)
export const getRateLimits = async (req, res, next) => {
  try {
    const rateLimitsCollection = mongoose.connection.db.collection('rate_limits');
    
    // rate-limit-mongo uses '_id' for IP/identifier, 'counter' for count, and 'expirationDate' for expiration
    const limits = await rateLimitsCollection.find({}).sort({ expirationDate: 1 }).toArray();
    
    const mappedLimits = limits.map(doc => ({
      key: doc._id,
      hits: doc.counter,
      expireAt: doc.expirationDate,
    }));
    
    res.status(200).json({
      success: true,
      data: mappedLimits
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
    
    await rateLimitsCollection.deleteOne({ _id: id });
    
    res.status(200).json({
      success: true,
      message: 'Rate limit cleared for this IP'
    });
  } catch (error) {
    next(error);
  }
};
