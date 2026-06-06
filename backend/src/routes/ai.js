import { Router } from 'express';
import { suggestArticleMetadata, generateFullArticle, editArticle } from '../controllers/ai.controller.js';
import { authenticate, checkActive } from '../middleware/authenticate.js';

const router = Router();

// Protect all AI routes under admin/editor access
router.post('/suggest', authenticate, checkActive, suggestArticleMetadata);
router.post('/generate-article', authenticate, checkActive, generateFullArticle);
router.post('/edit-article', authenticate, checkActive, editArticle);

export default router;
