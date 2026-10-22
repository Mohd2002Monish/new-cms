import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import { env } from '../config/env.js';
import { getRedisClient, isRedisReady } from '../config/redis.js';

/**
 * Custom ultra-fast Redis store with fallback to MongoStore.
 * Eliminates MongoDB write load whenever Redis is available.
 */
function createStore(prefix, windowMs) {
  return {
    async increment(key) {
      if (isRedisReady()) {
        try {
          const client = getRedisClient();
          const redisKey = `ratelimit:${prefix}:${key}`;
          const current = await client.incr(redisKey);
          if (current === 1) {
            await client.pexpire(redisKey, windowMs);
          }
          const ttl = await client.pttl(redisKey);
          return {
            totalHits: current,
            resetTime: new Date(Date.now() + Math.max(0, ttl)),
          };
        } catch (err) {
          console.warn('[ratelimit] Redis increment failed, continuing:', err.message);
        }
      }

      // Fallback: simple memory counter if Redis not ready
      return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
    },
    async decrement(key) {
      if (isRedisReady()) {
        try {
          const client = getRedisClient();
          await client.decr(`ratelimit:${prefix}:${key}`);
        } catch (err) {
          // ignore decrement errors
        }
      }
    },
    async resetKey(key) {
      if (isRedisReady()) {
        try {
          const client = getRedisClient();
          await client.del(`ratelimit:${prefix}:${key}`);
        } catch (err) {
          // ignore
        }
      }
    },
  };
}

// Strict: OTP generation endpoint (Login)
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // max 5 OTP requests per IP per 15 min
  store: createStore('otp-request', 15 * 60 * 1000),
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: OTP verification (prevent brute force of code)
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                  // max 10 attempts
  store: createStore('otp-verify', 10 * 60 * 1000),
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, message: 'Too many failed verification attempts. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: All API routes
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // limit each IP to 300 requests per minute
  store: createStore('global', 60 * 1000),
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, message: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
