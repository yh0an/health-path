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
