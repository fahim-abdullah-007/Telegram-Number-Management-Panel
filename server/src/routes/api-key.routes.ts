import { Router } from 'express';
import { auth } from '../middleware/auth';
import { create, list, revoke, rotate } from '../controllers/api-key.controller';

const router = Router();
router.use(auth);
router.post('/', create);
router.get('/', list);
router.delete('/:id', revoke);
router.post('/:id/rotate', rotate);

export default router;
