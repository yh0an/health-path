import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function getWaterIntakes(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required' }); return; }
  const intakes = await prisma.waterIntake.findMany({
    where: { userId: req.userId!, date: new Date(date as string) },
    orderBy: { createdAt: 'asc' },
  });
  res.json(intakes);
}

export async function getWaterHistory(req: AuthRequest, res: Response): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const intakes = await prisma.waterIntake.findMany({
    where: { userId: req.userId!, date: { gte: sevenDaysAgo } },
    orderBy: { date: 'asc' },
  });
  const byDate = intakes.reduce<Record<string, number>>((acc, intake) => {
    const key = intake.date.toISOString().split('T')[0];
    acc[key] = (acc[key] || 0) + intake.amountMl;
    return acc;
  }, {});
  res.json(byDate);
}

export async function addWaterIntake(req: AuthRequest, res: Response): Promise<void> {
  const { amountMl, date } = req.body;
  if (!amountMl || !date) { res.status(400).json({ error: 'amountMl and date required' }); return; }
  const intake = await prisma.waterIntake.create({
    data: { userId: req.userId!, amountMl: Number(amountMl), date: new Date(date) },
  });
  res.status(201).json(intake);
}

export async function deleteWaterIntake(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const intake = await prisma.waterIntake.findFirst({ where: { id, userId: req.userId! } });
  if (!intake) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.waterIntake.delete({ where: { id } });
  res.status(204).send();
}
