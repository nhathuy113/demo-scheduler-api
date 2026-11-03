import { buildApp } from './app.js';
import { env } from './config/env.js';
import { createDatabaseClient } from './db/index.js';

const { db, pool } = createDatabaseClient(env.DATABASE_URL);
const app = buildApp({ db });

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`OpenAPI Swagger documentation available at http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Draining connections and shutting down...`);
  try {
    await app.close();
    await pool.end();
    console.log('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
