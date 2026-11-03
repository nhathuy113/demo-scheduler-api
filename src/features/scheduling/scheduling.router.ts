import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQuerySchema } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';
import { createBookingRouter } from './booking.router.js';

export function createSchedulingRouter(
  service: AvailabilityService,
  bookingService?: BookingService,
): FastifyPluginAsync {
  return async function schedulingRoutes(app: FastifyInstance): Promise<void> {
    app.get(
      '/api/v1/availability',
      {
        schema: {
          description: 'Query real-time slot availability based on dealership, date, and service requirements',
          tags: ['Availability'],
          querystring: {
            type: 'object',
            required: ['dealershipId', 'serviceType', 'date'],
            properties: {
              dealershipId: { type: 'string', example: 'D01' },
              serviceType: {
                type: 'string',
                enum: ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'],
                example: 'OIL_CHANGE',
              },
              date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-11-03' },
              vehicleVin: { type: 'string', pattern: '^[A-HJ-NPR-Z0-9]{17}$', example: '1HGCR2F83HA000000' },
            },
          },
          response: {
            200: {
              description: 'List of available time slots with matched bay and qualified technician',
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                  availableBayId: { type: 'string' },
                  availableTechnicianId: { type: 'string' },
                },
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
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
            404: {
              description: 'Service type not found or inactive in catalog',
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
        const parseResult = AvailabilityQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid availability query parameters',
            errors: parseResult.error.flatten().fieldErrors,
          });
        }

        const result = await service.getAvailableSlots(parseResult.data);
        if (!result.success) {
          return reply.status(404).send(result.error);
        }

        return reply.status(200).send(result.data);
      },
    );

    if (bookingService) {
      await app.register(createBookingRouter(bookingService));
    }
  };
}
