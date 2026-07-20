import { Router } from 'express';
import { suggestArticleMetadata, generateFullArticle, editArticle } from '../controllers/ai.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/authorize.js';

const router = Router();

// Protect all AI routes under staff access — uses the org's paid Gemini key,
// must never be reachable by public reader accounts.
router.post('/suggest', authenticate, checkActive, requireStaff, suggestArticleMetadata);
router.post('/generate-article', authenticate, checkActive, requireStaff, generateFullArticle);
router.post('/edit-article', authenticate, checkActive, requireStaff, editArticle);

export default router;
