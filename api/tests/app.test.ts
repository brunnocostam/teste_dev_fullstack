import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app';
import type { Db } from '../src/db';
import { AppError } from '../src/http/errors';
import { errorHandler } from '../src/http/error-handler';

function fakeDb(query: jest.Mock): Db {
  return { query } as unknown as Db;
}

describe('GET /api/health', () => {
  it('responde 200 quando o banco está acessível', async () => {
    const app = createApp(fakeDb(jest.fn().mockResolvedValue({ rows: [] })));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 503 quando o banco está fora', async () => {
    const app = createApp(fakeDb(jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable', database: 'down' });
  });
});

describe('rotas inexistentes', () => {
  it('respondem 404 no formato padrão de erro', async () => {
    const app = createApp(fakeDb(jest.fn()));

    const res = await request(app).get('/api/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('errorHandler', () => {
  function appThrowing(error: unknown) {
    const app = express();
    app.get('/boom', () => {
      throw error;
    });
    app.use(errorHandler);
    return app;
  }

  it('converte ZodError em 400 com os campos inválidos', async () => {
    const result = z.object({ page: z.coerce.number().int().min(1) }).safeParse({ page: '0' });
    const res = await request(appThrowing(result.error)).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('page');
  });

  it('usa status e código de um AppError', async () => {
    const res = await request(appThrowing(new AppError(404, 'NOT_FOUND', 'Internação 99 não encontrada'))).get('/boom');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Internação 99 não encontrada', details: [] },
    });
  });

  it('esconde detalhes de erros inesperados atrás de um 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(new Error('senha do banco vazou'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Erro interno do servidor', details: [] });
  });
});
