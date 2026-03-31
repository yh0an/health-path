import { Router } from 'express';
import { getProfile, updateProfile, changePassword, updateNotificationSettings } from '../controllers/settings.controller';

const router = Router();
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/notifications', updateNotificationSettings);
export default router;
