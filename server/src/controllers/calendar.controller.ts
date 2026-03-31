import { Response } from 'express';
import { EventType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function getEvents(req: AuthRequest, res: Response): Promise<void> {
  const { from, to } = req.query;
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: req.userId!,
      date: {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      },
    },
    orderBy: { date: 'asc' },
  });
  res.json(events);
}

export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
  const { title, description, date, endDate, eventType, sportType, isRecurring, recurrenceRule } = req.body as {
    title: string; description?: string; date: string; endDate?: string;
    eventType: string; sportType?: string; isRecurring?: boolean; recurrenceRule?: string;
  };
  if (!title || !date || !eventType) {
    res.status(400).json({ error: 'title, date and eventType are required' });
    return;
  }
  const event = await prisma.calendarEvent.create({
    data: {
      userId: req.userId!,
      title,
      description: description || null,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      eventType: eventType as EventType,
      sportType: sportType || null,
      isRecurring: isRecurring ?? false,
      recurrenceRule: recurrenceRule || null,
    },
  });
  res.status(201).json(event);
}

export async function updateEvent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id: id as string, userId: req.userId! } });
  if (!event) { res.status(404).json({ error: 'Not found' }); return; }
  const body = req.body as Partial<{
    title: string; description: string; date: string; endDate: string;
    eventType: string; sportType: string; isRecurring: boolean; recurrenceRule: string; completed: boolean;
  }>;
  const updated = await prisma.calendarEvent.update({
    where: { id: id as string },
    data: {
      title: body.title ?? event.title,
      description: body.description ?? event.description,
      date: body.date ? new Date(body.date) : event.date,
      endDate: body.endDate ? new Date(body.endDate) : event.endDate,
      eventType: (body.eventType as EventType) ?? event.eventType,
      sportType: body.sportType ?? event.sportType,
      isRecurring: body.isRecurring ?? event.isRecurring,
      recurrenceRule: body.recurrenceRule ?? event.recurrenceRule,
      completed: body.completed ?? event.completed,
    },
  });
  res.json(updated);
}

export async function deleteEvent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id: id as string, userId: req.userId! } });
  if (!event) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.calendarEvent.delete({ where: { id: id as string } });
  res.status(204).send();
}
