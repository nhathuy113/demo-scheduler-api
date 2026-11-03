import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BookingRequestSchema, DomainError } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';

const DOMAIN_ERROR_HTTP_STATUS: Record<DomainError['code'], 404 | 409 | 422> = {
  SERVICE_NOT_FOUND: 404,
  BAY_UNAVAILABLE: 422,
  TECHNICIAN_UNAVAILABLE: 422,
  SKILL_MISMATCH: 422,
  INVALID_TIME_SLOT: 422,
  SLOT_ALREADY_BOOKED: 409,
};

export function createBookingRouter(service: BookingService): FastifyPluginAsync {
  return async function bookingRoutes(app: FastifyInstance): Promise<void> {
    app.post(
      '/api/v1/appointments/book',
      {
        schema: {
          description: 'Atomically book a service appointment with bay and technician allocation',
          tags: ['Appointments'],
          body: {
            type: 'object',
            required: ['customerId', 'dealershipId', 'vehicleVin', 'serviceType', 'requestedStartTime'],
            properties: {
              customerId: { type: 'string', example: 'CUST-01' },
              dealershipId: { type: 'string', example: 'D01' },
              vehicleVin: { type: 'string', pattern: '^[A-HJ-NPR-Z0-9]{17}$', example: '1HGCR2F83HA000000' },
              serviceType: {
                type: 'string',
                enum: ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'],
                example: 'OIL_CHANGE',
              },
              requestedStartTime: { type: 'string', format: 'date-time', example: '2026-11-03T09:00:00.000Z' },
            },
          },
          response: {
            201: {
              description: 'Confirmed appointment record',
              type: 'object',
              properties: {
                appointmentId: { type: 'string' },
                dealershipId: { type: 'string' },
                customerId: { type: 'string' },
                vehicleVin: { type: 'string' },
                serviceBayId: { type: 'string' },
                technicianId: { type: 'string' },
                serviceType: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
            400: {
              description: 'Validation error',
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                errors: {
                  type: 'object',
                  additionalProperties: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            404: {
              description: 'Service type not configured',
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
            409: {
              description: 'Resource conflict or slot already booked',
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
            422: {
              description: 'Unprocessable entity',
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const parseResult = BookingRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking request payload',
            errors: parseResult.error.flatten().fieldErrors,
          });
        }

        const result = await service.bookAppointment(parseResult.data);
        if (!result.success) {
          const statusCode = DOMAIN_ERROR_HTTP_STATUS[result.error.code];
          return reply.status(statusCode).send(result.error);
        }

        return reply.status(201).send(result.data);
      },
    );
  };
}
