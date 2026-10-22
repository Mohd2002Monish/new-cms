import { Router } from 'express';
import {
  suggestArticleMetadata,
  generateFullArticle,
  editArticle,
  getPromptHistory,
} from '../controllers/ai.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/authorize.js';

const router = Router();

// Protect all AI routes under staff access — uses the org's paid Gemini key,
// must never be reachable by public reader accounts.
router.use(authenticate, checkActive, requireStaff);

router.post('/suggest', suggestArticleMetadata);
router.post('/generate-article', generateFullArticle);
router.post('/edit-article', editArticle);
router.get('/prompts', getPromptHistory);

export default router;
