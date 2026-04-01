import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function getEntries(req: AuthRequest, res: Response): Promise<void> {
  const { from, to } = req.query;
  const where: Record<string, unknown> = { userId: req.userId! };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }
  const entries = await prisma.weightEntry.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  res.json(entries);
}

export async function createEntry(req: AuthRequest, res: Response): Promise<void> {
  const { weightKg, date, notes } = req.body;
  if (!weightKg || !date) {
    res.status(400).json({ error: 'weightKg and date are required' });
    return;
  }
  const entry = await prisma.weightEntry.upsert({
    where: { userId_date: { userId: req.userId!, date: new Date(date) } },
    update: { weightKg: Number(weightKg), notes: notes ?? null },
    create: { userId: req.userId!, weightKg: Number(weightKg), date: new Date(date), notes: notes ?? null },
  });
  res.status(201).json(entry);
}

export async function updateEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { weightKg, notes } = req.body;
  const entry = await prisma.weightEntry.findFirst({ where: { id, userId: req.userId! } });
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.weightEntry.update({
    where: { id },
    data: {
      weightKg: weightKg ? Number(weightKg) : entry.weightKg,
      notes: notes ?? entry.notes,
    },
  });
  res.json(updated);
}

export async function deleteEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const entry = await prisma.weightEntry.findFirst({ where: { id, userId: req.userId! } });
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.weightEntry.delete({ where: { id } });
  res.status(204).send();
}

export async function getStreaks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { waterGoalMl: true, calorieGoal: true, weighDay: true },
    });
    const waterGoal = user?.waterGoalMl ?? 2000;
    const calorieGoal = user?.calorieGoal ?? 2000;
    const weighDay = user?.weighDay ?? 1;

    // Water streak: count consecutive days (starting today) with waterGoal met
    const waterHistory = await prisma.waterIntake.groupBy({
      by: ['date'],
      where: { userId },
      _sum: { amountMl: true },
      orderBy: { date: 'desc' },
    });

    let waterStreak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const entry = waterHistory.find(h => new Date(h.date).toISOString().split('T')[0] === key);
      if (entry && (entry._sum.amountMl ?? 0) >= waterGoal) {
        waterStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Weight streak: count consecutive weeks where weighDay entry exists
    const weightEntries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 52,
      select: { date: true },
    });
    const weightDates = new Set(weightEntries.map(e => new Date(e.date).toISOString().split('T')[0]));

    let weightStreak = 0;
    for (let week = 0; week < 52; week++) {
      const target = new Date(today);
      const dayOffset = (today.getDay() - weighDay + 7) % 7;
      target.setDate(today.getDate() - dayOffset - week * 7);
      if (weightDates.has(target.toISOString().split('T')[0])) {
        weightStreak++;
      } else if (week > 0) {
        break;
      }
    }

    // Calorie streak: consecutive days under calorieGoal with at least one logged meal
    const mealHistory = await prisma.meal.groupBy({
      by: ['date'],
      where: { userId, estimatedKcal: { not: null } },
      _sum: { estimatedKcal: true },
      orderBy: { date: 'desc' },
    });

    let calorieStreak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const entry = mealHistory.find(h => new Date(h.date).toISOString().split('T')[0] === key);
      const total = entry?._sum.estimatedKcal ?? 0;
      if (total > 0 && total <= calorieGoal) {
        calorieStreak++;
      } else if (i > 0) {
        break;
      }
    }

    res.json({ waterStreak, weightStreak, calorieStreak });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
