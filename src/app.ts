import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import { AvailabilityService } from './features/scheduling/availability.service.js';
import { BookingService } from './features/scheduling/booking.service.js';
import { DrizzleSchedulingStorage } from './features/scheduling/drizzle.storage.js';
import { schedulingPlugin } from './features/scheduling/index.js';
import { checkDatabaseHealth } from './features/scheduling/health.service.js';
import { DrizzleDb, ISchedulingStorage } from './features/scheduling/scheduling.storage.js';

export interface AppOptions {
  readonly db?: DrizzleDb;
  readonly storage?: ISchedulingStorage;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: { level: 'info' },
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      requestId: request.id,
      durationMs: reply.elapsedTime,
      outcome: resolveOutcome(reply.statusCode),
    }, 'request completed');
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

  app.setErrorHandler((error: FastifyError, _request, reply) => {
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
        message: 'Invalid parameters in request payload',
        errors: fieldErrors,
      });
    }

    return reply.send(error);
  });

  const storage = options.storage ?? (options.db ? new DrizzleSchedulingStorage(options.db) : undefined);
  if (storage) {
    const availabilityService = new AvailabilityService(storage);
    const bookingService = new BookingService(storage);
    app.register(schedulingPlugin(availabilityService, bookingService));
  }

  app.get('/health', async (request, reply) => {
    const result = await checkDatabaseHealth(options.db);
    if (!result.success) {
      request.log.error({ err: result.error.cause }, 'database health check failed');
      return reply.status(503).send({ status: 'DOWN', database: 'UNAVAILABLE' });
    }

    return { status: 'UP', database: result.data };
  });

  return app;
}

function resolveOutcome(statusCode: number): string {
  if (statusCode === 201) return 'CONFIRMED';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode >= 500) return 'ERROR';
  return 'SUCCESS';
}
