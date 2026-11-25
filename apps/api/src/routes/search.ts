import { Router, Request, Response } from 'express';
import { prisma, searchEmailsInES, logger } from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';

export const searchRouter = Router();

searchRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const q = (req.query.q as string) || '';
  const status = (req.query.status as string) || 'all';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  // Retrieve user's sender IDs
  const senders = await prisma.sender.findMany({
    where: { user_id: user.id },
    select: { id: true },
  });
  const senderIds = new Set(senders.map((s) => s.id));

  // 1. Try Elasticsearch first (with strict user_id isolation)
  try {
    const esResult = await searchEmailsInES({
      query: q,
      userId: user.id,
      status: status !== 'all' ? status : undefined,
      limit,
      offset,
    });

    if (esResult) {
      // Hits are already filtered by user_id in ES, double-check senderIds
      const userHits = esResult.emails.filter((item: any) => senderIds.has(item.sender_id));
      return res.json({
        success: true,
        source: 'elasticsearch',
        data: userHits,
        pagination: {
          total: esResult.total,
          page,
          limit,
          totalPages: Math.ceil(esResult.total / limit) || 1,
        },
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Elasticsearch search threw exception, falling back to PostgreSQL');
  }

  // 2. Fallback to PostgreSQL
  logger.debug('Executing fallback search query on PostgreSQL');
  const where: any = {
    sender_id: { in: Array.from(senderIds) },
  };

  if (status && status !== 'all') {
    where.status = status;
  }

  if (q.trim()) {
    where.OR = [
      { recipient: { contains: q.trim(), mode: 'insensitive' } },
      { subject: { contains: q.trim(), mode: 'insensitive' } },
      { body: { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const [total, emails] = await Promise.all([
    prisma.email.count({ where }),
    prisma.email.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { scheduled_at: 'desc' },
    }),
  ]);

  return res.json({
    success: true,
    source: 'postgres_fallback',
    data: emails,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});
