import { Router } from 'express';
import type { Db } from '../db';

export function healthRouter(db: Db): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'down' });
    }
  });

  return router;
}
