import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { env } from './src/config/env.js';

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
import { globalApiLimiter } from './src/middleware/rateLimiter.js';

const app = express();

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

// Middlewares
// Allowed origins: admin panel (Vite) + public portal (Next.js)
const allowedOrigins = [
  process.env.CLIENT_URL         || 'http://localhost:5173', // Admin panel
  process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000', // Public portal
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman, same-origin SSR)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for Tiptap JSON content
app.use(cookieParser());
// Strip $-prefixed keys and dots from user input to block NoSQL operator injection
app.use(mongoSanitize());

// Apply global API rate limit
app.use('/api', globalApiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'News CMS API is running' });
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
  // Never leak internal error details (stack-adjacent messages) in production
  const message =
    status < 500 || env.NODE_ENV !== 'production'
      ? err.message || 'Internal Server Error'
      : 'Internal Server Error';
  res.status(status).json({ success: false, message });
});

export default app;
