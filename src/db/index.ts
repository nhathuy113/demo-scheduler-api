import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export function createDatabaseClient(connectionString?: string) {
  const pool = new pg.Pool({
    connectionString:
      connectionString ||
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@127.0.0.1:5432/scheduler',
  });

  const db = drizzle(pool, { schema });
  return { pool, db };
}

export type DatabaseInstance = ReturnType<typeof createDatabaseClient>;
