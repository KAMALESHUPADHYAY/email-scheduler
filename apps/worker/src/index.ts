import http from 'http';
import { Worker } from 'bullmq';
import {
  EMAIL_QUEUE_NAME,
  createRedisClient,
  config,
  logger,
  EmailJobData,
} from '@email-scheduler/core';
import { processEmailJob } from './processor';

logger.info(
  {
    concurrency: config.WORKER_CONCURRENCY,
    minDelayMs: config.MIN_DELAY_MS,
    maxPerHour: config.MAX_EMAILS_PER_HOUR,
    maxPerHourPerSender: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
  },
  'Starting Background Email Scheduler Worker...'
);

// Worker Redis connection (maxRetriesPerRequest: null is required by BullMQ)
const workerRedisConnection = createRedisClient();

export const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job) => {
    return await processEmailJob(job);
  },
  {
    connection: workerRedisConnection,
    concurrency: config.WORKER_CONCURRENCY,
    lockDuration: 30000,
  }
);

worker.on('ready', () => {
  logger.info('🚀 BullMQ Worker is ready and listening for delayed/active jobs');
});

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
});

worker.on('error', (err) => {
  logger.error({ error: err }, 'Worker encountered an error');
});

// Optional HTTP health server for cloud hosting platforms (e.g. Render Web Service free tier)
const healthPort = process.env.PORT || 10000;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'bullmq-worker' }));
});

healthServer.listen(healthPort, () => {
  logger.info(`Worker health probe listening on port ${healthPort}`);
});

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Shutting down BullMQ worker gracefully...');
  try {
    healthServer.close();
    await worker.close();
    logger.info('BullMQ worker closed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during worker shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
