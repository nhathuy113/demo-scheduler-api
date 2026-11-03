import Fastify, { FastifyInstance } from 'fastify';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.get('/health', async () => {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'keyloop-unified-service-scheduler',
    };
  });

  return app;
}
