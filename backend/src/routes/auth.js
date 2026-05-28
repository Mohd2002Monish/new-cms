import express from 'express';
import { login, verifyOtp, refreshAccessToken, logout, loginSchema, verifyOtpSchema } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', otpRequestLimiter, validate(loginSchema), login);
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/refresh', refreshAccessToken);
router.post('/logout', authenticate, logout);

export default router;
