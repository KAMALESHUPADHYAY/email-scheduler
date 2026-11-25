import { Router, Request, Response, NextFunction } from 'express';
import basicAuth from 'basic-auth';
import {
  emailQueue,
  redis,
  checkDatabaseConnection,
  config,
  logger,
} from '@email-scheduler/core';

export const debugRouter = Router();

// Basic Auth Middleware (protected by ADMIN_USER and ADMIN_PASSWORD)
function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const credentials = basicAuth(req);

  if (
    !credentials ||
    credentials.name !== config.ADMIN_USER ||
    credentials.pass !== config.ADMIN_PASSWORD
  ) {
    res.set('WWW-Authenticate', 'Basic realm="MailPilot Admin Debug"');
    return res.status(401).send('Authentication required to access debug endpoints.');
  }

  return next();
}

debugRouter.get('/queue-status', basicAuthMiddleware, async (req: Request, res: Response) => {
  // 1. Redis Ping & Latency
  let redisPing = 'ERROR';
  let redisLatencyMs = -1;
  try {
    const t0 = Date.now();
    const pong = await redis.ping();
    redisLatencyMs = Date.now() - t0;
    redisPing = pong === 'PONG' ? `PONG (${redisLatencyMs}ms)` : pong;
  } catch (err: any) {
    redisPing = `ERROR: ${err.message}`;
  }

  // 2. Database Ping & Latency
  let dbPing = 'ERROR';
  let dbLatencyMs = -1;
  try {
    const t0 = Date.now();
    const ok = await checkDatabaseConnection();
    dbLatencyMs = Date.now() - t0;
    dbPing = ok ? `CONNECTED (${dbLatencyMs}ms)` : 'DISCONNECTED';
  } catch (err: any) {
    dbPing = `ERROR: ${err.message}`;
  }

  // 3. Counts of waiting / delayed / active / failed / completed jobs
  let jobCounts: Record<string, number> = {
    waiting: 0,
    delayed: 0,
    active: 0,
    failed: 0,
    completed: 0,
  };
  try {
    const counts = await emailQueue.getJobCounts(
      'waiting',
      'delayed',
      'active',
      'failed',
      'completed'
    );
    jobCounts = { ...jobCounts, ...counts };
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to get job counts from BullMQ');
  }

  // 4. Oldest Delayed Job's scheduled time (UTC)
  let oldestDelayedJob: {
    jobId?: string;
    emailId?: string;
    scheduledAtUtc?: string;
    delayRemainingMs?: number;
    jobTimestampUtc?: string;
  } | null = null;

  try {
    const delayedJobs = await emailQueue.getDelayed(0, 20);
    if (delayedJobs && delayedJobs.length > 0) {
      // Sort to find the earliest scheduled delayed job
      const sorted = delayedJobs.sort((a, b) => {
        const targetA = (a.timestamp || 0) + (a.opts.delay || 0);
        const targetB = (b.timestamp || 0) + (b.opts.delay || 0);
        return targetA - targetB;
      });
      const oldest = sorted[0];
      const targetTime = (oldest.timestamp || 0) + (oldest.opts.delay || 0);
      oldestDelayedJob = {
        jobId: oldest.id,
        emailId: oldest.data?.emailId,
        scheduledAtUtc: targetTime ? new Date(targetTime).toISOString() : undefined,
        delayRemainingMs: Math.max(0, targetTime - Date.now()),
        jobTimestampUtc: oldest.timestamp ? new Date(oldest.timestamp).toISOString() : undefined,
      };
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to query delayed jobs');
  }

  // 5. Worker's last heartbeat time (stored in Redis)
  let workerHeartbeat: {
    lastHeartbeatUtc: string | null;
    heartbeatAgeSeconds: number | null;
    status: 'online' | 'sleeping' | 'missing';
  } = {
    lastHeartbeatUtc: null,
    heartbeatAgeSeconds: null,
    status: 'missing',
  };

  try {
    const hbStr = await redis.get('worker:heartbeat');
    if (hbStr) {
      const ageMs = Date.now() - new Date(hbStr).getTime();
      const ageSec = Math.round(ageMs / 1000);
      workerHeartbeat = {
        lastHeartbeatUtc: hbStr,
        heartbeatAgeSeconds: ageSec,
        status: ageSec < 90 ? 'online' : 'sleeping',
      };
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to read worker heartbeat from Redis');
  }

  // 6. Last 5 failed jobs with failedReason
  let lastFailedJobs: Array<{
    jobId: string | undefined;
    emailId: string | undefined;
    failedReason: string | undefined;
    failedAtUtc: string | undefined;
  }> = [];

  try {
    const failed = await emailQueue.getFailed(0, 4);
    lastFailedJobs = failed.map((j) => ({
      jobId: j.id,
      emailId: j.data?.emailId,
      failedReason: j.failedReason,
      failedAtUtc: j.finishedOn ? new Date(j.finishedOn).toISOString() : undefined,
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to query failed jobs from BullMQ');
  }

  return res.json({
    status: 'ok',
    timestampUtc: new Date().toISOString(),
    redis: {
      ping: redisPing,
      latencyMs: redisLatencyMs,
    },
    database: {
      ping: dbPing,
      latencyMs: dbLatencyMs,
    },
    worker: workerHeartbeat,
    jobCounts,
    oldestDelayedJob,
    lastFailedJobs,
  });
});
