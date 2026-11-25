import {
  prisma,
  emailQueue,
  scheduleEmailJob,
  logger,
} from '@email-scheduler/core';

/**
 * Scans the database once upon worker boot for emails marked 'scheduled'
 * whose scheduled_at timestamp has passed and ensures they have an active/delayed
 * BullMQ job. Idempotent: checks emailQueue.getJob(email.id) first to never duplicate.
 */
export async function requeueOverdueScheduledEmails(): Promise<{
  checked: number;
  requeued: number;
}> {
  logger.info('Scanning for overdue scheduled emails on worker startup...');
  const now = new Date();

  try {
    // 1. Query emails that are 'scheduled' with scheduled_at <= now
    const overdueEmails = await prisma.email.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: { lte: now },
      },
      orderBy: { scheduled_at: 'asc' },
      take: 200, // Batch cap for startup safety
    });

    let requeuedCount = 0;

    for (const email of overdueEmails) {
      try {
        // 2. Check if a job with this exact email ID already exists in BullMQ
        const existingJob = await emailQueue.getJob(email.id);

        if (existingJob) {
          const state = await existingJob.getState();
          logger.debug(
            { emailId: email.id, state, jobId: existingJob.id },
            'Job already exists in BullMQ, skipping requeue'
          );
          continue;
        }

        // 3. No BullMQ job found: add immediately with delay = 0 and jobId = email.id
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
          now // Run immediately
        );

        requeuedCount++;
        logger.info(
          {
            event: 'overdue_job_requeued',
            emailId: email.id,
            recipient: email.recipient,
            originalScheduledAt: email.scheduled_at.toISOString(),
          },
          `[REQUEUE] Requeued overdue email ${email.id} (originally scheduled for ${email.scheduled_at.toISOString()})`
        );
      } catch (err: any) {
        logger.error(
          { emailId: email.id, err: err.message },
          'Error checking or requeuing overdue email'
        );
      }
    }

    logger.info(
      { checked: overdueEmails.length, requeued: requeuedCount },
      `Overdue email scan complete: ${requeuedCount} requeued out of ${overdueEmails.length} overdue records`
    );

    return { checked: overdueEmails.length, requeued: requeuedCount };
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to scan overdue emails on startup');
    return { checked: 0, requeued: 0 };
  }
}
