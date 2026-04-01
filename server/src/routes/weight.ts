import { Router } from 'express';
import { getEntries, createEntry, updateEntry, deleteEntry, getStreaks } from '../controllers/weight.controller';

const router = Router();
router.get('/streaks', getStreaks);
router.get('/', getEntries);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);
export default router;
