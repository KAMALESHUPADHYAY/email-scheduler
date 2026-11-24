import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
