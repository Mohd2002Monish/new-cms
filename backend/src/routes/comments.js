import express from 'express';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/authorize.js';
import {
  getComments,
  createComment,
  addReply,
  resolveComment,
  deleteComment
} from '../controllers/comments.controller.js';

// Merge params allows us to access :postId from the parent router (app.js)
const router = express.Router({ mergeParams: true });

// Internal editorial review threads — staff-only regardless of mount point.
router.use(authenticate);
router.use(checkActive);
router.use(requireStaff);

router.get('/', getComments);
router.post('/', createComment);
router.post('/:commentId/reply', addReply);
router.patch('/:commentId/resolve', resolveComment);
router.delete('/:commentId', deleteComment);

export default router;
