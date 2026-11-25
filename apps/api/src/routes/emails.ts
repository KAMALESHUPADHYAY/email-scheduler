import { Router, Request, Response } from 'express';
import { prisma, EmailStatusType } from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';

export const emailsRouter = Router();

emailsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const statusParam = req.query.status as string;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const validStatuses: EmailStatusType[] = ['scheduled', 'sent', 'failed'];
  const statusFilter =
    statusParam && validStatuses.includes(statusParam as EmailStatusType)
      ? (statusParam as EmailStatusType)
      : undefined;

  // Find sender(s) of this user
  const senders = await prisma.sender.findMany({
    where: { user_id: user.id },
    select: { id: true },
  });
  const senderIds = senders.map((s) => s.id);

  const whereClause: any = {
    sender_id: { in: senderIds },
  };

  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  const [total, emails] = await Promise.all([
    prisma.email.count({ where: whereClause }),
    prisma.email.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { scheduled_at: 'desc' },
      include: {
        campaign: {
          select: {
            id: true,
            subject: true,
          },
        },
      },
    }),
  ]);

  return res.json({
    success: true,
    data: emails,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// GET /emails/:id - Fetch single email with detail
emailsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const emailId = req.params.id;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          user_id: true,
        },
      },
      campaign: {
        select: {
          id: true,
          subject: true,
          created_at: true,
        },
      },
    },
  });

  if (!email || email.sender.user_id !== user.id) {
    return res.status(404).json({
      success: false,
      error: 'Email not found or access denied.',
    });
  }

  return res.json({
    success: true,
    data: email,
  });
});

// PATCH /emails/:id/star - Toggle starred status
emailsRouter.patch('/:id/star', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const emailId = req.params.id;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: {
        select: { user_id: true },
      },
    },
  });

  if (!email || email.sender.user_id !== user.id) {
    return res.status(404).json({
      success: false,
      error: 'Email not found or access denied.',
    });
  }

  const updated = await prisma.email.update({
    where: { id: emailId },
    data: {
      is_starred: !(email as any).is_starred,
    } as any,
  });

  return res.json({
    success: true,
    data: updated,
  });
});
