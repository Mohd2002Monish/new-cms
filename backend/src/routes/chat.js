import express from 'express';
import {
  getStaffUsers,
  getMessages,
  signUpload,
  sendMessage,
  markAsRead,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// All chat routes require staff authentication (admin, manager, editor)
router.use(authenticate);

router.get('/staff', getStaffUsers);
router.get('/messages', getMessages);
router.post('/sign-upload', signUpload);
router.post('/send', sendMessage);
router.patch('/mark-read', markAsRead);

export default router;
