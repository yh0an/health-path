// server/src/controllers/nutrition.controller.ts
import { Response } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';
import { uploadFile, deleteFile } from '../services/storage.service';
import { analyzeMealPhotos } from '../services/ai.service';
import { upload } from '../middleware/upload';

export const uploadMiddleware = upload.array('images', 10);

export async function getMeals(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  const where: Record<string, unknown> = { userId: req.userId! };
  if (date) {
    where.date = new Date(date as string);
  }
  const meals = await prisma.meal.findMany({
    where,
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
    include: { photos: { orderBy: { order: 'asc' } } },
  });
  res.json(meals);
}

export async function analyzeMeal(req: AuthRequest, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Au moins une image requise' });
    return;
  }
  try {
    const result = await analyzeMealPhotos(
      files.map(f => f.buffer),
      files.map(f => f.mimetype),
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur lors de l'analyse" });
  }
}

export async function createMeal(req: AuthRequest, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Au moins une image requise' });
    return;
  }
  const { mealType, date, time, description, estimatedKcal } = req.body;
  if (!mealType || !date) {
    res.status(400).json({ error: 'mealType et date requis' });
    return;
  }
  const imageUrls = await Promise.all(files.map(f => uploadFile(f)));
  const meal = await prisma.meal.create({
    data: {
      userId: req.userId!,
      mealType,
      date: new Date(date),
      time: time || null,
      description: description || null,
      estimatedKcal: estimatedKcal ? Number(estimatedKcal) : null,
      photos: {
        create: imageUrls.map((url, i) => ({ imageUrl: url, order: i })),
      },
    },
    include: { photos: { orderBy: { order: 'asc' } } },
  });
  res.status(201).json(meal);
}

export async function deleteMeal(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const meal = await prisma.meal.findFirst({
    where: { id, userId: req.userId! },
    include: { photos: true },
  });
  if (!meal) { res.status(404).json({ error: 'Non trouvé' }); return; }
  const urlsToDelete: string[] = [
    ...(meal.imageUrl ? [meal.imageUrl] : []),
    ...meal.photos.map((p: { imageUrl: string }) => p.imageUrl),
  ];
  await Promise.all(urlsToDelete.map(url => deleteFile(url)));
  await prisma.meal.delete({ where: { id } });
  res.status(204).end();
}
