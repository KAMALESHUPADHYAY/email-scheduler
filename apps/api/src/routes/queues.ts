import { Router, Request, Response, NextFunction } from 'express';
import basicAuth from 'basic-auth';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue, config } from '@email-scheduler/core';

export const queuesRouter = Router();

// Basic Auth Middleware for Bull Board
function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const credentials = basicAuth(req);

  if (
    !credentials ||
    credentials.name !== config.ADMIN_USER ||
    credentials.pass !== config.ADMIN_PASSWORD
  ) {
    res.set('WWW-Authenticate', 'Basic realm="Bull Board Admin"');
    return res.status(401).send('Authentication required to access Bull Board.');
  }

  return next();
}

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});

queuesRouter.use('/', basicAuthMiddleware, serverAdapter.getRouter());
