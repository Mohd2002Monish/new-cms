import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  })
});

// --- Controller Actions ---

// @desc    Step 1: Check credentials & send OTP
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      await audit.log({
        req, action: 'LOGIN_FAILED', targetType: 'Auth', targetLabel: email,
        actorOverrides: { actorEmail: email }
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status === 'inactive') {
      await audit.log({
        req, action: 'LOGIN_FAILED_INACTIVE', targetType: 'Auth', targetLabel: email,
        actorOverrides: { actorId: user._id, actorEmail: email, actorRole: user.role }
      });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact your administrator.'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await audit.log({
        req, action: 'LOGIN_FAILED', targetType: 'Auth', targetLabel: email,
        actorOverrides: { actorId: user._id, actorEmail: email, actorRole: user.role }
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
    
    // Deliver OTP
    await sendOTPEmail(user.email, otp);
    
    await audit.log({
      req, action: 'OTP_SENT', targetType: 'Auth', targetId: user._id, targetLabel: user.email,
      actorOverrides: { actorId: user._id, actorEmail: user.email, actorRole: user.role }
    });
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your registered email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 2: Verify OTP and issue JWTs
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact your administrator.'
      });
    }
    
    // Find active OTP logs for this user (not expired and not used)
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
      await audit.log({
        req, action: 'OTP_FAILED', targetType: 'Auth', targetId: user._id, targetLabel: user.email,
        actorOverrides: { actorId: user._id, actorEmail: user.email, actorRole: user.role }
      });
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    // Mark OTP log as used
    matchedLog.used = true;
    await matchedLog.save();
    
    // Generate access & refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Record login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Set HTTP-only Cookie for refresh token
    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    await audit.log({
      req, action: 'LOGIN_SUCCESS', targetType: 'Auth', targetId: user._id, targetLabel: user.email,
      actorOverrides: { actorId: user._id, actorEmail: user.email, actorRole: user.role }
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
          status: user.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Silent Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshAccessToken = async (req, res, next) => {
  try {
    // Extract token from cookie (requires cookie-parser, wait, let's see how we extract it if we don't use cookie-parser. We can parse the Cookie header manually!)
    const cookiesHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookiesHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    
    const refreshToken = cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, message: 'User account has been deactivated' });
      }
      
      const newAccessToken = generateAccessToken(user);

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            readingStreak: user.readingStreak || 0,
            lastReadDate: user.lastReadDate || null,
            trackingEnabled: user.trackingEnabled !== false,
            bookmarks: user.bookmarks || []
          }
        }
      });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Clear refresh cookie & logout
// @route   POST /api/auth/logout
// @access  Private (any authenticated)
export const logout = (req, res) => {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  
  audit.log({
    req, action: 'LOGOUT', targetType: 'Auth', targetId: req.user._id, targetLabel: req.user.email
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    One-Click Dev Login (Development Only)
// @route   POST /api/auth/dev-login
// @access  Public (Dev only)
export const devLogin = async (req, res, next) => {
  try {
    if (process.env.DISABLE_DEV_LOGIN === 'true') {
      return res.status(403).json({ success: false, message: 'Dev login is explicitly disabled.' });
    }

    const { role = 'admin' } = req.body;

    const roleProfiles = {
      admin: {
        email: 'admin@newscms.com',
        name: 'Super Admin',
        role: 'admin',
        perms: { canCreateUser: true, canApprovePost: true, canDeletePost: true, canManageCats: true, canActivateUser: true, canViewReports: true, canEditApprovedPost: true }
      },
      manager: {
        email: 'manager@newscms.com',
        name: 'Editorial Manager',
        role: 'manager',
        perms: { canCreateUser: false, canApprovePost: true, canDeletePost: false, canManageCats: true, canActivateUser: false, canViewReports: true, canEditApprovedPost: true }
      },
      editor: {
        email: 'editor@newscms.com',
        name: 'Staff Editor',
        role: 'editor',
        perms: { canCreateUser: false, canApprovePost: false, canDeletePost: false, canManageCats: false, canActivateUser: false, canViewReports: false, canEditApprovedPost: false }
      },
      reader: {
        email: 'reader@newscms.com',
        name: 'Test Reader',
        role: 'reader',
        perms: null
      }
    };

    const profile = roleProfiles[role] || roleProfiles.admin;

    // Find or create the user in the database
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: 'DevPassword@123',
        role: profile.role,
        status: 'active',
      });
    } else {
      let modified = false;
      if (user.status !== 'active') { user.status = 'active'; modified = true; }
      if (user.role !== profile.role) { user.role = profile.role; modified = true; }
      if (modified) await user.save();
    }

    // Ensure permissions record exists for admin/manager/editor
    if (profile.perms) {
      try {
        const { Permission } = await import('../models/Permission.js');
        if (Permission) {
          await Permission.findOneAndUpdate(
            { userId: user._id },
            { $set: profile.perms },
            { upsert: true, new: true }
          );
        }
      } catch (e) {
        // Non-fatal
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.lastLogin = new Date();
    await user.save();

    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          bookmarks: user.bookmarks || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

