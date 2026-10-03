import { createApp } from './app';
import { loadConfig } from './config';
import { createPool } from './db';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const app = createApp(pool);

const server = app.listen(config.PORT, () => {
  console.log(`API ouvindo na porta ${config.PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
