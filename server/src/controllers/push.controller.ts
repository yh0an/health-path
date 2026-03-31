import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function getVapidPublicKey(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}

export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(201).json({ ok: true });
}

export async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId! } });
  res.json({ ok: true });
}
