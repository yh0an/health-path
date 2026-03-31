import { Router } from 'express';
import { getPhotos, uploadPhoto, deletePhoto } from '../controllers/photos.controller';
import { upload } from '../middleware/upload';

const router = Router();
router.get('/', getPhotos);
router.post('/', upload.single('photo'), uploadPhoto);
router.delete('/:id', deletePhoto);
export default router;
