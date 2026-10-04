import { Router } from 'express';
import { z } from 'zod';
import type { HospitalRepository } from '../data/repository';
import { notFound } from '../http/errors';
import { listAdmissions, toAdmissionDetail } from '../services/admissions';

const listQuery = z
  .object({
    status: z.enum(['internado', 'alta', 'obito']).optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    // Busca vazia (?search=) equivale a não filtrar.
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => value || undefined),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'A data inicial deve ser anterior ou igual à final',
    path: ['from'],
  });

const admissionParams = z.object({ id: z.coerce.number().int().positive() });

export function admissionsRouter(repo: HospitalRepository): Router {
  const router = Router();

  router.get('/admissions', async (req, res) => {
    const query = listQuery.parse(req.query);
    res.json(await listAdmissions(repo, query));
  });

  router.get('/admissions/:id', async (req, res) => {
    const { id } = admissionParams.parse(req.params);
    const [header, vitals, exams] = await Promise.all([
      repo.admissionHeader(id),
      repo.admissionVitals(id),
      repo.admissionExams(id),
    ]);
    if (!header) throw notFound(`Internação ${id} não encontrada`);

    res.json(toAdmissionDetail(header, vitals, exams));
  });

  return router;
}
