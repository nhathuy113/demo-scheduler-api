import { SwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { env } from './env.js';

export const swaggerOptions: SwaggerOptions = {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'Unified Service Scheduler API',
      description:
        'Production OpenAPI 3.0 specification for workshop service scheduling with dual-resource allocation (Service Bay + Qualified Technician) and anti-double-booking concurrency protection.',
      version: '1.0.0',
      contact: {
        name: 'Workshop Engineering Team',
        email: 'scheduler-dev@keyloop.internal',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://127.0.0.1:${env.PORT}`,
        description: 'Local Server',
      },
    ],
    tags: [
      {
        name: 'Availability',
        description: 'Real-time capacity querying and slot matching (Bay + Qualified Technician)',
      },
      {
        name: 'Appointments',
        description: 'Atomic appointment reservations and conflict resolution',
      },
      {
        name: 'Health',
        description: 'Service uptime and PostgreSQL database connectivity probe',
      },
    ],
  },
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

export const healthRouteSchema = {
  summary: 'Database connectivity and service health probe',
  description: 'Executes a database ping to verify PostgreSQL connection pool health and readiness.',
  operationId: 'getHealth',
  tags: ['Health'],
  response: {
    200: {
      description: 'Database is healthy and reachable',
      type: 'object',
      properties: {
        status: { type: 'string', example: 'UP' },
        database: { type: 'string', example: 'HEALTHY' },
      },
    },
    503: {
      description: 'Database connection failed or service is unavailable',
      type: 'object',
      properties: {
        status: { type: 'string', example: 'DOWN' },
        database: { type: 'string', example: 'UNAVAILABLE' },
      },
    },
  },
} as const;
