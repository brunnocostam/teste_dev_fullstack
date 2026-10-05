import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  const url = 'postgres://user:secret@localhost:5432/hospital_db';

  it('lê a URL do banco e usa a porta padrão', () => {
    expect(loadConfig({ DATABASE_URL: url })).toEqual({ DATABASE_URL: url, PORT: 3001 });
  });

  it('exige DATABASE_URL (sem credencial padrão no código)', () => {
    expect(() => loadConfig({})).toThrow();
  });

  it('recusa URL que não é de Postgres', () => {
    expect(() => loadConfig({ DATABASE_URL: 'mysql://user:secret@localhost/db' })).toThrow();
  });
});
