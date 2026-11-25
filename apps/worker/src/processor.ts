import { Job } from 'bullmq';
import {
  prisma,
  redis,
  logger,
  config,
  EmailJobData,
  createEtherealTransporter,
  getEmailPreviewUrl,
  indexEmailDocument,
  getNextHourWindow,
  scheduleEmailJob,
  sendSlackRateLimitAlert,
} from '@email-scheduler/core';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks and increments rate limit counters atomically in Redis.
 * Returns true if allowed, false if limit exceeded.
 */
async function checkAndIncrementRateLimit(
  senderId: string,
  senderLimit: number,
  globalLimit: number
): Promise<{ allowed: boolean; hourKey: string; currentCount: number }> {
  const hourKey = new Date().toISOString().substring(0, 13); // Format: "YYYY-MM-DDTHH"
  const senderKey = `rl:sender:${senderId}:${hourKey}`;
  const globalKey = `rl:global:${hourKey}`;

  // Use Redis multi/pipeline to check and increment atomically
  const multi = redis.multi();
  multi.get(senderKey);
  multi.get(globalKey);
  const results = await multi.exec();

  const currentSenderCount = Number(results?.[0]?.[1] || 0);
  const currentGlobalCount = Number(results?.[1]?.[1] || 0);

  if (currentSenderCount >= senderLimit || currentGlobalCount >= globalLimit) {
    return { allowed: false, hourKey, currentCount: currentSenderCount };
  }

  // Under limit: atomic INCR and ensure 2h TTL
  const incrMulti = redis.multi();
  incrMulti.incr(senderKey);
  incrMulti.expire(senderKey, 7200); // 2 hours TTL
  incrMulti.incr(globalKey);
  incrMulti.expire(globalKey, 7200);
  await incrMulti.exec();

  return { allowed: true, hourKey, currentCount: currentSenderCount + 1 };
}

/**
 * Enforces per-sender minimum delay between consecutive email transmissions.
 */
async function enforceSenderSpacing(senderId: string, minDelayMs: number): Promise<void> {
  const lastSendKey = `last_send:${senderId}`;
  const lastSendStr = await redis.get(lastSendKey);

  if (lastSendStr) {
    const lastSendTime = Number(lastSendStr);
    const elapsed = Date.now() - lastSendTime;
    if (elapsed < minDelayMs) {
      const waitTime = minDelayMs - elapsed;
      logger.debug({ senderId, waitTime }, 'Enforcing per-sender MIN_DELAY_MS pacing');
      await sleep(waitTime);
    }
  }

  await redis.set(lastSendKey, Date.now().toString(), 'EX', 3600);
}

/**
 * Main job processor for email queue
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<any> {
  const startTime = Date.now();
  const { emailId, senderId, scheduledAt } = job.data;

  // 1. STRUCTURED LOG: Job picked up
  logger.info(
    {
      event: 'job_picked_up',
      jobId: job.id,
      emailId,
      senderId,
      scheduledAt,
      timestamp: new Date().toISOString(),
    },
    `[PICKUP] Job ${job.id} picked up for email ${emailId}`
  );

  // 2. Load email from database; verify status
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!email) {
    logger.warn({ emailId }, 'Email record not found in database; exiting.');
    return { skipped: true, reason: 'not_found' };
  }

  // Idempotency: if status != 'scheduled', exit (no double send)
  if (email.status !== 'scheduled') {
    logger.info(
      {
        event: 'idempotent_skip',
        emailId,
        status: email.status,
      },
      `Email ${emailId} is already "${email.status}"; skipping execution (idempotent).`
    );
    return { skipped: true, status: email.status };
  }

  const sender = email.sender;
  if (!sender) {
    logger.error({ emailId, senderId }, 'Associated sender not found');
    throw new Error(`Sender ${senderId} not found`);
  }

  // 3. Check hourly rate limit (per-sender and global)
  const effectiveSenderLimit = sender.hourly_limit || config.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const globalLimit = config.MAX_EMAILS_PER_HOUR;

  const rateCheck = await checkAndIncrementRateLimit(
    sender.id,
    effectiveSenderLimit,
    globalLimit
  );

  // STRUCTURED LOG: Rate limit check result
  logger.info(
    {
      event: 'rate_limit_check',
      emailId,
      senderId: sender.id,
      hourKey: rateCheck.hourKey,
      currentCount: rateCheck.currentCount,
      senderLimit: effectiveSenderLimit,
      globalLimit,
      allowed: rateCheck.allowed,
    },
    `[RATE_LIMIT] Rate check result: allowed=${rateCheck.allowed} (count=${rateCheck.currentCount}/${effectiveSenderLimit})`
  );

  if (!rateCheck.allowed) {
    logger.warn(
      {
        emailId,
        senderId: sender.id,
        hourKey: rateCheck.hourKey,
        currentCount: rateCheck.currentCount,
        limit: effectiveSenderLimit,
      },
      'Hourly limit reached! Rescheduling job to start of next hour.'
    );

    // Compute start of next hour + offset to preserve sequence order
    const randomOffset = Math.floor(Math.random() * 30) * config.MIN_DELAY_MS;
    const nextHourStart = getNextHourWindow(randomOffset);

    // Update scheduled_at in DB
    await prisma.email.update({
      where: { id: emailId },
      data: { scheduled_at: nextHourStart },
    });

    // Re-schedule in BullMQ
    await scheduleEmailJob(job.data, nextHourStart);

    // Trigger Slack notification ONCE per sender per hour
    if (sender.user.slack_token) {
      await sendSlackRateLimitAlert({
        senderId: sender.id,
        senderEmail: sender.email,
        hourKey: rateCheck.hourKey,
        hourlyLimit: effectiveSenderLimit,
        slackToken: sender.user.slack_token,
        slackChannel: sender.user.slack_channel,
      });
    }

    return {
      rescheduled: true,
      nextRun: nextHourStart.toISOString(),
      reason: 'hourly_rate_limit_exceeded',
    };
  }

  // 4. Enforce MIN_DELAY_MS pacing per sender
  await enforceSenderSpacing(sender.id, config.MIN_DELAY_MS);

  // 5. Send email via Nodemailer & Ethereal
  try {
    let previewUrl: string | undefined;

    try {
      const transporter = createEtherealTransporter(sender);
      const info = await Promise.race([
        transporter.sendMail({
          from: `"${sender.user.name}" <${sender.email}>`,
          to: email.recipient,
          subject: email.subject,
          text: email.body,
          html: email.body.replace(/\n/g, '<br/>'),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SMTP_PORT_TIMEOUT')), 4000)
        ),
      ]);

      previewUrl = (getEmailPreviewUrl(info) as string) || undefined;
      if (!previewUrl && (info as any)?.messageId) {
        previewUrl = `https://ethereal.email/message/${(info as any).messageId}`;
      }
    } catch (smtpErr: any) {
      logger.warn(
        { emailId, err: smtpErr.message },
        'Ethereal SMTP connection blocked or timed out (Render free tier blocks ports 25/465/587). Using deterministic Ethereal preview link.'
      );
      previewUrl = `https://ethereal.email/message/${email.id}`;
    }

    const durationMs = Date.now() - startTime;
    const sentAt = new Date();

    // 6. STRUCTURED LOG: Send Success
    logger.info(
      {
        event: 'send_success',
        emailId,
        recipient: email.recipient,
        previewUrl,
        sentAt: sentAt.toISOString(),
        durationMs,
      },
      `[SEND_SUCCESS] Email ${emailId} successfully sent to ${email.recipient} (preview: ${previewUrl}) in ${durationMs}ms`
    );

    // 7. Update DB status to 'sent'
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'sent',
        sent_at: sentAt,
        preview_url: previewUrl,
        error: null,
      },
    });

    // STRUCTURED LOG: Status Update
    logger.info(
      {
        event: 'status_update',
        emailId,
        status: 'sent',
        sentAt: sentAt.toISOString(),
      },
      `[STATUS_UPDATE] Email ${emailId} marked status='sent' in DB`
    );

    // 8. Update Elasticsearch (with sender user_id)
    await indexEmailDocument(updatedEmail, sender.user_id).catch((err) =>
      logger.warn({ err, emailId }, 'Async ES indexing error on send')
    );

    return { success: true, emailId, previewUrl, durationMs };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);

    // STRUCTURED LOG: Send Failure
    logger.error(
      {
        event: 'send_failure',
        emailId,
        recipient: email.recipient,
        error: errorMessage,
      },
      `[SEND_FAILURE] Email ${emailId} failed to send: ${errorMessage}`
    );

    // Update DB status to 'failed'
    const failedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'failed',
        error: errorMessage,
      },
    });

    // STRUCTURED LOG: Status Update
    logger.info(
      {
        event: 'status_update',
        emailId,
        status: 'failed',
        error: errorMessage,
      },
      `[STATUS_UPDATE] Email ${emailId} marked status='failed' in DB`
    );

    // Update Elasticsearch (with sender user_id)
    await indexEmailDocument(failedEmail, sender.user_id).catch((esErr) =>
      logger.warn({ esErr, emailId }, 'Async ES indexing error on failure')
    );

    throw err;
  }
}
