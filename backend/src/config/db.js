import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB with connection reuse for serverless (Vercel) environments.
 */
export const connectDB = async () => {
  // Reuse existing connection if already connected (readyState 1) or connecting (readyState 2)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const uri = env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.warn('Warning: MONGODB_URI is not defined in environment variables.');
      return null;
    }

    const conn = await mongoose.connect(uri, {
      bufferCommands: false, // Disable command buffering in serverless to prevent hangs on cold starts
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};
