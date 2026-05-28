import express from 'express';
import { getRateLimits, deleteRateLimit } from '../controllers/rateLimits.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);
router.use(authorize('admin'));

router.get('/', getRateLimits);
router.delete('/:id', deleteRateLimit);

export default router;
