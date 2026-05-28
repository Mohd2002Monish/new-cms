import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/admin/audit-logs
 * List audit logs with pagination and filters
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, actorId, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (actorId) filter.actorId = actorId;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('actorId', 'name email'), // Populate actor basic info just in case
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/audit-logs/:id
 * Get a specific audit log detail
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('actorId', 'name email');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
