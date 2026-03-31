import { Response } from 'express';
import { MealType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { searchProducts } from '../services/openfoodfacts.service';

export async function getMeals(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required' }); return; }
  const meals = await prisma.meal.findMany({
    where: { userId: req.userId!, date: new Date(date as string) },
    include: { mealItems: true },
    orderBy: { mealType: 'asc' },
  });
  res.json(meals);
}

export async function addMealItem(req: AuthRequest, res: Response): Promise<void> {
  const { date, mealType, name, calories, proteinG, carbsG, fatG, quantity, unit, openFoodFactsId } = req.body;
  if (!date || !mealType || !name) {
    res.status(400).json({ error: 'date, mealType, name are required' });
    return;
  }
  const mealId = `${req.userId}_${date}_${mealType}`;
  const meal = await prisma.meal.upsert({
    where: { id: mealId },
    update: {},
    create: {
      id: mealId,
      userId: req.userId!,
      date: new Date(date),
      mealType: mealType as MealType,
    },
  });
  const item = await prisma.mealItem.create({
    data: {
      mealId: meal.id,
      name,
      calories: Number(calories),
      proteinG: Number(proteinG || 0),
      carbsG: Number(carbsG || 0),
      fatG: Number(fatG || 0),
      quantity: Number(quantity || 100),
      unit: unit || 'g',
      openFoodFactsId: openFoodFactsId || null,
    },
  });
  res.status(201).json(item);
}

export async function deleteMealItem(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const item = await prisma.mealItem.findFirst({
    where: { id, meal: { userId: req.userId! } },
  });
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.mealItem.delete({ where: { id } });
  res.status(204).send();
}

export async function searchFood(req: AuthRequest, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'q required' }); return; }
  const results = await searchProducts(q as string);
  res.json(results);
}
