import express from 'express';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../controllers/notifications.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
