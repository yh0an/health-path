import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { getStats, getUsers } from '../controllers/admin.controller';

const router = Router();
router.use(requireAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
export default router;
