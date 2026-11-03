import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export function createDatabaseClient(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to initialize database client');
  }

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  return { pool, db };
}

export type DatabaseInstance = ReturnType<typeof createDatabaseClient>;
