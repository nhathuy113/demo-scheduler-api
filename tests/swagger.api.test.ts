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
    expect(spec.paths['/api/v1/availability'].get.tags).toContain('Availability');
    expect(spec.paths['/api/v1/availability'].get.responses['200']).toBeDefined();
    expect(spec.paths['/api/v1/availabilities'].get.tags).toContain('Availability');
    expect(spec.paths['/api/v1/availabilities'].get.responses['200']).toBeDefined();
    expect(spec.paths['/api/v1/appointments/book'].post.tags).toContain('Appointments');
    expect(spec.paths['/api/v1/appointments/book'].post.responses['201']).toBeDefined();
    expect(spec.paths['/api/v1/vehicles/{vehicleVin}/appointments'].get.tags).toContain('Appointments');
    expect(spec.paths['/api/v1/vehicles/{vehicleVin}/appointments'].get.responses['200']).toBeDefined();
    expect(spec.paths['/health'].get.tags).toContain('Health');
    expect(spec.paths['/health'].get.responses['200']).toBeDefined();

    await app.close();
  });

  it('health endpoint reports an unavailable database', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body).toEqual({ status: 'DOWN', database: 'UNAVAILABLE' });

    await app.close();
  });
});
