import { describe, expect, it } from 'vitest';
import { hasActiveFilters, readFilters, withFilters, withPage } from './admissionFilters';

const params = (query: string) => new URLSearchParams(query);

describe('readFilters', () => {
  it('lê os filtros válidos da URL', () => {
    expect(readFilters(params('status=alta&departmentId=3&search=ana&from=2026-10-01&to=2026-10-04&page=2'))).toEqual({
      status: 'alta',
      departmentId: 3,
      search: 'ana',
      from: '2026-10-01',
      to: '2026-10-04',
      page: 2,
    });
  });

  it('ignora valores inválidos de um link editado à mão', () => {
    expect(readFilters(params('status=fugiu&departmentId=abc&search=%20%20&from=01/10/2026&to=ontem&page=-1'))).toEqual({
      status: undefined,
      departmentId: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });

  it('começa na página 1 sem filtros', () => {
    expect(readFilters(params(''))).toMatchObject({ page: 1, status: undefined });
  });
});

describe('withFilters', () => {
  it('altera o filtro e volta para a página 1', () => {
    const next = withFilters(params('status=alta&page=3'), { departmentId: '2' });

    expect(next.toString()).toBe('status=alta&departmentId=2');
  });

  it('remove o filtro quando o valor é vazio', () => {
    const next = withFilters(params('status=alta&search=ana'), { search: undefined, status: '' });

    expect(next.toString()).toBe('');
  });

  it('não altera os parâmetros recebidos', () => {
    const original = params('status=alta');
    withFilters(original, { status: 'obito' });

    expect(original.toString()).toBe('status=alta');
  });
});

describe('withPage', () => {
  it('grava a página e omite a página 1 da URL', () => {
    expect(withPage(params('status=alta'), 2).toString()).toBe('status=alta&page=2');
    expect(withPage(params('status=alta&page=2'), 1).toString()).toBe('status=alta');
  });
});

describe('hasActiveFilters', () => {
  it('considera só filtros, não a página', () => {
    expect(hasActiveFilters(params('page=2'))).toBe(false);
    expect(hasActiveFilters(params('to=2026-10-04'))).toBe(true);
  });
});
