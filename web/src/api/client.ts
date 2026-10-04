import type {
  AdmissionDetail,
  AdmissionListParams,
  AdmissionPage,
  DepartmentDetail,
  DepartmentOption,
  Overview,
} from './types';

/** Erro vindo da API no formato { error: { code, message } }, ou falha de rede (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | undefined;

async function get<T>(path: string, params: Record<string, QueryValue> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const url = `/api${path}${query.size > 0 ? `?${query}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? 'Ocorreu um erro ao carregar os dados.',
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  overview: () => get<Overview>('/overview'),
  departments: () => get<DepartmentOption[]>('/departments'),
  department: (id: number) => get<DepartmentDetail>(`/departments/${id}`),
  admissions: (params: AdmissionListParams) => get<AdmissionPage>('/admissions', { ...params }),
  admission: (id: number) => get<AdmissionDetail>(`/admissions/${id}`),
};
