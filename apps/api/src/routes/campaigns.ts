import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  prisma,
  logger,
  scheduleEmailJob,
  indexEmailDocument,
} from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';
import { ensureUserSender } from './auth';

export const campaignsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB CSV limit
});

const emailSchema = z.string().trim().email().toLowerCase();

/**
 * Extracts email strings from raw text/CSV
 */
function extractEmailsFromText(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const found: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // Split by comma, semicolon, tab or space
    const parts = line.split(/[,;\t]/);
    for (const part of parts) {
      const clean = part.replace(/["']/g, '').trim();
      if (clean && clean.includes('@') && !clean.toLowerCase().includes('email')) {
        found.push(clean);
      }
    }
  }
  return found;
}

campaignsRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    const user = req.user!;

    // 1. Ensure user has a sender
    let sender = await prisma.sender.findFirst({
      where: { user_id: user.id },
    });
    if (!sender) {
      sender = await ensureUserSender(user.id, user.email);
    }

    // 2. Parse incoming fields
    const {
      subject,
      body,
      start_time,
      delay_seconds,
      hourly_limit,
    } = req.body;
    const jsonRecipients = req.body.recipients || req.body.csv_data || req.body.csv;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Subject and body are required fields.',
      });
    }

    // 3. Collect raw recipient candidates
    let rawList: string[] = [];
    if (req.file) {
      const fileContent = req.file.buffer.toString('utf-8');
      rawList = extractEmailsFromText(fileContent);
    } else if (jsonRecipients) {
      if (Array.isArray(jsonRecipients)) {
        rawList = jsonRecipients.map((r) => String(r));
      } else if (typeof jsonRecipients === 'string') {
        try {
          const parsed = JSON.parse(jsonRecipients);
          rawList = Array.isArray(parsed) ? parsed : extractEmailsFromText(jsonRecipients);
        } catch {
          rawList = extractEmailsFromText(jsonRecipients);
        }
      }
    }

    if (rawList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No email recipients provided. Please upload a CSV or pass recipients.',
      });
    }

    const totalProvided = rawList.length;
    const validEmailsSet = new Set<string>();
    let invalidCount = 0;
    let duplicateCount = 0;

    for (const raw of rawList) {
      const validation = emailSchema.safeParse(raw);
      if (validation.success) {
        const cleanEmail = validation.data;
        if (validEmailsSet.has(cleanEmail)) {
          duplicateCount++;
        } else {
          validEmailsSet.add(cleanEmail);
        }
      } else {
        invalidCount++;
      }
    }

    const uniqueRecipients = Array.from(validEmailsSet);
    if (uniqueRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All provided email addresses were invalid or duplicates.',
        totalProvided,
        invalidCount,
        duplicateCount,
      });
    }

    // 4. Timing & parameters
    const parsedStartTime = start_time ? new Date(start_time) : new Date();
    const effectiveStartTime =
      isNaN(parsedStartTime.getTime()) || parsedStartTime.getTime() < Date.now()
        ? new Date()
        : parsedStartTime;

    const effectiveDelaySec = Math.max(
      1,
      Number(delay_seconds) || sender.hourly_limit ? Math.floor(3600 / (sender.hourly_limit || 20)) : 2
    );

    const effectiveHourlyLimit = Number(hourly_limit) || sender.hourly_limit || 20;

    // 5. Execute in ONE atomic database transaction
    const { campaign, emails } = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          user_id: user.id,
          sender_id: sender.id,
          subject,
          body,
          start_time: effectiveStartTime,
          delay_seconds: effectiveDelaySec,
          hourly_limit: effectiveHourlyLimit,
        },
      });

      const emailRecords = [];
      for (let i = 0; i < uniqueRecipients.length; i++) {
        const recipient = uniqueRecipients[i];
        // Stagger scheduled_at using delay_seconds between emails
        const scheduledTime = new Date(
          effectiveStartTime.getTime() + i * effectiveDelaySec * 1000
        );

        emailRecords.push({
          campaign_id: newCampaign.id,
          sender_id: sender.id,
          recipient,
          subject,
          body,
          scheduled_at: scheduledTime,
          status: 'scheduled' as const,
        });
      }

      // Create email records
      await tx.email.createMany({
        data: emailRecords,
      });

      const createdEmails = await tx.email.findMany({
        where: { campaign_id: newCampaign.id },
        orderBy: { scheduled_at: 'asc' },
      });

      return { campaign: newCampaign, emails: createdEmails };
    });

    // 6. Queue BullMQ DELAYED jobs (jobId = email.id for idempotency) & index in ES
    for (const email of emails) {
      try {
        await scheduleEmailJob(
          {
            emailId: email.id,
            campaignId: email.campaign_id,
            senderId: email.sender_id,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            scheduledAt: email.scheduled_at.toISOString(),
          },
          email.scheduled_at
        );

        // Soft-index in Elasticsearch
        indexEmailDocument(email).catch((err) =>
          logger.warn({ err, emailId: email.id }, 'Async ES indexing error on create')
        );
      } catch (err) {
        logger.error({ err, emailId: email.id }, 'Failed to schedule BullMQ job for email');
      }
    }

    logger.info(
      {
        campaignId: campaign.id,
        scheduledCount: emails.length,
        totalProvided,
        invalidCount,
        duplicateCount,
      },
      'Campaign created and emails scheduled successfully'
    );

    return res.status(201).json({
      success: true,
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        start_time: campaign.start_time,
        delay_seconds: campaign.delay_seconds,
        hourly_limit: campaign.hourly_limit,
      },
      totalProvided,
      validCount: uniqueRecipients.length,
      invalidCount,
      duplicateCount,
      scheduledEmails: emails.length,
    });
  }
);
