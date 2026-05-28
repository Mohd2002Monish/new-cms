import AuditLog from '../models/AuditLog.js';

/**
 * Creates an audit log entry.
 * 
 * @param {Object} params
 * @param {Object} [params.req] - Express request object to extract actor details, IP, and User Agent
 * @param {string} params.action - The action performed (e.g., 'POST_APPROVED', 'USER_CREATED')
 * @param {string} params.targetType - Type of target (e.g., 'Post', 'User', 'Category', 'Auth')
 * @param {mongoose.Types.ObjectId|string} [params.targetId] - ID of the target
 * @param {string} [params.targetLabel] - Human-readable label for the target
 * @param {Object} [params.previousState] - State before the action
 * @param {Object} [params.newState] - State after the action
 * @param {Object} [params.actorOverrides] - Optional overrides for actor info if req is not available
 */
export const log = async ({ req, action, targetType, targetId, targetLabel, previousState, newState, actorOverrides }) => {
  try {
    let actorId, actorEmail, actorRole, ipAddress, userAgent;

    if (req) {
      if (req.user) {
        actorId = req.user._id;
        actorEmail = req.user.email;
        actorRole = req.user.role;
      }
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      userAgent = req.headers['user-agent'];
    }

    if (actorOverrides) {
      if (actorOverrides.actorId) actorId = actorOverrides.actorId;
      if (actorOverrides.actorEmail) actorEmail = actorOverrides.actorEmail;
      if (actorOverrides.actorRole) actorRole = actorOverrides.actorRole;
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId,
      targetLabel,
      previousState,
      newState,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // We intentionally don't throw to prevent audit logging failures from breaking core flows
  }
};
