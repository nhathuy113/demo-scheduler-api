import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Fastify Swagger & Observability Integration', () => {
  it('serves interactive Swagger UI at /docs', async () => {
    const app = buildApp();
    await app.ready();

    const redirectRes = await app.inject({ method: 'GET', url: '/docs' });
    expect([200, 302]).toContain(redirectRes.statusCode);

    const response = await app.inject({ method: 'GET', url: '/docs/' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');

    await app.close();
  });

  it('exposes valid OpenAPI 3.0 specification at /docs/json', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    const spec = response.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe('Unified Service Scheduler API');

    await app.close();
  });

  it('health endpoint returns UP status', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('UP');
    expect(body.service).toBe('unified-service-scheduler');

    await app.close();
  });
});
