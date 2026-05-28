import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';

/**
 * Helper: Build match criteria for a date range
 */
const getDateRangeMatch = (from, to) => {
  const match = { deletedAt: null };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  return match;
};

/**
 * GET /api/admin/reports/overview
 */
export const getOverview = async (req, res, next) => {
  try {
    const [totalPosts, totalUsers, totalCategories, activeUsers30d] = await Promise.all([
      Post.countDocuments({ deletedAt: null }),
      User.countDocuments({ deletedAt: null }),
      Category.countDocuments({ deletedAt: null }),
      User.countDocuments({
        deletedAt: null,
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const postStatuses = await Post.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalPosts,
        totalUsers,
        totalCategories,
        activeUsers30d,
        postStatuses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/posts-over-time
 * Params: from, to, groupBy (day|week|month)
 */
export const getPostsOverTime = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    
    let format = '%Y-%m-%d';
    if (groupBy === 'month') format = '%Y-%m';
    if (groupBy === 'year') format = '%Y';

    const match = { deletedAt: null, publishedAt: { $ne: null } };
    if (from || to) {
      match.publishedAt = {};
      if (from) match.publishedAt.$gte = new Date(from);
      if (to) match.publishedAt.$lte = new Date(to);
    }

    const data = await Post.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$publishedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/editor-output
 */
export const getEditorOutput = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = getDateRangeMatch(from, to);
    match.status = { $in: ['live', 'approved', 'scheduled'] }; // Consider 'productive' output

    const data = await Post.aggregate([
      { $match: match },
      { $group: { _id: '$author', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'authorDoc'
        }
      },
      { $unwind: '$authorDoc' },
      {
        $project: {
          name: '$authorDoc.name',
          count: 1
        }
      }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/turnaround
 */
export const getTurnaroundStats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = getDateRangeMatch(from, to);
    match.status = { $in: ['approved', 'rejected', 'live', 'scheduled'] };
    match.submittedAt = { $ne: null };
    match.reviewedAt = { $ne: null };

    const data = await Post.aggregate([
      { $match: match },
      {
        $project: {
          turnaroundHours: {
            $divide: [
              { $subtract: ['$reviewedAt', '$submittedAt'] },
              3600000 // ms to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTurnaround: { $avg: '$turnaroundHours' },
          minTurnaround: { $min: '$turnaroundHours' },
          maxTurnaround: { $max: '$turnaroundHours' }
        }
      }
    ]);

    res.json({ success: true, data: data[0] || { avgTurnaround: 0 } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/rejection-rate
 */
export const getRejectionRate = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = getDateRangeMatch(from, to);
    match.status = { $in: ['approved', 'live', 'scheduled', 'rejected'] };

    const data = await Post.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$author',
          totalReviewed: { $sum: 1 },
          totalRejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          author: '$_id',
          totalReviewed: 1,
          totalRejected: 1,
          rejectionRate: {
            $multiply: [{ $divide: ['$totalRejected', '$totalReviewed'] }, 100]
          }
        }
      },
      { $sort: { rejectionRate: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorDoc'
        }
      },
      { $unwind: '$authorDoc' },
      {
        $project: {
          name: '$authorDoc.name',
          totalReviewed: 1,
          totalRejected: 1,
          rejectionRate: 1
        }
      }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/category-dist
 */
export const getCategoryDist = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = getDateRangeMatch(from, to);

    const data = await Post.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'catDoc'
        }
      },
      {
        $project: {
          name: {
            $cond: {
              if: { $gt: [{ $size: '$catDoc' }, 0] },
              then: { $arrayElemAt: ['$catDoc.name', 0] },
              else: 'Uncategorized'
            }
          },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/manager-workload
 */
export const getManagerWorkload = async (req, res, next) => {
  try {
    const data = await Post.aggregate([
      { $match: { deletedAt: null, status: 'pending_approval' } },
      {
        $group: {
          _id: '$assignedManager',
          pendingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'managerDoc'
        }
      },
      {
        $project: {
          name: {
            $cond: {
              if: { $gt: [{ $size: '$managerDoc' }, 0] },
              then: { $arrayElemAt: ['$managerDoc.name', 0] },
              else: 'Unassigned (Admins)'
            }
          },
          pendingCount: 1
        }
      },
      { $sort: { pendingCount: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
