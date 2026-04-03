import { Response } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';

export async function getWorkouts(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required' }); return; }
  const workouts = await prisma.workoutSession.findMany({
    where: { userId: req.userId!, date: new Date(date as string) },
    orderBy: { createdAt: 'asc' },
  });
  res.json(workouts);
}

export async function createWorkout(req: AuthRequest, res: Response): Promise<void> {
  const { date, time, type, durationMinutes, caloriesBurned, notes } = req.body;
  if (!date || !type || !durationMinutes) {
    res.status(400).json({ error: 'date, type and durationMinutes required' }); return;
  }
  const workout = await prisma.workoutSession.create({
    data: {
      userId: req.userId!,
      date: new Date(date),
      time: time ?? null,
      type,
      durationMinutes: Number(durationMinutes),
      caloriesBurned: caloriesBurned ? Number(caloriesBurned) : null,
      notes: notes ?? null,
    },
  });
  res.status(201).json(workout);
}

export async function deleteWorkout(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.userId!;
  const workout = await prisma.workoutSession.findFirst({ where: { id, userId } });
  if (!workout) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.workoutSession.delete({ where: { id } });
  res.status(204).send();
}
