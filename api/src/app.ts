import express, { type Express } from 'express';
import { z } from 'zod';
import { createHospitalRepository, type HospitalRepository } from './data/repository';
import type { Db } from './db';
import { errorHandler, notFoundHandler } from './http/error-handler';
import { admissionsRouter } from './routes/admissions';
import { dashboardRouter } from './routes/dashboard';
import { healthRouter } from './routes/health';

// Mensagens de validação do Zod em português.
z.config(z.locales.pt());

export function createApp(db: Db, repo: HospitalRepository = createHospitalRepository(db)): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', healthRouter(db));
  app.use('/api', dashboardRouter(repo));
  app.use('/api', admissionsRouter(repo));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
