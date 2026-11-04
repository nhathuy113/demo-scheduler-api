import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import { AvailabilityService } from './features/scheduling/availability.service.js';
import { BookingService } from './features/scheduling/booking.service.js';
import { DrizzleSchedulingStorage } from './features/scheduling/drizzle.storage.js';
import { InMemorySchedulingStorage } from './features/scheduling/in-memory.storage.js';
import { schedulingPlugin } from './features/scheduling/index.js';
import { checkDatabaseHealth } from './features/scheduling/health.service.js';
import { DrizzleDb, ISchedulingStorage } from './features/scheduling/scheduling.storage.js';
import { healthRouteSchema, swaggerOptions, swaggerUiOptions } from './config/swagger.config.js';

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

  app.register(swagger, swaggerOptions);

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
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

  const storage = options.storage ?? (options.db ? new DrizzleSchedulingStorage(options.db) : new InMemorySchedulingStorage());
  const availabilityService = new AvailabilityService(storage);
  const bookingService = new BookingService(storage);
  app.register(schedulingPlugin(availabilityService, bookingService));

  app.register(async (healthApp) => {
    healthApp.get(
      '/health',
      { schema: healthRouteSchema },
      async (request, reply) => {
        const result = await checkDatabaseHealth(options.db);
        if (!result.success) {
          request.log.error({ err: result.error.cause }, 'database health check failed');
          return reply.status(503).send({ status: 'DOWN', database: 'UNAVAILABLE' });
        }

        return { status: 'UP', database: result.data };
      },
    );
  });

  app.register(swaggerUi, swaggerUiOptions);

  return app;
}

function resolveOutcome(statusCode: number): string {
  if (statusCode === 201) return 'CONFIRMED';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode >= 500) return 'ERROR';
  return 'SUCCESS';
}
