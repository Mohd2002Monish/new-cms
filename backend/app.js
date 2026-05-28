import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

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
import { globalApiLimiter } from './src/middleware/rateLimiter.js';

const app = express();

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

// Public routes — no authentication required
app.use('/api/public', publicRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
