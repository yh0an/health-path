import { Response } from 'express';
import { PhotoCategory } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { uploadFile, deleteFile } from '../services/storage.service';

export async function getPhotos(req: AuthRequest, res: Response): Promise<void> {
  const { category } = req.query;
  const photos = await prisma.progressPhoto.findMany({
    where: {
      userId: req.userId!,
      ...(category ? { category: category as PhotoCategory } : {}),
    },
    orderBy: { date: 'desc' },
  });
  res.json(photos);
}

export async function uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const { date, category, notes } = req.body as { date: string; category: string; notes?: string };
  if (!date || !category) { res.status(400).json({ error: 'date and category required' }); return; }
  const imageUrl = await uploadFile(req.file, 'photos');
  const photo = await prisma.progressPhoto.create({
    data: {
      userId: req.userId!,
      date: new Date(date),
      category: category as PhotoCategory,
      imagePath: imageUrl,
      notes: notes || null,
    },
  });
  res.status(201).json(photo);
}

export async function deletePhoto(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const photo = await prisma.progressPhoto.findFirst({ where: { id: id as string, userId: req.userId! } });
  if (!photo) { res.status(404).json({ error: 'Not found' }); return; }
  await deleteFile(photo.imagePath);
  await prisma.progressPhoto.delete({ where: { id: id as string } });
  res.status(204).send();
}
