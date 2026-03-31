import { Router } from 'express';
import { getWaterIntakes, getWaterHistory, addWaterIntake, deleteWaterIntake } from '../controllers/water.controller';

const router = Router();
router.get('/', getWaterIntakes);
router.get('/history', getWaterHistory);
router.post('/', addWaterIntake);
router.delete('/:id', deleteWaterIntake);
export default router;
