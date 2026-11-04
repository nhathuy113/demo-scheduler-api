import { sql } from 'drizzle-orm';
import { Result } from '../../shared/result.js';
import type { DrizzleDb } from './scheduling.storage.js';

export interface DatabaseUnavailableError {
  readonly code: 'DATABASE_UNAVAILABLE';
  readonly cause?: unknown;
}

export async function checkDatabaseHealth(
  db?: DrizzleDb,
): Promise<Result<'HEALTHY', DatabaseUnavailableError>> {
  if (!db) return Result.err({ code: 'DATABASE_UNAVAILABLE' });

  try {
    await db.execute(sql`SELECT 1`);
    return Result.ok('HEALTHY');
  } catch (cause) {
    return Result.err({ code: 'DATABASE_UNAVAILABLE', cause });
  }
}
