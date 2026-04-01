// server/src/routes/nutrition.ts
import { Router } from 'express';
import { getMeals, analyzeMeal, createMeal, deleteMeal, uploadMiddleware } from '../controllers/nutrition.controller';

const router = Router();
router.get('/', getMeals);
router.post('/analyze', uploadMiddleware, analyzeMeal);
router.post('/', uploadMiddleware, createMeal);
router.delete('/:id', deleteMeal);
export default router;
