import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from './db';
import { config } from './config';
import { logger } from './logger';

export interface EtherealCredentials {
  user: string;
  pass: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
}

export async function createEtherealAccount(): Promise<EtherealCredentials> {
  const account = await nodemailer.createTestAccount();
  logger.info({ user: account.user }, 'Generated new Ethereal test SMTP account');
  return {
    user: account.user,
    pass: account.pass,
    smtp: {
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
    },
  };
}

export function createEtherealTransporter(credentials: {
  ethereal_user: string;
  ethereal_pass: string;
  smtp_host?: string;
  smtp_port?: number;
}): Transporter {
  return nodemailer.createTransport({
    host: credentials.smtp_host || 'smtp.ethereal.email',
    port: credentials.smtp_port || 587,
    secure: false,
    auth: {
      user: credentials.ethereal_user,
      pass: credentials.ethereal_pass,
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 4000,
  });
}

export function getEmailPreviewUrl(info: any): string | false {
  return nodemailer.getTestMessageUrl(info);
}

export async function ensureUserSender(userId: string, userEmail: string) {
  let sender = await prisma.sender.findFirst({
    where: { user_id: userId },
  });

  // If sender has mock or missing credentials, attempt to create real Ethereal credentials
  if (!sender || sender.ethereal_user === 'mock_ethereal_user') {
    try {
      const ethereal = await createEtherealAccount();
      if (!sender) {
        sender = await prisma.sender.create({
          data: {
            user_id: userId,
            email: userEmail,
            ethereal_user: ethereal.user,
            ethereal_pass: ethereal.pass,
            smtp_host: ethereal.smtp.host,
            smtp_port: ethereal.smtp.port,
            hourly_limit: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
          },
        });
        logger.info({ userId, senderEmail: userEmail, etherealUser: ethereal.user }, 'Created Ethereal sender for user');
      } else {
        sender = await prisma.sender.update({
          where: { id: sender.id },
          data: {
            ethereal_user: ethereal.user,
            ethereal_pass: ethereal.pass,
            smtp_host: ethereal.smtp.host,
            smtp_port: ethereal.smtp.port,
          },
        });
        logger.info({ userId, senderEmail: userEmail, etherealUser: ethereal.user }, 'Upgraded sender with real Ethereal credentials');
      }
    } catch (err: any) {
      logger.error({ err: err.message, userId }, 'Failed to create Ethereal account, falling back to mock sender');
      if (!sender) {
        sender = await prisma.sender.create({
          data: {
            user_id: userId,
            email: userEmail,
            ethereal_user: 'mock_ethereal_user',
            ethereal_pass: 'mock_ethereal_pass',
            smtp_host: 'smtp.ethereal.email',
            smtp_port: 587,
            hourly_limit: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
          },
        });
      }
    }
  }

  return sender;
}
