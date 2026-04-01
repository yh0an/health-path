import { Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';
import { uploadFile, deleteFile } from '../services/storage.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('image');

export async function getMeals(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  const where: Record<string, unknown> = { userId: req.userId! };
  if (date) {
    const d = new Date(date as string);
    where.date = d;
  }
  const meals = await prisma.meal.findMany({
    where,
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
  });
  res.json(meals);
}

export async function createMeal(req: AuthRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'Image manquante' }); return; }
  const { mealType, date, time, description } = req.body;
  if (!mealType || !date) { res.status(400).json({ error: 'mealType et date requis' }); return; }
  const imageUrl = await uploadFile(file);
  const meal = await prisma.meal.create({
    data: {
      userId: req.userId!,
      mealType,
      date: new Date(date),
      time: time || null,
      description: description || null,
      imageUrl,
    },
  });
  res.status(201).json(meal);
}

export async function deleteMeal(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const meal = await prisma.meal.findFirst({
    where: { id: id as string, userId: req.userId! },
    include: { photos: true },
  });
  if (!meal) { res.status(404).json({ error: 'Non trouvé' }); return; }
  if (meal.imageUrl) await deleteFile(meal.imageUrl);
  for (const photo of meal.photos) {
    await deleteFile(photo.imageUrl);
  }
  await prisma.meal.delete({ where: { id: id as string } });
  res.status(204).end();
}
