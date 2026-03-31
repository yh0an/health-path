import webpush from 'web-push';
import cron from 'node-cron';
import prisma from '../lib/prisma';

export function initWebPush(): void {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body }),
      ).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }),
    ),
  );
}

export function startCronJobs(): void {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('VAPID keys not configured — push notifications disabled');
    return;
  }

  // Rappels hydratation : toutes les minutes
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const users = await prisma.user.findMany({
      where: {
        notificationSettings: { waterReminderEnabled: true },
        wakeHour: { lte: currentHour },
        sleepHour: { gt: currentHour },
      },
      include: { notificationSettings: true },
    });
    for (const user of users) {
      if (!user.notificationSettings) continue;
      const interval = user.notificationSettings.waterReminderIntervalMinutes;
      if (now.getMinutes() % interval === 0 && now.getSeconds() < 30) {
        await sendPushToUser(user.id, '💧 Hydratation', "N'oublie pas de boire de l'eau !");
      }
    }
  });

  // Rappels photos : tous les jours à 9h
  cron.schedule('0 9 * * *', async () => {
    const users = await prisma.user.findMany({
      where: { notificationSettings: { photoReminderEnabled: true } },
      include: {
        notificationSettings: true,
        progressPhotos: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    for (const user of users) {
      if (!user.notificationSettings) continue;
      const lastPhoto = user.progressPhotos[0];
      const daysSinceLast = lastPhoto
        ? Math.floor((Date.now() - lastPhoto.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      if (daysSinceLast >= user.notificationSettings.photoReminderIntervalDays) {
        await sendPushToUser(user.id, '📸 Photos de progression', "C'est le moment de prendre tes photos !");
      }
    }
  });

  // Rappels événements : toutes les minutes
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const users = await prisma.user.findMany({
      where: { notificationSettings: { eventReminderEnabled: true } },
      include: { notificationSettings: true },
    });
    for (const user of users) {
      if (!user.notificationSettings) continue;
      const minutesBefore = user.notificationSettings.eventReminderMinutesBefore;
      const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 30 * 1000);
      const events = await prisma.calendarEvent.findMany({
        where: { userId: user.id, completed: false, date: { gte: windowStart, lte: windowEnd } },
      });
      for (const event of events) {
        await sendPushToUser(user.id, `📅 ${event.title}`, `Commence dans ${minutesBefore} minutes`);
      }
    }
  });

  console.log('Cron jobs started');
}
