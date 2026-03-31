import { Router } from 'express';
import { getMeals, createMeal, deleteMeal, uploadMiddleware } from '../controllers/nutrition.controller';

const router = Router();
router.get('/', getMeals);
router.post('/', uploadMiddleware, createMeal);
router.delete('/:id', deleteMeal);
export default router;
