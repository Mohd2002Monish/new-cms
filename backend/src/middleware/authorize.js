import { Permission } from '../models/Permission.js';

// Default permissions by role
const ROLE_DEFAULTS = {
  admin: {
    canCreateUser: true,
    canApprovePost: true,
    canDeletePost: true,
    canManageCats: true,
    canActivateUser: true,
    canViewReports: true,
    canEditApprovedPost: true,
  },
  manager: {
    canCreateUser: true,
    canApprovePost: true,
    canDeletePost: true,
    canManageCats: false,
    canActivateUser: true,
    canViewReports: true,
    canEditApprovedPost: true,
  },
  editor: {
    canCreateUser: false,
    canApprovePost: false,
    canDeletePost: false,
    canManageCats: false,
    canActivateUser: false,
    canViewReports: false,
    canEditApprovedPost: false,
  }
};

// Check if user has specific role(s)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check for granular permission (checking user-specific overrides, falling back to role defaults)
export const hasPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      const userRole = req.user.role;
      let allowed = ROLE_DEFAULTS[userRole]?.[permissionKey] || false;
      
      // Fetch permission override document from database
      const permissionOverride = await Permission.findOne({ userId: req.user._id });
      
      if (permissionOverride && permissionOverride[permissionKey] !== undefined) {
        allowed = permissionOverride[permissionKey];
      }
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: You do not have permission to perform this action (${permissionKey})`
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
