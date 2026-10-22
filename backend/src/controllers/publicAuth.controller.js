import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { User } from '../models/User.js';
import { OtpLog } from '../models/OtpLog.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { env } from '../config/env.js';
import {
  generateOTP,
  sendOTPEmail,
  generateAccessToken,
  generateRefreshToken
} from '../utils/otp.js';
import * as audit from '../services/audit.service.js';

// --- Joi Validation Schemas ---
export const readerRegisterSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

export const readerLoginPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const readerSendOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  })
});

export const readerLoginOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  })
});

export const readerForgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  })
});

export const readerResetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
    'any.required': 'New password is required'
  })
});

// --- Controller Actions ---

// @desc    Register a new Reader
// @route   POST /api/public/auth/register
export const registerReader = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'reader',
      status: 'active'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set HTTP-only Cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          readingStreak: user.readingStreak || 0,
          lastReadDate: user.lastReadDate || null,
          trackingEnabled: user.trackingEnabled !== false,
          bookmarks: user.bookmarks || [],
          isPremiumUser: user.isPremiumUser === true,
          monthlyViewsCount: user.monthlyViewsCount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login with Password (Direct, no OTP)
// @route   POST /api/public/auth/login-password
export const loginPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Record login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Set HTTP-only Cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          readingStreak: user.readingStreak || 0,
          lastReadDate: user.lastReadDate || null,
          trackingEnabled: user.trackingEnabled !== false,
          bookmarks: user.bookmarks || [],
          isPremiumUser: user.isPremiumUser === true,
          monthlyViewsCount: user.monthlyViewsCount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to email for OTP Login
// @route   POST /api/public/auth/send-otp
export const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Hash OTP using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Save OTP to logs (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OtpLog.create({
      userId: user._id,
      otp: hashedOtp,
      expiresAt,
      used: false
    });

    // Deliver OTP via email
    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login with OTP
// @route   POST /api/public/auth/login-otp
export const loginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // Verify OTP
    const activeLogs = await OtpLog.find({
      userId: user._id,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    let matchedLog = null;
    for (const log of activeLogs) {
      const isMatch = await bcrypt.compare(otp, log.otp);
      if (isMatch) {
        matchedLog = log;
        break;
      }
    }

    if (!matchedLog) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    matchedLog.used = true;
    await matchedLog.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Record login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Set HTTP-only Cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          readingStreak: user.readingStreak || 0,
          lastReadDate: user.lastReadDate || null,
          trackingEnabled: user.trackingEnabled !== false,
          bookmarks: user.bookmarks || [],
          isPremiumUser: user.isPremiumUser === true,
          monthlyViewsCount: user.monthlyViewsCount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password (Send Reset OTP)
// @route   POST /api/public/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Save to OtpLog
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OtpLog.create({
      userId: user._id,
      otp: hashedOtp,
      expiresAt,
      used: false
    });

    // Deliver Reset OTP
    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password using OTP
// @route   POST /api/public/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify OTP
    const activeLogs = await OtpLog.find({
      userId: user._id,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    let matchedLog = null;
    for (const log of activeLogs) {
      const isMatch = await bcrypt.compare(otp, log.otp);
      if (isMatch) {
        matchedLog = log;
        break;
      }
    }

    if (!matchedLog) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    matchedLog.used = true;
    await matchedLog.save();

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (error) {
    next(error);
  }
};

// ─── Google OAuth for Reader Portal ──────────────────────────────────────────

/**
 * GET /api/public/auth/google/config
 * Returns public Google OAuth status and client ID
 */
export const getGoogleAuthConfig = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'google_oauth' }).lean();
    const config = setting?.value || {};
    res.json({
      success: true,
      data: {
        enabled: Boolean(config.enabled),
        clientId: config.clientId || '',
        allowReaderLogin: config.allowReaderLogin !== false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/public/auth/google
 * Sign in / Sign up with Google token, code, or profile
 */
export const googleAuth = async (req, res, next) => {
  try {
    const { credential, code, mockEmail, mockName } = req.body;
    const setting = await SystemSetting.findOne({ key: 'google_oauth' }).lean();
    const config = setting?.value || {};

    let googleProfile = null;

    if (credential) {
      // Decode or verify Google ID token
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const tokenData = await verifyRes.json();
          googleProfile = {
            email: tokenData.email,
            name: tokenData.name || tokenData.given_name || tokenData.email.split('@')[0],
            sub: tokenData.sub,
            picture: tokenData.picture,
          };
        }
      } catch (err) {
        console.error('Error verifying Google ID token:', err.message);
      }
    } else if (code) {
      // Exchange authorization code
      try {
        const redirectUri = config.redirectUri || `${req.protocol}://${req.get('host')}/api/public/auth/google/callback`;
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            googleProfile = {
              email: userData.email,
              name: userData.name || userData.email.split('@')[0],
              sub: userData.sub,
              picture: userData.picture,
            };
          }
        }
      } catch (err) {
        console.error('Error exchanging Google code:', err.message);
      }
    } else if (mockEmail && env.NODE_ENV !== 'production') {
      // Development mock helper
      googleProfile = {
        email: mockEmail.toLowerCase(),
        name: mockName || 'Google User',
        sub: 'mock-google-id-' + Date.now(),
      };
    }

    if (!googleProfile || !googleProfile.email) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed. Please configure Client ID or verify credentials.',
      });
    }

    // Find or create reader
    let user = await User.findOne({ email: googleProfile.email.toLowerCase() });

    if (user) {
      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.',
        });
      }
    } else {
      // Check if reader registration is allowed
      if (config.allowReaderLogin === false) {
        return res.status(403).json({
          success: false,
          message: 'Reader registration via Google is currently disabled.',
        });
      }

      user = await User.create({
        name: googleProfile.name || googleProfile.email.split('@')[0],
        email: googleProfile.email.toLowerCase(),
        password: crypto.randomBytes(24).toString('hex'),
        role: 'reader',
        status: 'active',
      });

      await audit.log({
        req,
        action: 'READER_REGISTERED_GOOGLE',
        targetType: 'User',
        targetId: user._id,
        targetLabel: user.name,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Signed in with Google successfully!',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          readingStreak: user.readingStreak || 0,
          lastReadDate: user.lastReadDate || null,
          trackingEnabled: user.trackingEnabled !== false,
          bookmarks: user.bookmarks || [],
          isPremiumUser: user.isPremiumUser === true,
          monthlyViewsCount: user.monthlyViewsCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const resolvePortalUrl = (req) => {
  const referer = req.get('referer') || req.get('origin');
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch {}
  }
  return process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3001';
};

/**
 * GET /api/public/auth/google/redirect
 * Redirect browser to Google OAuth consent screen
 */
export const googleRedirect = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'google_oauth' }).lean();
    const config = setting?.value || {};
    const portalUrl = resolvePortalUrl(req);

    if (!config.enabled || !config.clientId) {
      return res.redirect(`${portalUrl}?auth_error=${encodeURIComponent('Google OAuth is not configured or disabled in Admin Settings.')}`);
    }

    const callbackUrl = config.redirectUri || `${req.protocol}://${req.get('host')}/api/public/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(portalUrl)}`;

    res.redirect(googleAuthUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/auth/google/callback
 * Handle redirect callback from Google OAuth
 */
export const googleCallback = async (req, res, next) => {
  try {
    const { code, error, state } = req.query;
    const portalUrl = state ? decodeURIComponent(state) : (process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3001');

    if (error || !code) {
      return res.redirect(`${portalUrl}?auth_error=${encodeURIComponent(error || 'Google login cancelled')}`);
    }

    const setting = await SystemSetting.findOne({ key: 'google_oauth' }).lean();
    const config = setting?.value || {};
    const callbackUrl = config.redirectUri || `${req.protocol}://${req.get('host')}/api/public/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return res.redirect(`${portalUrl}?auth_error=${encodeURIComponent('Failed to exchange Google OAuth code')}`);
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return res.redirect(`${portalUrl}?auth_error=${encodeURIComponent('Failed to fetch Google profile')}`);
    }

    const userData = await userRes.json();
    const email = userData.email.toLowerCase();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: userData.name || email.split('@')[0],
        email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'reader',
        status: 'active',
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${portalUrl}?google_token=${accessToken}&google_name=${encodeURIComponent(user.name)}`);
  } catch (err) {
    console.error('Google callback error:', err);
    const portalUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${portalUrl}?auth_error=${encodeURIComponent(err.message)}`);
  }
};

