import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, refresh, register } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many login attempts. Try again later.', error: 'RATE_LIMITED' }),
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', auth, logout);
router.get('/me', auth, me);
router.post('/refresh', refresh);

export default router;
