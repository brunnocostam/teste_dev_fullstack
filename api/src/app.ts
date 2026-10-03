import express, { type Express } from 'express';
import type { Db } from './db';
import { errorHandler, notFoundHandler } from './http/error-handler';
import { healthRouter } from './routes/health';

export function createApp(db: Db): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', healthRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
