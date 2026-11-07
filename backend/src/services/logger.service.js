import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Logs directory inside backend/logs (only in non-serverless environments)
const logsDir = path.resolve(__dirname, '../../logs');
if (!isServerless) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[logger] Failed to create logs directory, operating in console-only mode:', err.message);
  }
}

const COMBINED_LOG_PATH = path.join(logsDir, 'combined.log');
const ERROR_LOG_PATH = path.join(logsDir, 'error.log');
const AI_PROMPTS_LOG_PATH = path.join(logsDir, 'ai-prompts.log');

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per log file

/**
 * Append formatted log line to file safely with size rotation.
 */
function appendToFile(filePath, message) {
  if (isServerless) return;
  try {
    // Prevent unlimited log file expansion
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        // Keep file bounded: truncate when it exceeds 5MB
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n');
        // Keep last 1000 lines
        const trimmed = lines.slice(-1000).join('\n');
        fs.writeFileSync(filePath, trimmed, 'utf8');
      }
    }
    const timestamp = new Date().toISOString();
    fs.appendFileSync(filePath, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err) {
    console.error(`[logger] Failed to write to log file ${filePath}:`, err.message);
  }
}

export const logger = {
  info(message) {
    const line = typeof message === 'object' ? JSON.stringify(message) : message;
    appendToFile(COMBINED_LOG_PATH, `[INFO] ${line}`);
  },

  warn(message) {
    const line = typeof message === 'object' ? JSON.stringify(message) : message;
    appendToFile(COMBINED_LOG_PATH, `[WARN] ${line}`);
  },

  error(message, error = null) {
    const errorDetails = error ? ` | Stack: ${error.stack || error.message || error}` : '';
    const line = (typeof message === 'object' ? JSON.stringify(message) : message) + errorDetails;
    appendToFile(ERROR_LOG_PATH, `[ERROR] ${line}`);
    appendToFile(COMBINED_LOG_PATH, `[ERROR] ${line}`);
  },

  /**
   * Log HTTP requests and responses
   */
  http(req, res, durationMs) {
    const user = req.user ? `${req.user.email} (${req.user.role})` : 'guest';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-';
    const logLine = `${req.method} ${req.originalUrl || req.url} status:${res.statusCode} ${durationMs}ms - user:${user} ip:${ip}`;
    
    appendToFile(COMBINED_LOG_PATH, `[HTTP] ${logLine}`);
    if (res.statusCode >= 400) {
      appendToFile(ERROR_LOG_PATH, `[HTTP_FAIL] ${logLine}`);
    }
  },

  /**
   * Structured logger specifically for all AI prompts and generation history
   */
  aiPrompt(entry) {
    const record = {
      timestamp: new Date().toISOString(),
      action: entry.action || 'AI_ACTION',
      user: entry.user ? { id: entry.user._id, email: entry.user.email, role: entry.user.role } : 'system',
      prompt: entry.prompt || '',
      language: entry.language || 'en',
      isMocked: Boolean(entry.isMocked),
      durationMs: entry.durationMs || 0,
      metadata: entry.metadata || {},
      preview: entry.preview || '',
    };
    appendToFile(AI_PROMPTS_LOG_PATH, JSON.stringify(record));
    appendToFile(COMBINED_LOG_PATH, `[AI_PROMPT] ${entry.action} by ${record.user.email || 'system'} (${entry.durationMs}ms)`);
  },

  paths: {
    logsDir,
    combined: COMBINED_LOG_PATH,
    error: ERROR_LOG_PATH,
    aiPrompts: AI_PROMPTS_LOG_PATH,
  },
};

export default logger;
