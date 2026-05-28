import Joi from 'joi';
import { User } from '../models/User.js';
import { Permission } from '../models/Permission.js';
import { Post } from '../models/Post.js';
import * as audit from '../services/audit.service.js';
import * as notification from '../services/notification.service.js';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'manager', 'editor').default('editor'),
  assignedManager: Joi.string().hex().length(24).optional().allow(null, '')
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'manager', 'editor').optional(),
  assignedManager: Joi.string().hex().length(24).optional().allow(null, '')
});

export const updatePermissionSchema = Joi.object({
  canCreateUser: Joi.boolean(),
  canApprovePost: Joi.boolean(),
  canDeletePost: Joi.boolean(),
  canManageCats: Joi.boolean(),
  canActivateUser: Joi.boolean(),
  canViewReports: Joi.boolean(),
  canEditApprovedPost: Joi.boolean(),
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('assignedManager', 'name email');
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/stats ─────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    let postFilter = {};
    let userFilter = {};

    if (req.user.role === 'manager') {
      postFilter = { assignedManager: req.user._id };
      userFilter = { assignedManager: req.user._id };
    }

    const [totalPosts, livePosts, pendingPosts, draftPosts, rejectedPosts, totalUsers] =
      await Promise.all([
        Post.countDocuments(postFilter),
        Post.countDocuments({ ...postFilter, status: 'live' }),
        Post.countDocuments({ ...postFilter, status: 'pending_approval' }),
        Post.countDocuments({ ...postFilter, status: 'draft' }),
        Post.countDocuments({ ...postFilter, status: 'rejected' }),
        User.countDocuments(userFilter),
      ]);

    res.json({
      success: true,
      data: {
        totalPosts,
        livePosts,
        pendingPosts,
        draftPosts,
        rejectedPosts,
        totalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};



// --- Controller Actions ---

// @desc    List all users
// @route   GET /api/users
// @access  Private (Admin/Manager)
export const listUsers = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'admin') {
      // Admin can see anyone
      filter = {};
    } else if (req.user.role === 'manager') {
      // Manager can only see editors assigned to them
      filter = { assignedManager: req.user._id };
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized to list users' });
    }
    
    if (req.query.showDeleted === 'true') {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
    }

    const users = await User.find(filter)
      .setOptions({ includeDeleted: req.query.showDeleted === 'true' })
      .populate('createdBy', 'name email role')
      .populate('assignedManager', 'name email role')
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin/Manager)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if email already registered
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    // Manager authorization guard
    if (req.user.role === 'manager') {
      if (role !== 'editor') {
        return res.status(403).json({
          success: false,
          message: 'Managers are only permitted to create Editor accounts.'
        });
      }
    }
    
    // Initialize user fields
    const userFields = {
      name,
      email,
      password,
      role,
      createdBy: req.user._id
    };
    
    // Assign manager logic
    if (role === 'editor') {
      if (req.user.role === 'manager') {
        userFields.assignedManager = req.user._id;
      } else if (req.user.role === 'admin' && req.body.assignedManager) {
        userFields.assignedManager = req.body.assignedManager;
      }
    }
    
    // Create User
    const newUser = await User.create(userFields);
    
    // Initialize default permissions record
    await Permission.create({
      userId: newUser._id,
      // Default matching standard roles
      canCreateUser: role === 'admin' || role === 'manager',
      canApprovePost: role === 'admin' || role === 'manager',
      canDeletePost: role === 'admin' || role === 'manager',
      canManageCats: role === 'admin',
      canActivateUser: role === 'admin' || role === 'manager',
      canViewReports: role === 'admin' || role === 'manager',
      canEditApprovedPost: role === 'admin' || role === 'manager',
      updatedBy: req.user._id
    });
    
    await audit.log({
      req, action: 'USER_CREATED', targetType: 'User', targetId: newUser._id, targetLabel: newUser.email,
      newState: { name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status, assignedManager: newUser.assignedManager }
    });

    res.status(201).json({
      success: true,
      message: `Account for ${name} successfully created as ${role}`,
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        assignedManager: newUser.assignedManager
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PATCH /api/users/:id
// @access  Private (Admin/Manager)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Admin authorization guard: cannot edit another admin
    if (req.user.role === 'admin' && user.role === 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Admins cannot edit other admins.' });
    }

    // Manager authorization guard: can only edit own assigned editors
    if (req.user.role === 'manager' && (!user.assignedManager || user.assignedManager.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Managers are only authorized to edit their own Editors.'
      });
    }

    // Manager role-change guard: cannot elevate roles
    if (req.user.role === 'manager' && req.body.role && req.body.role !== 'editor') {
      return res.status(403).json({ success: false, message: 'Managers can only assign the Editor role.' });
    }

    // Optional email uniqueness check if changing email
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    if (req.body.assignedManager === '') {
      req.body.assignedManager = null;
    }

    // Admins can change assignedManager for editors, Managers cannot change their own editor's assigned manager (or it's redundant)
    if (req.user.role === 'manager' && req.body.assignedManager !== undefined) {
       delete req.body.assignedManager;
    }

    const previousState = { name: user.name, email: user.email, role: user.role, assignedManager: user.assignedManager };

    Object.assign(user, req.body);
    await user.save();

    await audit.log({
      req, action: 'USER_UPDATED', targetType: 'User', targetId: user._id, targetLabel: user.email,
      previousState, newState: { name: user.name, email: user.email, role: user.role, assignedManager: user.assignedManager }
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active/inactive status
// @route   PATCH /api/users/:id/status
// @access  Private (Admin/Manager)
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deactivation
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Admin authorization guard: cannot edit another admin
    if (req.user.role === 'admin' && user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins cannot edit other admins.' });
    }

    // Manager status-toggle validation: can only toggle own assigned editors
    if (req.user.role === 'manager' && (!user.assignedManager || user.assignedManager.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Managers are only authorized to activate/deactivate their own Editors.'
      });
    }
    
    // Toggle status
    const previousState = { status: user.status };
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    
    await audit.log({
      req, action: 'USER_STATUS_TOGGLED', targetType: 'User', targetId: user._id, targetLabel: user.email,
      previousState, newState: { status: user.status }
    });

    await notification.create({
      recipientId: user._id,
      type: 'USER_STATUS_TOGGLED',
      message: `Your account status has been changed to ${user.status}.`,
      relatedModel: 'User',
      relatedId: user._id,
    });

    res.status(200).json({
      success: true,
      message: `Account of ${user.name} set to ${user.status}`,
      data: {
        id: user._id,
        name: user.name,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user.role === 'admin' && user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins cannot delete other admins.' });
    }

    const previousState = { status: user.status, deletedAt: null };
    user.status = 'inactive';
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    await user.save();

    await audit.log({
      req, action: 'USER_DELETED', targetType: 'User', targetId: user._id, targetLabel: user.email,
      previousState, newState: { status: user.status, deletedAt: user.deletedAt }
    });

    res.status(200).json({ success: true, message: 'User soft deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore soft deleted user
// @route   PATCH /api/users/:id/restore
// @access  Private (Admin only)
export const restoreUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id }).setOptions({ includeDeleted: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.deletedAt) {
      return res.status(400).json({ success: false, message: 'User is not deleted' });
    }

    const previousState = { status: user.status, deletedAt: user.deletedAt };
    user.status = 'active'; // Optionally automatically activate upon restore
    user.deletedAt = null;
    user.deletedBy = null;
    await user.save();

    await audit.log({
      req, action: 'USER_RESTORED', targetType: 'User', targetId: user._id, targetLabel: user.email,
      previousState, newState: { status: user.status, deletedAt: null }
    });

    res.status(200).json({ success: true, message: 'User restored', data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get permissions of specific user
// @route   GET /api/permissions/:userId
// @access  Private (Admin only)
export const getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const permissions = await Permission.findOne({ userId }).populate('userId', 'name email role');
    if (!permissions) {
      return res.status(404).json({ success: false, message: 'Permissions settings not found' });
    }
    
    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update permissions overrides for specific user
// @route   PATCH /api/permissions/:userId
// @access  Private (Admin only)
export const updateUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Prevent editing another admin's permissions
    if (targetUser.role === 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Admins cannot edit permissions of other admins.' });
    }

    const permissions = await Permission.findOne({ userId });
    if (!permissions) {
      return res.status(404).json({ success: false, message: 'Permissions settings not found' });
    }
    
    // Update individual fields
    const updates = req.body;
    const previousState = { ...permissions.toObject() };
    Object.keys(updates).forEach((key) => {
      permissions[key] = updates[key];
    });
    permissions.updatedBy = req.user._id;
    
    await permissions.save();
    
    await audit.log({
      req, action: 'USER_PERMISSIONS_UPDATED', targetType: 'Permission', targetId: permissions._id, targetLabel: `Permissions for ${targetUser.email}`,
      previousState, newState: permissions.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Granular permissions updated successfully',
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};
