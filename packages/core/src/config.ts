import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from closest .env or root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const rawPort = process.env.PORT || '4000';
const rawApiPublicUrl =
  process.env.API_PUBLIC_URL ||
  (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : `http://localhost:${rawPort}`);

const rawEsUrl =
  process.env.ELASTICSEARCH_URL ||
  process.env.ELASTICSEARCH_NODE ||
  'http://localhost:9200';

const rawAdminUser = process.env.ADMIN_USER || process.env.BULL_BOARD_USER || 'admin';
const rawAdminPass = process.env.ADMIN_PASSWORD || process.env.BULL_BOARD_PASS || 'admin';

const isProduction = process.env.NODE_ENV === 'production';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(Number(rawPort) || 4000),
  API_PUBLIC_URL: z.string().default(rawApiPublicUrl),
  FRONTEND_URL: z.string().default(process.env.FRONTEND_URL || 'http://localhost:3000'),

  // Database (Neon / Supabase / Local Postgres)
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public'),

  // Redis (Upstash TLS rediss:// / Local redis://)
  REDIS_URL: z.string().default(process.env.REDIS_URL || 'redis://localhost:6379'),

  // Elasticsearch (Bonsai / Elastic Cloud / Local)
  ELASTICSEARCH_URL: z.string().default(rawEsUrl),
  ELASTICSEARCH_INDEX: z.string().default(process.env.ELASTICSEARCH_INDEX || 'emails'),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  // Google OAuth (URLs built from API_PUBLIC_URL)
  GOOGLE_CLIENT_ID: z.string().default(process.env.GOOGLE_CLIENT_ID || 'mock_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().default(process.env.GOOGLE_CLIENT_SECRET || 'mock_google_client_secret'),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default(process.env.GOOGLE_REDIRECT_URI || `${rawApiPublicUrl}/auth/google/callback`),

  // Slack OAuth (URLs built from API_PUBLIC_URL)
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z
    .string()
    .default(process.env.SLACK_REDIRECT_URI || `${rawApiPublicUrl}/auth/slack/callback`),

  // Session & Security (Secure & SameSite=none for cross-domain Vercel <-> Render in production)
  SESSION_SECRET: z.string().default(process.env.SESSION_SECRET || 'default_session_secret_change_in_production_32char'),
  COOKIE_SECURE: z.preprocess(
    (val) => (val !== undefined ? val === 'true' || val === true : isProduction),
    z.boolean().default(isProduction)
  ),
  COOKIE_SAME_SITE: z
    .enum(['lax', 'strict', 'none'])
    .default(isProduction ? 'none' : 'lax'),
  COOKIE_DOMAIN: z.string().optional(),

  // Bull Board Admin Auth
  ADMIN_USER: z.string().default(rawAdminUser),
  ADMIN_PASSWORD: z.string().default(rawAdminPass),

  // Queue & Rate Limiting Parameters (Non-hardcoded)
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(Number(process.env.MAX_EMAILS_PER_HOUR) || 100),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce
    .number()
    .default(Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER) || 20),
  WORKER_CONCURRENCY: z.coerce.number().default(Number(process.env.WORKER_CONCURRENCY) || 5),
  MIN_DELAY_MS: z.coerce.number().default(Number(process.env.MIN_DELAY_MS) || 2000),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse(process.env);
