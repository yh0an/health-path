import { Response } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';

export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers, totalMeals, totalWorkouts, totalWeightEntries, totalWaterIntakes,
    mealsLast7, workoutsLast7, weightLast7, waterLast7,
    mealsLast30, workoutsLast30, weightLast30, waterLast30,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.meal.count(),
    prisma.workoutSession.count(),
    prisma.weightEntry.count(),
    prisma.waterIntake.count(),
    prisma.meal.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.workoutSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.weightEntry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.waterIntake.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { amountMl: true } }),
    prisma.meal.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.workoutSession.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.weightEntry.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.waterIntake.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
  ]);

  const avgWaterMl = waterLast7.length > 0
    ? Math.round(waterLast7.reduce((s, w) => s + w.amountMl, 0) / 7)
    : 0;

  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const allEntries = [...mealsLast30, ...workoutsLast30, ...weightLast30, ...waterLast30];
  for (const entry of allEntries) {
    const key = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const activityLast30Days = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

  res.json({
    totals: { users: totalUsers, meals: totalMeals, workouts: totalWorkouts, weightEntries: totalWeightEntries, waterIntakes: totalWaterIntakes },
    last7Days: { meals: mealsLast7, workouts: workoutsLast7, weightEntries: weightLast7, avgWaterMl },
    activityLast30Days,
  });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const user = await prisma.user.update({
    where: { id },
    data: { name: name.trim() },
    select: { id: true, name: true },
  });
  res.json(user);
}

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, createdAt: true, isAdmin: true,
      _count: { select: { meals: true, workoutSessions: true, weightEntries: true } },
      meals:           { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      workoutSessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      weightEntries:   { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      waterIntakes:    { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const result = users.map(u => {
    const candidates = [
      u.meals[0]?.createdAt,
      u.workoutSessions[0]?.createdAt,
      u.weightEntries[0]?.createdAt,
      u.waterIntakes[0]?.createdAt,
    ].filter(Boolean) as Date[];
    const lastActivityAt = candidates.length > 0
      ? new Date(Math.max(...candidates.map(d => d.getTime()))).toISOString()
      : null;
    return {
      id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, isAdmin: u.isAdmin,
      counts: { meals: u._count.meals, workouts: u._count.workoutSessions, weightEntries: u._count.weightEntries },
      lastActivityAt,
    };
  });

  res.json(result);
}
