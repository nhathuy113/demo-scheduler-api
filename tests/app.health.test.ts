import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Fastify Application HTTP Endpoints', () => {
  const app = buildApp();

  it('responds with JSON status and metadata on GET /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.service).toBe('unified-service-scheduler');
    expect(body.timestamp).toBeDefined();
    expect(body.status).toBe('UP');
  });
});
