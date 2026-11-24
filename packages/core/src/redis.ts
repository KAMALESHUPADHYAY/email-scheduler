import Redis, { RedisOptions } from 'ioredis';
import { config } from './config';
import { logger } from './logger';

export function createRedisClient(options?: RedisOptions): Redis {
  const isTls = config.REDIS_URL.startsWith('rediss://');

  const redisOptions: RedisOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true, // Don't crash immediately if Redis is unreachable on start
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
    ...(isTls
      ? {
          tls: {
            rejectUnauthorized: false, // Required for Upstash and cloud-managed Redis with self-signed SNI
          },
        }
      : {}),
    ...options,
  };

  const client = new Redis(config.REDIS_URL, redisOptions);

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis connection error');
  });

  return client;
}

// Singleton Redis instance for rate limiting, locking, and general caching
export const redis = createRedisClient();
