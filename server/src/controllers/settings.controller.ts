import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true, email: true, name: true, heightCm: true, targetWeightKg: true,
      calorieGoal: true, proteinGoalPct: true, carbsGoalPct: true, fatGoalPct: true,
      waterGoalMl: true, weighDay: true, wakeHour: true, sleepHour: true,
      isAdmin: true,
      notificationSettings: true,
    },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Partial<{
    name: string; email: string; heightCm: number; targetWeightKg: number;
    calorieGoal: number; proteinGoalPct: number; carbsGoalPct: number; fatGoalPct: number;
    waterGoalMl: number; weighDay: number; wakeHour: number; sleepHour: number;
  }>;
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.heightCm !== undefined && { heightCm: Number(body.heightCm) }),
      ...(body.targetWeightKg !== undefined && { targetWeightKg: Number(body.targetWeightKg) }),
      ...(body.calorieGoal !== undefined && { calorieGoal: Number(body.calorieGoal) }),
      ...(body.proteinGoalPct !== undefined && { proteinGoalPct: Number(body.proteinGoalPct) }),
      ...(body.carbsGoalPct !== undefined && { carbsGoalPct: Number(body.carbsGoalPct) }),
      ...(body.fatGoalPct !== undefined && { fatGoalPct: Number(body.fatGoalPct) }),
      ...(body.waterGoalMl !== undefined && { waterGoalMl: Number(body.waterGoalMl) }),
      ...(body.weighDay !== undefined && { weighDay: Number(body.weighDay) }),
      ...(body.wakeHour !== undefined && { wakeHour: Number(body.wakeHour) }),
      ...(body.sleepHour !== undefined && { sleepHour: Number(body.sleepHour) }),
    },
    select: {
      id: true, email: true, name: true, heightCm: true, targetWeightKg: true,
      calorieGoal: true, proteinGoalPct: true, carbsGoalPct: true, fatGoalPct: true,
      waterGoalMl: true, weighDay: true, wakeHour: true, sleepHour: true,
    },
  });
  res.json(user);
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) { res.status(401).json({ error: 'Invalid current password' }); return; }
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } });
  res.json({ ok: true });
}

export async function updateNotificationSettings(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Partial<{
    waterReminderEnabled: boolean; waterReminderIntervalMinutes: number;
    photoReminderEnabled: boolean; photoReminderIntervalDays: number;
    eventReminderEnabled: boolean; eventReminderMinutesBefore: number;
  }>;
  const settings = await prisma.notificationSettings.update({
    where: { userId: req.userId! },
    data: {
      ...(body.waterReminderEnabled !== undefined && { waterReminderEnabled: body.waterReminderEnabled }),
      ...(body.waterReminderIntervalMinutes !== undefined && { waterReminderIntervalMinutes: Number(body.waterReminderIntervalMinutes) }),
      ...(body.photoReminderEnabled !== undefined && { photoReminderEnabled: body.photoReminderEnabled }),
      ...(body.photoReminderIntervalDays !== undefined && { photoReminderIntervalDays: Number(body.photoReminderIntervalDays) }),
      ...(body.eventReminderEnabled !== undefined && { eventReminderEnabled: body.eventReminderEnabled }),
      ...(body.eventReminderMinutesBefore !== undefined && { eventReminderMinutesBefore: Number(body.eventReminderMinutesBefore) }),
    },
  });
  res.json(settings);
}
