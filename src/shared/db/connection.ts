import pg from 'pg';
import { env } from '../../config/env.js';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return poolInstance;
}

export async function closeDbPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT 1 as healthy');
    return result.rows[0]?.healthy === 1;
  } catch {
    return false;
  }
}
