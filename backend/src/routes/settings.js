import { Router } from 'express';
import {
  getSettings,
  updateSetting,
  testSmtp,
  testAi,
} from '../controllers/settings.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Settings are restricted strictly to Administrators
router.use(authenticate, checkActive, authorize('admin'));

router.get('/', getSettings);
router.put('/:key', updateSetting);
router.post('/test-smtp', testSmtp);
router.post('/test-ai', testAi);

export default router;
