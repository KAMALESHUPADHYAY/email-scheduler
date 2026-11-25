import http from 'http';
import { Worker } from 'bullmq';
import {
  EMAIL_QUEUE_NAME,
  createRedisClient,
  redis,
  config,
  logger,
  EmailJobData,
} from '@email-scheduler/core';
import { processEmailJob } from './processor';
import { requeueOverdueScheduledEmails } from './requeue';

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
    lockDuration: 60000, // 60s lock safety for SMTP dispatches
    stalledInterval: 60000, // Check for stalled jobs every 60s (cuts idle commands)
    drainDelay: 15000, // Wait 15s when queue is empty before polling again (saves Upstash commands)
    maxStalledCount: 2,
  }
);

// Heartbeat Loop (Writes to Redis so API /health and /debug know worker is online)
const HEARTBEAT_KEY = 'worker:heartbeat';
const HEARTBEAT_INTERVAL_MS = 15000;

async function sendWorkerHeartbeat() {
  try {
    const now = new Date().toISOString();
    await redis.set(HEARTBEAT_KEY, now, 'EX', 120); // 2 min TTL
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to write worker heartbeat to Redis');
  }
}

const heartbeatTimer = setInterval(sendWorkerHeartbeat, HEARTBEAT_INTERVAL_MS);
sendWorkerHeartbeat(); // Immediate first heartbeat

worker.on('ready', async () => {
  logger.info('🚀 BullMQ Worker is ready and listening for jobs');

  // Run safe overdue email requeue once upon worker startup
  try {
    await requeueOverdueScheduledEmails();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Startup overdue requeue failed');
  }
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

// HTTP Health Server for Render Web Service (prevents sleeping when pinged by uptime monitors)
const healthPort = Number(process.env.PORT) || 10000;
const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/' || req.url === '/ping') {
    const lastHeartbeat = await redis.get(HEARTBEAT_KEY).catch(() => null);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'ok',
        service: 'bullmq-worker',
        heartbeat: lastHeartbeat || new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

healthServer.listen(healthPort, () => {
  logger.info(`Worker HTTP health probe listening on port ${healthPort}`);
});

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Shutting down BullMQ worker gracefully...');
  try {
    clearInterval(heartbeatTimer);
    healthServer.close();
    await worker.close();
    logger.info('BullMQ worker closed cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during worker shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
