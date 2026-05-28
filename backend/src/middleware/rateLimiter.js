import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import { env } from '../config/env.js';

// Strict: OTP generation endpoint (Login)
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // max 5 OTP requests per IP per 15 min
  store: new MongoStore({
    uri: env.MONGODB_URI,
    collectionName: 'rate_limits',
    expireTimeMs: 15 * 60 * 1000,
  }),
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: OTP verification (prevent brute force of code)
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                  // max 10 attempts
  store: new MongoStore({
    uri: env.MONGODB_URI,
    collectionName: 'rate_limits',
    expireTimeMs: 10 * 60 * 1000,
  }),
  message: { success: false, message: 'Too many failed verification attempts. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: All API routes
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // limit each IP to 200 requests per windowMs
  store: new MongoStore({
    uri: env.MONGODB_URI,
    collectionName: 'rate_limits',
    expireTimeMs: 60 * 1000,
  }),
  message: { success: false, message: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
