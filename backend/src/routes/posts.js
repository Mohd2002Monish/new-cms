import { Router } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  submitPost,
  approvePost,
  rejectPost,
  deletePost,
  restorePost,
  reorderSlider,
} from '../controllers/posts.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize, hasPermission } from '../middleware/authorize.js';
import { getRevisions, restoreRevision } from '../controllers/postRevisions.controller.js';
import commentRoutes from './comments.js';

const router = Router();

// All routes require authentication
router.use(authenticate, checkActive);

// POST /api/posts/reorder-slider
router.post('/reorder-slider', authorize('admin'), reorderSlider);

// GET /api/posts - role-filtered list
router.get('/', getPosts);

// GET /api/posts/:id - single post (with role access check inside controller)
router.get('/:id', getPostById);

// POST /api/posts - any authenticated user can create a draft
router.post('/', createPost);

// PATCH /api/posts/:id - author or admin can update draft/rejected post
router.patch('/:id', updatePost);

// PATCH /api/posts/:id/submit - editor submits for review
router.patch('/:id/submit', submitPost);

// PATCH /api/posts/:id/approve - manager or admin
router.patch('/:id/approve', authorize('manager', 'admin'), hasPermission('canApprovePost'), approvePost);

// PATCH /api/posts/:id/reject - manager or admin
router.patch('/:id/reject', authorize('manager', 'admin'), rejectPost);

// DELETE /api/posts/:id
router.delete('/:id', deletePost);

// PATCH /api/posts/:id/restore - Admin only
router.patch('/:id/restore', authorize('admin'), restorePost);

// GET /api/posts/:id/revisions
router.get('/:id/revisions', getRevisions);

// POST /api/posts/:id/revisions/:version/restore
router.post('/:id/revisions/:version/restore', restoreRevision);

// Comments sub-router
router.use('/:postId/comments', commentRoutes);

export default router;
