import type { AdmissionListParams, AdmissionSituation } from '../api/types';

export const PAGE_SIZE = 20;

const SITUATIONS: AdmissionSituation[] = ['internado', 'alta', 'obito'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type FilterKey = 'status' | 'departmentId' | 'search' | 'from' | 'to';
export type FilterPatch = Partial<Record<FilterKey, string | undefined>>;

/** Lê os filtros da URL, ignorando valores inválidos (link editado à mão). */
export function readFilters(params: URLSearchParams): AdmissionListParams & { page: number } {
  const status = params.get('status') as AdmissionSituation | null;
  const departmentId = Number(params.get('departmentId'));
  const page = Number(params.get('page'));
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  return {
    status: status && SITUATIONS.includes(status) ? status : undefined,
    departmentId: Number.isInteger(departmentId) && departmentId > 0 ? departmentId : undefined,
    search: params.get('search')?.trim() || undefined,
    from: ISO_DATE.test(from) ? from : undefined,
    to: ISO_DATE.test(to) ? to : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Novo query string com filtros alterados; qualquer mudança de filtro volta para a página 1. */
export function withFilters(params: URLSearchParams, patch: FilterPatch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}

export function withPage(params: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(params);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

export function hasActiveFilters(params: URLSearchParams): boolean {
  return (['status', 'departmentId', 'search', 'from', 'to'] as const).some((key) => params.has(key));
}
