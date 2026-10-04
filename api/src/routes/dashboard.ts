import { Router } from 'express';
import { z } from 'zod';
import type { HospitalRepository } from '../data/repository';
import { EXAM_THRESHOLDS } from '../farol';
import { notFound } from '../http/errors';
import { buildSnapshots, toDepartmentDetail, toDepartmentList, toOverview } from '../services/dashboard';

const departmentParams = z.object({ id: z.coerce.number().int().positive() });

export function dashboardRouter(repo: HospitalRepository): Router {
  const router = Router();

  router.get('/overview', async (_req, res) => {
    const [capacity, admissions, exams, avgLos] = await Promise.all([
      repo.departmentCapacity(),
      repo.activeAdmissions(),
      repo.examFunnel(EXAM_THRESHOLDS.redAboveHours),
      repo.avgLengthOfStayDays(),
    ]);
    res.json(toOverview(buildSnapshots(capacity, admissions), exams, avgLos));
  });

  router.get('/departments', async (_req, res) => {
    const [capacity, admissions] = await Promise.all([repo.departmentCapacity(), repo.activeAdmissions()]);
    res.json(toDepartmentList(buildSnapshots(capacity, admissions)));
  });

  router.get('/departments/:id', async (req, res) => {
    const { id } = departmentParams.parse(req.params);
    const [capacity, admissions, exams] = await Promise.all([
      repo.departmentCapacity(id),
      repo.activeAdmissions({ departmentId: id }),
      repo.examFunnel(EXAM_THRESHOLDS.redAboveHours, id),
    ]);
    if (capacity.length === 0) throw notFound(`Departamento ${id} não encontrado`);

    const [snapshot] = buildSnapshots(capacity, admissions);
    res.json(toDepartmentDetail(snapshot, exams));
  });

  return router;
}
