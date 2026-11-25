import { Router, Request, Response } from 'express';
import { prisma, redis } from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';

export const statsRouter = Router();

statsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;

  // 1. Get the current user's sender
  const sender = await prisma.sender.findFirst({
    where: { user_id: user.id },
  });

  const senderIds = sender ? [sender.id] : [];

  // 2. Fetch counts directly filtered by current user's senders
  const [scheduledCount, sentCount, failedCount, nextScheduledEmail] = await Promise.all([
    prisma.email.count({
      where: {
        sender_id: { in: senderIds },
        status: 'scheduled',
      },
    }),
    prisma.email.count({
      where: {
        sender_id: { in: senderIds },
        status: 'sent',
      },
    }),
    prisma.email.count({
      where: {
        sender_id: { in: senderIds },
        status: 'failed',
      },
    }),
    prisma.email.findFirst({
      where: {
        sender_id: { in: senderIds },
        status: 'scheduled',
      },
      orderBy: { scheduled_at: 'asc' },
      select: { scheduled_at: true },
    }),
  ]);

  // 3. Sender hourly rate limit usage from Redis
  let usedThisHour = 0;
  if (sender) {
    const hourKey = new Date().toISOString().substring(0, 13);
    const countStr = await redis.get(`rl:sender:${sender.id}:${hourKey}`).catch(() => null);
    usedThisHour = Number(countStr || 0);
  }

  // 4. Hourly sent distribution across last 12 hours for this user only
  const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000);
  const recentSentEmails = await prisma.email.findMany({
    where: {
      sender_id: { in: senderIds },
      status: 'sent',
      sent_at: { gte: twelveHoursAgo },
    },
    select: { sent_at: true },
  });

  // Build hourly buckets in UTC
  const hourlyBuckets: { [utcHour: string]: number } = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() - i * 3600 * 1000);
    const key = d.toISOString().substring(0, 13) + ':00:00.000Z';
    hourlyBuckets[key] = 0;
  }

  recentSentEmails.forEach((e) => {
    if (e.sent_at) {
      const d = new Date(e.sent_at);
      const key = d.toISOString().substring(0, 13) + ':00:00.000Z';
      if (hourlyBuckets[key] !== undefined) {
        hourlyBuckets[key]++;
      }
    }
  });

  const chartPoints = Object.entries(hourlyBuckets).map(([utcIso, count]) => ({
    timestamp: utcIso,
    count,
  }));

  return res.json({
    success: true,
    data: {
      scheduledCount,
      sentCount,
      failedCount,
      nextSendTime: nextScheduledEmail ? nextScheduledEmail.scheduled_at.toISOString() : null,
      usedThisHour,
      hourlyLimit: sender?.hourly_limit || 50,
      senderEmail: sender?.email || null,
      chartPoints,
    },
  });
});
