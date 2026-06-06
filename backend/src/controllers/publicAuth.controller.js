import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { User } from '../models/User.js';
import { OtpLog } from '../models/OtpLog.js';
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
