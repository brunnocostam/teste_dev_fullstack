import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

function mockFetch(response: Partial<Response> | Error) {
  const fetchMock = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cliente da API', () => {
  it('monta a query string só com filtros preenchidos', async () => {
    const fetchMock = mockFetch({ ok: true, json: () => Promise.resolve({ items: [] }) });

    await api.admissions({ status: 'alta', search: '', departmentId: undefined, page: 2, pageSize: 20 });

    expect(fetchMock).toHaveBeenCalledWith('/api/admissions?status=alta&page=2&pageSize=20', expect.anything());
  });

  it('converte o erro da API em ApiError com status, código e mensagem', async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Internação 9 não encontrada' } }),
    });

    await expect(api.admission(9)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Internação 9 não encontrada',
    });
  });

  it('usa mensagem genérica quando a resposta de erro não é JSON', async () => {
    mockFetch({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('html')) });

    await expect(api.overview()).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('trata falha de rede como status 0', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const error = await api.overview().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
