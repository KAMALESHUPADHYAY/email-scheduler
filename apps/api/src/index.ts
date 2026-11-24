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

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  let redisOk = false;
  try {
    const pong = await redis.ping();
    redisOk = pong === 'PONG';
  } catch {
    redisOk = false;
  }

  res.json({
    status: dbOk && redisOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'healthy' : 'unhealthy',
      redis: redisOk ? 'healthy' : 'unhealthy',
    },
  });
});

// Routes
app.use('/auth', authLimiter, authRouter);
app.use('/campaigns', campaignsRouter);
app.use('/emails', emailsRouter);
app.use('/search', searchRouter);
app.use('/admin/queues', queuesRouter);

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
