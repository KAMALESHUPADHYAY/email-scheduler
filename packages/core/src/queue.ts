import { Queue, QueueEvents, Job } from 'bullmq';
import { createRedisClient } from './redis';
import { EmailJobData } from './types';
import { logger } from './logger';

export const EMAIL_QUEUE_NAME = 'email-scheduler-queue';

// Reusable BullMQ connection instance
export const queueRedisConnection = createRedisClient();

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: queueRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const queueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: createRedisClient(),
});

/**
 * Adds an email job with idempotency (jobId = emailId) and exact delay.
 * NO cron, NO setInterval.
 */
export async function scheduleEmailJob(
  data: EmailJobData,
  scheduledAt: Date
): Promise<Job<EmailJobData>> {
  const now = Date.now();
  const targetTime = scheduledAt.getTime();
  const delay = Math.max(0, targetTime - now);

  const job = await emailQueue.add(
    'send-email',
    data,
    {
      jobId: data.emailId, // Enforce idempotency: email.id
      delay,
    }
  );

  logger.info(
    { jobId: job.id, emailId: data.emailId, delayMs: delay, scheduledAt: scheduledAt.toISOString() },
    'Scheduled email job in BullMQ'
  );

  return job;
}

/**
 * Calculates the start of the next hour (UTC/local timestamp) + optional stagger offset
 */
export function getNextHourWindow(offsetMs: number = 0): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0); // Next hour start :00.000
  return new Date(d.getTime() + offsetMs);
}
