import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma, logger, AuthenticatedUser } from '@email-scheduler/core';

export interface UserSessionPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No session token provided',
      });
    }

    const decoded = jwt.verify(token, config.SESSION_SECRET) as UserSessionPayload;
    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid session token',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
    }

    req.user = user as AuthenticatedUser;
    return next();
  } catch (error) {
    logger.debug({ error }, 'Authentication error');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired session',
    });
  }
}
