import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';

describe('E2E Health', () => {
  it('GET /health → 200 UP HEALTHY when database is reachable', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
    } as any;
    const app = buildApp({ db: mockDb });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('UP');
    expect(body.database).toBe('HEALTHY');

    await app.close();
  });
});