/**
 * Presence Service — Microsoft Teams-style Real-time Status Tracker
 * Tracks user states: 'active', 'away', 'offline'
 */

// In-memory presence map: userId -> { status, lastActiveAt, socketIds: Set<string>, user: { id, name, role } }
const presenceRegistry = new Map();

/**
 * Register when a user connects a socket.
 */
export function setUserConnected(userId, socketId, userMeta = null) {
  if (!userId) return null;

  const idStr = userId.toString();
  let record = presenceRegistry.get(idStr);

  if (!record) {
    record = {
      status: 'active',
      lastActiveAt: new Date(),
      socketIds: new Set([socketId]),
      user: userMeta || { id: idStr },
    };
    presenceRegistry.set(idStr, record);
  } else {
    record.socketIds.add(socketId);
    record.status = 'active'; // Default to active on new connection
    record.lastActiveAt = new Date();
    if (userMeta) record.user = userMeta;
  }

  return {
    userId: idStr,
    status: record.status,
    lastActiveAt: record.lastActiveAt,
  };
}

/**
 * Update user presence status ('active' or 'away') based on browser tab visibility / idle state.
 */
export function setUserPresence(userId, status) {
  if (!userId) return null;

  const idStr = userId.toString();
  const record = presenceRegistry.get(idStr);

  if (!record) return null;

  if (status === 'active' || status === 'away') {
    record.status = status;
    record.lastActiveAt = new Date();
  }

  return {
    userId: idStr,
    status: record.status,
    lastActiveAt: record.lastActiveAt,
  };
}

/**
 * Handle socket disconnection.
 */
export function setUserDisconnected(userId, socketId) {
  if (!userId) return null;

  const idStr = userId.toString();
  const record = presenceRegistry.get(idStr);

  if (!record) return null;

  record.socketIds.delete(socketId);

  // If user has no more active socket tabs open, mark as offline
  if (record.socketIds.size === 0) {
    record.status = 'offline';
    record.lastActiveAt = new Date();
    return {
      userId: idStr,
      status: 'offline',
      lastActiveAt: record.lastActiveAt,
    };
  }

  return {
    userId: idStr,
    status: record.status,
    lastActiveAt: record.lastActiveAt,
  };
}

/**
 * Get presence of a specific user.
 */
export function getPresence(userId) {
  if (!userId) return { status: 'offline', lastActiveAt: null };

  const idStr = userId.toString();
  const record = presenceRegistry.get(idStr);

  if (!record || record.status === 'offline') {
    return {
      status: 'offline',
      lastActiveAt: record?.lastActiveAt || null,
    };
  }

  return {
    status: record.status,
    lastActiveAt: record.lastActiveAt,
  };
}

/**
 * Get all current presence records for staff list.
 */
export function getAllPresence() {
  const result = {};
  for (const [id, record] of presenceRegistry.entries()) {
    result[id] = {
      status: record.status,
      lastActiveAt: record.lastActiveAt,
    };
  }
  return result;
}
