import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import {
  config,
  logger,
  checkDatabaseConnection,
  redis,
  initElasticsearchIndex,
} from '@email-scheduler/core';
import { authRouter } from './routes/auth';
import { campaignsRouter } from './routes/campaigns';
import { emailsRouter } from './routes/emails';
import { searchRouter } from './routes/search';
import { queuesRouter } from './routes/queues';
import { debugRouter } from './routes/debug';
import { statsRouter } from './routes/stats';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust reverse proxy for correct IP and secure cookies on Render/Vercel
app.set('trust proxy', 1);

// Security & Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Bull Board UI and external resources
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === config.FRONTEND_URL ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for Auth routes to protect against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
});

// Startup Environment Variables Validation
const requiredEnv = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'FRONTEND_URL',
  'API_PUBLIC_URL',
];
const missingEnv = requiredEnv.filter((k) => {
  const val = process.env[k];
  return !val || val === `mock_${k.toLowerCase()}`;
});
if (missingEnv.length > 0) {
  logger.warn(
    { missing: missingEnv },
    '⚠️ Some environment variables are unconfigured or using defaults: ' + missingEnv.join(', ')
  );
} else {
  logger.info('✅ All required environment variables are configured.');
}

// Health check endpoint (checks DB, Redis, Worker Heartbeat, and Config Booleans)
app.get('/health', async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  let redisOk = false;
  try {
    const pong = await redis.ping();
    redisOk = pong === 'PONG';
  } catch {
    redisOk = false;
  }

  let workerStatus = 'sleeping';
  let lastHeartbeat: string | null = null;
  let heartbeatAgeSeconds: number | null = null;

  try {
    lastHeartbeat = await redis.get('worker:heartbeat');
    if (lastHeartbeat) {
      const ageMs = Date.now() - new Date(lastHeartbeat).getTime();
      heartbeatAgeSeconds = Math.round(ageMs / 1000);
      workerStatus = ageMs < 90000 ? 'online' : 'sleeping';
    }
  } catch {
    workerStatus = 'unreachable';
  }

  const isGoogleConfigured = Boolean(
    config.GOOGLE_CLIENT_ID &&
    config.GOOGLE_CLIENT_ID !== 'mock_google_client_id' &&
    config.GOOGLE_CLIENT_SECRET &&
    config.GOOGLE_CLIENT_SECRET !== 'mock_google_client_secret'
  );
  const isSlackConfigured = Boolean(
    config.SLACK_CLIENT_ID && config.SLACK_CLIENT_SECRET
  );

  const isHealthy = dbOk && redisOk && workerStatus === 'online';

  res.status(isHealthy ? 200 : (dbOk && redisOk ? 200 : 503)).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'healthy' : 'unhealthy',
      redis: redisOk ? 'healthy' : 'unhealthy',
      worker: workerStatus,
    },
    googleConfigured: isGoogleConfigured,
    slackConfigured: isSlackConfigured,
    workerHeartbeat: lastHeartbeat,
    heartbeatAgeSeconds,
  });
});

// Routes
app.use('/auth', authLimiter, authRouter);
app.get('/me', (req, res, next) => {
  req.url = '/me';
  authRouter(req, res, next);
});
app.use('/campaigns', campaignsRouter);
app.use('/emails', emailsRouter);
app.use('/search', searchRouter);
app.use('/stats', statsRouter);
app.use('/admin/queues', queuesRouter);
app.use('/debug', debugRouter);

// Centralized Error Handling
app.use(errorHandler);

const port = config.PORT;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, async () => {
    logger.info(`🚀 API Server running on http://localhost:${port}`);
    logger.info(`📊 Bull Board running on http://localhost:${port}/admin/queues`);
    await initElasticsearchIndex().catch((e) =>
      logger.warn({ err: e }, 'ES init delayed or failed on boot')
    );
  });

  const shutdown = () => {
    logger.info('Shutting down API server gracefully...');
    server.close(() => {
      logger.info('API server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
