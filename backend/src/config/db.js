import mongoose from 'mongoose';
import { env } from './env.js';

let cachedPromise = null;

/**
 * Connect to MongoDB with connection reuse for serverless (Vercel) environments.
 * Uses a shared cached promise so concurrent cold-start requests wait for the
 * connection handshake to finish before executing queries.
 */
export const connectDB = async () => {
  // Return immediately if already fully connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    const uri = env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.warn('Warning: MONGODB_URI is not defined in environment variables.');
      return null;
    }

    cachedPromise = mongoose.connect(uri, {
      bufferCommands: true, // Allow Mongoose to buffer commands during handshake
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 2,
      family: 4, // Force IPv4 to eliminate slow dual-stack DNS timeouts
    }).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }).catch((error) => {
      cachedPromise = null;
      console.error(`MongoDB Connection Error: ${error.message}`);
      throw error;
    });
  }

  return cachedPromise;
};
