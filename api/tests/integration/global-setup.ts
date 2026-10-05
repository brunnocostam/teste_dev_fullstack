import { prepareTestDatabase } from './support/database';

// Roda uma vez antes da suíte: banco de teste limpo, só com o schema oficial.
export default async function globalSetup(): Promise<void> {
  await prepareTestDatabase();
}
