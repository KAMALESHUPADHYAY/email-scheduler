import Redis, { RedisOptions } from 'ioredis';
import { config } from './config';
import { logger } from './logger';

/**
 * Returns a centralized, standardized ioredis options configuration.
 * Enforces maxRetriesPerRequest: null (required by BullMQ) and TLS for rediss://.
 */
export function getRedisOptions(overrides?: RedisOptions): RedisOptions {
  const isTls = config.REDIS_URL.startsWith('rediss://');

  return {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true, // Don't crash immediately if Redis is temporarily unreachable on start
    retryStrategy(times) {
      // Reconnect with capped exponential backoff
      const delay = Math.min(times * 250, 3000);
      return delay;
    },
    ...(isTls
      ? {
          tls: {
            rejectUnauthorized: false, // Required for Upstash and cloud-managed Redis with self-signed SNI
          },
        }
      : {}),
    ...overrides,
  };
}

export function createRedisClient(options?: RedisOptions): Redis {
  const client = new Redis(config.REDIS_URL, getRedisOptions(options));

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis connection error');
  });

  return client;
}

// Singleton Redis instance for rate limiting, locking, heartbeat, and general caching
export const redis = createRedisClient();
