import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, env.JWT_SECRET);
      
      // Get user from DB
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      // Attach user to request
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
  } catch (error) {
    next(error);
  }
};

export const checkActive = (req, res, next) => {
  if (req.user && req.user.status === 'inactive') {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Contact your administrator.'
    });
  }
  next();
};
