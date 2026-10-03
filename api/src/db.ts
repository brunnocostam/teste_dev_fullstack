import { Pool } from 'pg';

/** Contrato mínimo de acesso ao banco, para permitir dublês nos testes. */
export type Db = Pick<Pool, 'query'>;

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 10 });
}
