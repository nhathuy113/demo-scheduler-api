import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Fastify Application HTTP Endpoints', () => {
  const app = buildApp();

  it('reports an unavailable database on GET /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({ status: 'DOWN', database: 'UNAVAILABLE' });
  });
});
