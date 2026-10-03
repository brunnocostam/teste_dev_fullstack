import request from 'supertest';
import { createApp } from '../../src/app';
import type { Db } from '../../src/db';
import { admissionRow, capacityRow, fakeRepository } from '../fixtures';

const db = { query: jest.fn() } as unknown as Db;

describe('GET /api/overview', () => {
  it('responde o farol do hospital, KPIs e departamentos', async () => {
    const repo = fakeRepository({
      departmentCapacity: jest.fn().mockResolvedValue([capacityRow({ occupiedBeds: 1 })]),
      activeAdmissions: jest.fn().mockResolvedValue([admissionRow()]),
      avgLengthOfStayDays: jest.fn().mockResolvedValue(4.2),
    });

    const res = await request(createApp(db, repo)).get('/api/overview');

    expect(res.status).toBe(200);
    expect(res.body.farol).toBe('green');
    expect(res.body.kpis.avgLengthOfStayDays).toBe(4.2);
    expect(res.body.departments).toHaveLength(1);
  });

  it('pede ao banco os exames atrasados com o limite configurado (24h)', async () => {
    const repo = fakeRepository();

    await request(createApp(db, repo)).get('/api/overview');

    expect(repo.examFunnel).toHaveBeenCalledWith(24);
  });
});

describe('GET /api/departments', () => {
  it('lista os departamentos com a cor', async () => {
    const repo = fakeRepository({
      departmentCapacity: jest.fn().mockResolvedValue([capacityRow({ id: 3, name: 'UTI' })]),
    });

    const res = await request(createApp(db, repo)).get('/api/departments');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 3, name: 'UTI', farol: 'green' }]);
  });
});

describe('GET /api/departments/:id', () => {
  it('filtra as consultas pelo departamento pedido', async () => {
    const repo = fakeRepository({
      departmentCapacity: jest.fn().mockResolvedValue([capacityRow({ id: 3 })]),
    });

    const res = await request(createApp(db, repo)).get('/api/departments/3');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(3);
    expect(repo.departmentCapacity).toHaveBeenCalledWith(3);
    expect(repo.activeAdmissions).toHaveBeenCalledWith(3);
    expect(repo.examFunnel).toHaveBeenCalledWith(24, 3);
  });

  it.each(['abc', '0', '-1', '1.5'])('responde 400 para id inválido (%s)', async (id) => {
    const res = await request(createApp(db, fakeRepository())).get(`/api/departments/${id}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 404 quando o departamento não existe', async () => {
    const res = await request(createApp(db, fakeRepository())).get('/api/departments/99');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Departamento 99 não encontrado');
  });
});
