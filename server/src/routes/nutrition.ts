// server/src/routes/nutrition.ts
import { Router } from 'express';
import { getMeals, getMealById, analyzeMeal, createMeal, deleteMeal, uploadMiddleware } from '../controllers/nutrition.controller';

const router = Router();
router.get('/', getMeals);
router.get('/:id', getMealById);
router.post('/analyze', uploadMiddleware, analyzeMeal);
router.post('/', uploadMiddleware, createMeal);
router.delete('/:id', deleteMeal);
export default router;
