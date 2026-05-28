import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  reorderCategories,
} from '../controllers/categories.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// All routes require authentication
router.use(authenticate, checkActive);

// GET /api/categories - all authenticated users
router.get('/', getCategories);

// POST /api/categories/reorder - Admin only
router.post('/reorder', authorize('admin'), reorderCategories);

// POST /api/categories - Admin only
router.post('/', authorize('admin'), createCategory);

// PATCH /api/categories/:id - Admin only
router.patch('/:id', authorize('admin'), updateCategory);

// DELETE /api/categories/:id - Admin only (soft delete)
router.delete('/:id', authorize('admin'), deleteCategory);

// PATCH /api/categories/:id/restore - Admin only
router.patch('/:id/restore', authorize('admin'), restoreCategory);

export default router;
