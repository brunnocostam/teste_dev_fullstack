import { Pool } from 'pg';

/** Contrato mínimo de acesso ao banco, para permitir dublês nos testes. */
export type Db = Pick<Pool, 'query'>;

export function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString, max: 10 });
  // Conexão ociosa que cai (ex.: Postgres reiniciou) emite 'error' no pool; sem
  // este handler o processo inteiro morre. O pool descarta o cliente e reconecta.
  pool.on('error', (err) => console.error('Erro em conexão ociosa do banco:', err.message));
  return pool;
}
