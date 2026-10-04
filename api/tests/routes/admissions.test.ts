import request from 'supertest';
import { createApp } from '../../src/app';
import type { Db } from '../../src/db';
import { fakeRepository, headerRow } from '../fixtures';

const db = { query: jest.fn() } as unknown as Db;

describe('GET /api/admissions', () => {
  it('usa página 1 com 20 itens por padrão', async () => {
    const res = await request(createApp(db, fakeRepository())).get('/api/admissions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('converte e repassa os filtros', async () => {
    const repo = fakeRepository();

    await request(createApp(db, repo)).get(
      '/api/admissions?status=internado&departmentId=5&search=%20silva%20&from=2026-09-01&to=2026-09-30',
    );

    expect(repo.activeAdmissions).toHaveBeenCalledWith({
      departmentId: 5,
      search: 'silva',
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });

  it('trata busca vazia como sem filtro', async () => {
    const repo = fakeRepository();

    await request(createApp(db, repo)).get('/api/admissions?status=internado&search=');

    expect(repo.activeAdmissions).toHaveBeenCalledWith({});
  });

  it.each([
    ['status=pendente', 'status'],
    ['departmentId=abc', 'departmentId'],
    ['page=0', 'page'],
    ['pageSize=101', 'pageSize'],
    ['from=01/09/2026', 'from'],
    ['from=2026-09-30&to=2026-09-01', 'from'],
  ])('responde 400 para %s', async (qs, field) => {
    const res = await request(createApp(db, fakeRepository())).get(`/api/admissions?${qs}`);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe(field);
  });
});

describe('GET /api/admissions/:id', () => {
  it('responde o detalhe', async () => {
    const repo = fakeRepository({ admissionHeader: jest.fn().mockResolvedValue(headerRow({ id: 7 })) });

    const res = await request(createApp(db, repo)).get('/api/admissions/7');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 7, status: 'internado', farol: 'green' });
    expect(repo.admissionVitals).toHaveBeenCalledWith(7);
    expect(repo.admissionExams).toHaveBeenCalledWith(7);
  });

  it('responde 404 quando não existe', async () => {
    const res = await request(createApp(db, fakeRepository())).get('/api/admissions/999');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Internação 999 não encontrada');
  });

  it('responde 400 para id inválido', async () => {
    const res = await request(createApp(db, fakeRepository())).get('/api/admissions/abc');

    expect(res.status).toBe(400);
  });
});
