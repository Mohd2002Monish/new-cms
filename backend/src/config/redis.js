import Redis from 'ioredis';
import { env } from './env.js';

let redisClient = null;
let isConnected = false;

// Fallback in-memory cache if Redis is not connected or down
const inMemoryCache = new Map();

/**
 * Initialize Redis connection with automatic reconnect and error suppression.
 * If Redis is unavailable, the application gracefully degrades to in-memory caching.
 */
export function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          // Stop reconnecting after 3 attempts to avoid log spam when Redis is offline
          return null;
        }
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[redis] Successfully connected to Redis server.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Friendly non-crashing warning
      if (err.code === 'ECONNREFUSED') {
        console.warn('[redis] Redis connection refused at 127.0.0.1:6379. Operating in fallback in-memory mode.');
      } else {
        console.warn('[redis] Error:', err.message);
      }
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt initial connect asynchronously
    redisClient.connect().catch(() => {
      isConnected = false;
      console.warn('[redis] Redis is offline. Running with in-memory fallback.');
    });
  } catch (error) {
    console.warn('[redis] Failed to initialize Redis client. Fallback to in-memory.', error.message);
    redisClient = null;
  }

  return redisClient;
}

/**
 * Check if Redis is actively connected and ready to accept commands.
 */
export function isRedisReady() {
  return isConnected && redisClient && redisClient.status === 'ready';
}

export { inMemoryCache };
