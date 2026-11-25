import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import {
  config,
  prisma,
  logger,
  ensureUserSender,
} from '@email-scheduler/core';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const oauth2Client = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI
);

// 1. Initiate Google OAuth with account chooser (prompt=select_account)
authRouter.get('/google', (req: Request, res: Response) => {
  if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID === 'mock_google_client_id') {
    logger.error('Google OAuth requested but GOOGLE_CLIENT_ID is not configured');
    return res.status(500).json({
      success: false,
      error: 'Google OAuth credentials are not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account', // Forces Google to show the account chooser for multi-user switching
    scope: ['openid', 'email', 'profile'],
  });

  return res.redirect(authUrl);
});

// 2. Google OAuth Callback
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    logger.warn('Google OAuth callback called without authorization code');
    return res.redirect(`${config.FRONTEND_URL}/login?error=missing_code`);
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

    // Refresh name, avatar, and google_id on EVERY login
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        google_id: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        avatar_url: payload.picture || null,
      },
      create: {
        google_id: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        avatar_url: payload.picture || null,
      },
    });

    // Ensure sender is created automatically on login
    await ensureUserSender(user.id, user.email);

    // Issue JWT session token
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
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ userId: user.id, email: user.email }, 'User logged in via Google OAuth successfully');
    return res.redirect(`${config.FRONTEND_URL}/dashboard`);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Google OAuth callback failure');
    return res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Automated Verification & Multi-User Testing Session Endpoint (Secured by SESSION_SECRET)
authRouter.get('/test-session', async (req: Request, res: Response) => {
  const secret = req.query.secret as string;
  if (!secret || secret !== config.SESSION_SECRET) {
    logger.warn('Unauthorized test-session request attempt');
    return res.status(403).json({ success: false, error: 'Unauthorized test session' });
  }

  const email = (req.query.email as string) || 'alice.walker@gmail.com';
  const name = (req.query.name as string) || 'Alice Walker';
  const avatarUrl =
    (req.query.avatar as string) ||
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330';

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, avatar_url: avatarUrl },
    create: {
      google_id: `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name,
      email,
      avatar_url: avatarUrl,
    },
  });

  await ensureUserSender(user.id, user.email);

  const sessionToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    },
    config.SESSION_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('session_token', sessionToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE as any,
    domain: config.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logger.info({ userId: user.id, email: user.email }, 'Generated authorized multi-user test session');
  return res.redirect(`${config.FRONTEND_URL}/dashboard`);
});

// 3. Current Authenticated User & Sender profile
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
      avatarUrl: user.avatar_url,
      avatar_url: user.avatar_url,
      has_slack: !!user.slack_token,
      slack_channel: user.slack_channel,
      created_at: user.created_at,
    },
    sender: sender
      ? {
          id: sender.id,
          email: sender.email,
          hourly_limit: sender.hourly_limit,
        }
      : null,
  });
});

// 4. Logout Endpoint (clears cookie with exact path '/')
const handleLogout = (req: Request, res: Response) => {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE as any,
    domain: config.COOKIE_DOMAIN || undefined,
    path: '/',
  });

  if (req.method === 'GET') {
    return res.redirect(`${config.FRONTEND_URL}/login`);
  }

  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

authRouter.post('/logout', handleLogout);
authRouter.get('/logout', handleLogout);

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
