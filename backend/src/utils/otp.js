import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

import { SystemSetting } from '../models/SystemSetting.js';

// Generate random 6-digit string.
// The static dev OTP requires an explicit opt-in AND is hard-disabled in production.
export const generateOTP = () => {
  if (env.ALLOW_STATIC_OTP && env.NODE_ENV !== 'production') {
    return '123456';
  }
  return crypto.randomInt(100000, 1000000).toString();
};

// Send OTP via Email (Nodemailer setup with dynamic DB configuration)
export const sendOTPEmail = async (email, otp) => {
  try {
    // Check dynamic settings in DB first, fallback to environment
    const dbSmtp = await SystemSetting.getSetting('smtp', null);
    const host = dbSmtp?.host || env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(dbSmtp?.port || env.SMTP_PORT) || 587;
    const secure = dbSmtp?.secure !== undefined ? Boolean(dbSmtp.secure) : (port === 465);
    const user = dbSmtp?.user || env.SMTP_USER;
    const pass = dbSmtp?.pass || env.SMTP_PASS;
    const from = dbSmtp?.fromEmail
      ? (dbSmtp.fromName ? `"${dbSmtp.fromName}" <${dbSmtp.fromEmail}>` : dbSmtp.fromEmail)
      : (env.EMAIL_FROM || 'noreply@newscms.com');

    const isConfigured = user && pass;

    if (!isConfigured) {
      if (env.NODE_ENV === 'production') {
        console.error(`SMTP is not configured — refusing to silently skip OTP delivery for ${email}`);
        return false;
      }
      console.log(`[DEV ONLY] Email OTP for ${email}: ${otp}`);
      return true;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to: email,
      subject: 'News CMS - Login Verification OTP',
      text: `Your 2-Factor Authentication OTP code is: ${otp}. It will expire in 5 minutes.`,
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2>News CMS Verification</h2>
        <p>Your 2-Factor Authentication OTP code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; color: #4a6da4; margin: 10px 0;">${otp}</h1>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
      </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Error sending email OTP to ${email}:`, error.message);
    // Print to console to avoid locking out developers in test environments
    console.log(`[FALLBACK LOG] Email OTP for ${email}: ${otp}`);
    return false;
  }
};

// Send OTP via SMS (Twilio placeholder stub)
export const sendOTPSMS = async (phoneNumber, otp) => {
  try {
    const isConfigured = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER;
    
    if (!isConfigured) {
      console.log(`[TESTING OTP BYPASS] SMS OTP for ${phoneNumber}: ${otp}`);
      return true;
    }

    // Dynamic import to avoid Twilio dependency issues if not installed/needed
    const twilio = (await import('twilio')).default;
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your News CMS security code is: ${otp}. Expires in 5 minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`SMS OTP sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error(`Error sending SMS OTP to ${phoneNumber}:`, error.message);
    console.log(`[FALLBACK LOG] SMS OTP for ${phoneNumber}: ${otp}`);
    return false;
  }
};

// Access token (15 mins)
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, status: user.status },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Refresh token (7 days)
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};
