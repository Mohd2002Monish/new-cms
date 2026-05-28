import express from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLogs.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All audit log routes are restricted to Admin
router.use(authenticate, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
