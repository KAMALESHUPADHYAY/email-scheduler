import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import {
  config,
  prisma,
  logger,
  createEtherealAccount,
} from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const oauth2Client = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI
);

// Helper to ensure user has an Ethereal sender
export async function ensureUserSender(userId: string, userEmail: string) {
  let sender = await prisma.sender.findFirst({
    where: { user_id: userId },
  });

  if (!sender) {
    try {
      const ethereal = await createEtherealAccount();
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
      logger.info({ userId, senderEmail: userEmail }, 'Created Ethereal sender for user');
    } catch (err) {
      logger.error({ err }, 'Failed to create Ethereal account, falling back to mock sender');
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

  return sender;
}

// 1. Initiate Google OAuth
authRouter.get('/google', (req: Request, res: Response) => {
  // If credentials are mock/missing and requested, support direct redirect or OAuth URL
  if (config.GOOGLE_CLIENT_ID === 'mock_google_client_id') {
    return res.redirect('/auth/dev-login');
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
  });

  return res.redirect(authUrl);
});

// 2. Google OAuth Callback
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.id_token) {
      throw new Error('Google did not return an id_token');
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid token payload from Google');
    }

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        google_id: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        avatar_url: payload.picture,
      },
      create: {
        google_id: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        avatar_url: payload.picture,
      },
    });

    await ensureUserSender(user.id, user.email);

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE as any,
      domain: config.COOKIE_DOMAIN || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${config.FRONTEND_URL}/dashboard`);
  } catch (error) {
    logger.error({ error }, 'Google OAuth callback failure');
    return res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Dev / Demo Login Route (for instant evaluation without setting up GCP credentials)
authRouter.get('/dev-login', async (req: Request, res: Response) => {
  const email = (req.query.email as string) || 'demo.user@reachinbox.test';
  const name = (req.query.name as string) || 'Demo Candidate';

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    create: {
      google_id: `mock_google_${Date.now()}`,
      email,
      name,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
  });

  await ensureUserSender(user.id, user.email);

  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.SESSION_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('session_token', sessionToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE as any,
    domain: config.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.redirect(`${config.FRONTEND_URL}/dashboard`);
});

// 3. Current User Endpoint
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const sender = await prisma.sender.findFirst({
    where: { user_id: user.id },
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      has_slack: !!user.slack_token,
      slack_channel: user.slack_channel,
      created_at: user.created_at,
    },
    sender: sender
      ? {
          id: sender.id,
          email: sender.email,
          ethereal_user: sender.ethereal_user,
          hourly_limit: sender.hourly_limit,
        }
      : null,
  });
});

// 4. Logout Endpoint
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE as any,
    domain: config.COOKIE_DOMAIN || undefined,
  });

  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// 5. Slack OAuth Initiation
authRouter.get('/slack', requireAuth, (req: Request, res: Response) => {
  if (!config.SLACK_CLIENT_ID) {
    return res.status(400).json({
      success: false,
      error: 'Slack client credentials are not configured.',
    });
  }

  const userId = req.user!.id;
  const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${
    config.SLACK_CLIENT_ID
  }&scope=chat:write,channels:read&redirect_uri=${encodeURIComponent(
    config.SLACK_REDIRECT_URI
  )}&state=${userId}`;

  return res.redirect(slackUrl);
});

// 6. Slack OAuth Callback
authRouter.get('/slack/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const stateUserId = req.query.state as string;

  if (!code || !stateUserId) {
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error`);
  }

  try {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: config.SLACK_CLIENT_ID || '',
        client_secret: config.SLACK_CLIENT_SECRET || '',
        code,
        redirect_uri: config.SLACK_REDIRECT_URI,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = response.data;
    if (!data.ok) {
      logger.error({ data }, 'Slack OAuth token exchange failed');
      return res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error`);
    }

    const accessToken = data.access_token;
    const incomingChannel =
      data.incoming_webhook?.channel_id || data.authed_user?.id || null;

    await prisma.user.update({
      where: { id: stateUserId },
      data: {
        slack_token: accessToken,
        slack_channel: incomingChannel,
      },
    });

    logger.info({ userId: stateUserId }, 'Slack connected successfully for user');
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack=success`);
  } catch (error) {
    logger.error({ error }, 'Slack callback error');
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error`);
  }
});
