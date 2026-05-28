import express from 'express';
import {
  listUsers,
  getMe,
  getStats,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  restoreUser,
  getUserPermissions,
  updateUserPermissions,
  createUserSchema,
  updateUserSchema,
  updatePermissionSchema
} from '../controllers/users.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize, hasPermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Apply auth middleware to all routes below
router.use(authenticate);
router.use(checkActive);

// Users routes
router.get('/me', getMe);                                              // own profile
router.get('/stats', authorize('admin', 'manager'), getStats);         // dashboard metrics
router.get('/', authorize('admin', 'manager'), listUsers);
router.post('/', hasPermission('canCreateUser'), validate(createUserSchema), createUser);
router.patch('/:id', authorize('admin', 'manager'), validate(updateUserSchema), updateUser);
router.patch('/:id/status', hasPermission('canActivateUser'), toggleUserStatus);
router.delete('/:id', authorize('admin'), deleteUser);
router.patch('/:id/restore', authorize('admin'), restoreUser);

// Override Permissions routes (restricted to Admin only)
router.get('/permissions/:userId', authorize('admin'), getUserPermissions);
router.patch('/permissions/:userId', authorize('admin'), validate(updatePermissionSchema), updateUserPermissions);

export default router;
