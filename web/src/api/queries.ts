import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type { AdmissionListParams } from './types';

/** Visão "quase em tempo real" das telas de acompanhamento. */
const LIVE_REFRESH_MS = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Erros 4xx (ex.: 404) não melhoram tentando de novo.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: api.overview, refetchInterval: LIVE_REFRESH_MS });
}

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: api.departments });
}

export function useDepartment(id: number) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => api.department(id),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useAdmissions(params: AdmissionListParams) {
  return useQuery({
    queryKey: ['admissions', params],
    queryFn: () => api.admissions(params),
    // Mantém a página anterior visível enquanto a próxima carrega (sem "piscar").
    placeholderData: keepPreviousData,
  });
}

export function useAdmission(id: number) {
  return useQuery({ queryKey: ['admissions', 'detail', id], queryFn: () => api.admission(id) });
}
