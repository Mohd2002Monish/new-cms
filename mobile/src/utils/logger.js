import storage from './storage';

const MAX_LOGS = 250;
const memoryLogs = [];
let saveTimeout = null;

function formatLogEntry(level, tag, message, data = null) {
  const timestamp = new Date().toISOString();
  let details = '';
  if (data !== null && data !== undefined) {
    if (data instanceof Error) {
      details = ` | Error: ${data.message}\nStack: ${data.stack || 'No stack'}`;
    } else if (typeof data === 'object') {
      try {
        details = ` | ${JSON.stringify(data)}`;
      } catch (_) {
        details = ` | [Circular/Unserializable]`;
      }
    } else {
      details = ` | ${String(data)}`;
    }
  }
  return {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp,
    level,
    tag: tag || 'APP',
    message: String(message),
    details,
    rawText: `[${timestamp}] [${level}] [${tag || 'APP'}] ${message}${details}`,
  };
}

function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    try {
      const serialized = JSON.stringify(memoryLogs.slice(-MAX_LOGS));
      await storage.setItem('@app_logs', serialized);
    } catch (_) {}
  }, 1000);
}

export const logger = {
  info(tag, message, data = null) {
    const entry = formatLogEntry('INFO', tag, message, data);
    memoryLogs.push(entry);
    if (memoryLogs.length > MAX_LOGS) memoryLogs.shift();
    if (__DEV__) console.log(entry.rawText);
    return entry;
  },

  warn(tag, message, data = null) {
    const entry = formatLogEntry('WARN', tag, message, data);
    memoryLogs.push(entry);
    if (memoryLogs.length > MAX_LOGS) memoryLogs.shift();
    if (__DEV__) console.warn(entry.rawText);
    return entry;
  },

  error(tag, message, error = null) {
    const entry = formatLogEntry('ERROR', tag, message, error);
    memoryLogs.push(entry);
    if (memoryLogs.length > MAX_LOGS) memoryLogs.shift();
    console.error(entry.rawText);
    scheduleSave(); // Only persist to disk when an error occurs

    // Persist as last crash if high priority
    try {
      storage.setItem(
        '@last_crash',
        JSON.stringify({
          timestamp: entry.timestamp,
          tag: entry.tag,
          message: entry.message,
          details: entry.details,
        })
      );
    } catch (_) {}

    return entry;
  },

  async getLogs() {
    if (memoryLogs.length > 0) {
      return [...memoryLogs];
    }
    try {
      const saved = await storage.getItem('@app_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memoryLogs.push(...parsed);
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  },

  async getLastCrash() {
    try {
      const saved = await storage.getItem('@last_crash');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  },

  async clearLogs() {
    memoryLogs.length = 0;
    try {
      await storage.removeItem('@app_logs');
      await storage.removeItem('@last_crash');
    } catch (_) {}
  },
};

export default logger;

