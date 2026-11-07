import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';

import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import categoryRoutes from './src/routes/categories.js';
import postRoutes from './src/routes/posts.js';
import mediaRoutes from './src/routes/media.js';
import auditLogRoutes from './src/routes/auditLogs.js';
import rateLimitRoutes from './src/routes/rateLimits.js';
import notificationRoutes from './src/routes/notifications.js';
import reportRoutes from './src/routes/reports.js';
import publicRoutes from './src/routes/public.js';
import aiRoutes from './src/routes/ai.js';
import chatRoutes from './src/routes/chat.js';
import settingsRoutes from './src/routes/settings.js';
import { globalApiLimiter } from './src/middleware/rateLimiter.js';

const app = express();

// On Vercel Serverless, internal rewrites (e.g. /(.*) -> /api/index.js) can set req.url
// to the rewritten destination path. Restore the client's actual requested path.
app.use((req, res, next) => {
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (matched && (req.url === '/api/index.js' || req.url === '/api/index' || req.url === '/api')) {
    req.url = matched;
  }
  next();
});

// Behind a reverse proxy / CDN, req.ip must resolve to the real client IP
// for rate limiting and audit logs to work per-user.
if (env.TRUST_PROXY) {
  app.set('trust proxy', Number(env.TRUST_PROXY) || env.TRUST_PROXY);
}

// Security headers. CSP is disabled because this server only serves a JSON API
// consumed by separate frontends; cross-origin policies stay relaxed for CORS clients.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

import logger from './src/services/logger.service.js';

// Middlewares
// Allowed origins: admin panel (Vite) + public portal (Next.js)
const allowedOrigins
  = [
  process.env.CLIENT_URL || 'http://localhost:5173', // Admin panel
  process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000', // Public portal
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

// Public endpoints are openly accessible without credentials, enabling edge caching on Vercel CDN
app.use('/api/public', cors({
  origin: '*',
  credentials: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (_) {}
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// Request timing & file logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration);
  });
  next();
});

app.use(express.json({ limit: '10mb' })); // Allow larger payloads for Tiptap JSON content
app.use(cookieParser());
// Strip $-prefixed keys and dots from user input to block NoSQL operator injection
app.use(mongoSanitize());

// Apply global API rate limit
app.use('/api', globalApiLimiter);

// Health check
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'News CMS API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Ensure MongoDB is connected for API routes (cached across serverless invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[serverless-db] Connection error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database service is initializing or temporarily unavailable. Please retry.',
    });
  }
});

// Route handlers
app.use('/api/auth',              authRoutes);
app.use('/api/users',             userRoutes);
app.use('/api/categories',        categoryRoutes);
app.use('/api/posts',             postRoutes);
app.use('/api/media',             mediaRoutes);
app.use('/api/notifications',     notificationRoutes);
app.use('/api/admin/audit-logs',  auditLogRoutes);
app.use('/api/admin/rate-limits', rateLimitRoutes);
app.use('/api/admin/reports',     reportRoutes);
app.use('/api/admin/ai',          aiRoutes);
app.use('/api/admin/settings',    settingsRoutes);
app.use('/api/chat',              chatRoutes);

// Public routes — no authentication required
app.use('/api/public', publicRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const user = req.user ? `${req.user.email} (${req.user.role})` : 'guest';
  logger.error(`[${req.method} ${req.originalUrl || req.url}] status:${status} user:${user} - ${err.message}`, err);

  // Never leak internal error details (stack-adjacent messages) in production
  const message =
    status < 500 || env.NODE_ENV !== 'production'
      ? err.message || 'Internal Server Error'
      : 'Internal Server Error';
  res.status(status).json({ success: false, message });
});

export default app;
