import { Router } from 'express';
import { authenticate, checkActive } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/authorize.js';
import {
  getUploadSignature,
  listMedia,
  registerMedia,
  updateMedia,
  deleteMedia
} from '../controllers/media.controller.js';

const router = Router();

// All routes require authentication and a staff account — this grants
// Cloudinary upload signatures and library CRUD, never for public readers.
router.use(authenticate, checkActive, requireStaff);

// List media assets
router.get('/', listMedia);

// Register a new media asset (after Cloudinary upload)
router.post('/', registerMedia);

// Update a media asset (tags, alt text)
router.patch('/:id', updateMedia);

// Delete a media asset (soft delete + cloudinary delete)
router.delete('/:id', deleteMedia);

// Generate Cloudinary upload signature
router.post('/sign', getUploadSignature);

export default router;
