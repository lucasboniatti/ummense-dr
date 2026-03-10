import { Router } from 'express';
import {
  signup,
  login,
  getMe,
  logout,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/password/reset-request', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/me', authMiddleware, getMe);
router.post('/logout', logout);

export default router;
