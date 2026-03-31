import { Router } from 'express';
import { getEntries, createEntry, updateEntry, deleteEntry } from '../controllers/weight.controller';

const router = Router();
router.get('/', getEntries);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);
export default router;
