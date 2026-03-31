import { Router } from 'express';
import { getMeals, addMealItem, deleteMealItem, searchFood } from '../controllers/nutrition.controller';

const router = Router();
router.get('/', getMeals);
router.post('/items', addMealItem);
router.delete('/items/:id', deleteMealItem);
router.get('/search', searchFood);
export default router;
