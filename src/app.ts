import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyInstance } from 'fastify';
import {
  AvailabilityService,
  createSchedulingRouter,
  DrizzleDb,
  DrizzleSchedulingStorage,
  ISchedulingStorage,
} from './features/scheduling/index.js';

export interface AppOptions {
  readonly db?: DrizzleDb;
  readonly storage?: ISchedulingStorage;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Keyloop Unified Service Scheduler API',
        description: 'Production OpenAPI specification with Drizzle ORM and PostgreSQL',
        version: '1.0.0',
      },
      servers: [{ url: 'http://127.0.0.1:3000', description: 'Local Server' }],
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  const storage = options.storage ?? (options.db ? new DrizzleSchedulingStorage(options.db) : undefined);
  if (storage) {
    const service = new AvailabilityService(storage);
    app.register(createSchedulingRouter(service));
  }

  app.get('/health', async () => ({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'keyloop-unified-service-scheduler',
  }));

  return app;
}
