import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyError, FastifyInstance } from 'fastify';
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
        title: 'Unified Service Scheduler API',
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

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.validation) {
        const field =
          issue.instancePath.replace(/^\//, '') ||
          (issue.params?.missingProperty as string) ||
          'query';
        fieldErrors[field] = fieldErrors[field] || [];
        fieldErrors[field].push(issue.message ?? 'Invalid value');
      }

      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters for availability search',
        errors: fieldErrors,
      });
    }

    return reply.send(error);
  });

  const storage = options.storage ?? (options.db ? new DrizzleSchedulingStorage(options.db) : undefined);
  if (storage) {
    const service = new AvailabilityService(storage);
    app.register(createSchedulingRouter(service));
  }

  app.get('/health', async () => ({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'unified-service-scheduler',
  }));

  return app;
}
