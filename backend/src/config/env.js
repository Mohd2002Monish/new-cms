import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Placeholder values from .env.example must never be accepted as real secrets.
const PLACEHOLDER_SECRETS = new Set([
  'your_super_secret_jwt_access_key_change_me',
  'your_super_secret_jwt_refresh_key_change_me',
  'jwt_access_secret_fallback',
  'jwt_refresh_secret_fallback',
]);

const requireSecret = (name) => {
  const value = process.env[name];
  const missing = !value || PLACEHOLDER_SECRETS.has(value) || value.length < 32;
  if (!missing) return value;
  if (isProduction) {
    throw new Error(
      `FATAL: ${name} is missing, a known placeholder, or shorter than 32 chars. ` +
      `Set a strong random value (e.g. \`openssl rand -hex 32\`) before starting in production.`
    );
  }
  console.warn(
    `[env] WARNING: ${name} is missing or weak — using a random per-boot secret. ` +
    `All tokens will be invalidated on restart. Set ${name} in backend/.env.`
  );
  return crypto.randomBytes(48).toString('hex');
};

if (isProduction && !process.env.MONGO_URI) {
  throw new Error('FATAL: MONGO_URI is not set.');
}

export const env = {
  PORT: process.env.PORT || 3030,
  NODE_ENV,
  MONGODB_URI: process.env.MONGO_URI,
  JWT_SECRET: requireSecret('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireSecret('JWT_REFRESH_SECRET'),
  ALLOW_STATIC_OTP: process.env.ALLOW_STATIC_OTP === 'true',
  TRUST_PROXY: process.env.TRUST_PROXY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  EMAIL_SERVICE_API_KEY: process.env.EMAIL_SERVICE_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@newscms.com',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
};
