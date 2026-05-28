import { Router } from 'express';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getOverview,
  getPostsOverTime,
  getEditorOutput,
  getTurnaroundStats,
  getRejectionRate,
  getCategoryDist,
  getManagerWorkload
} from '../controllers/reports.controller.js';

const router = Router();

// Reports are only available to admins
router.use(authenticate, checkActive, authorize('admin'));

router.get('/overview', getOverview);
router.get('/posts-over-time', getPostsOverTime);
router.get('/editor-output', getEditorOutput);
router.get('/turnaround', getTurnaroundStats);
router.get('/rejection-rate', getRejectionRate);
router.get('/category-dist', getCategoryDist);
router.get('/manager-workload', getManagerWorkload);

export default router;
