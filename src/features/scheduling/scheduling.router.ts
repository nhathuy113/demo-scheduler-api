import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQuerySchema } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';
import { createBookingRouter } from './booking.router.js';
import { availabilitiesRouteSchema, availabilityRouteSchema } from './scheduling.swagger.js';

export function createSchedulingRouter(
  service: AvailabilityService,
  bookingService?: BookingService,
): FastifyPluginAsync {
  return async function schedulingRoutes(app: FastifyInstance): Promise<void> {
    app.get(
      '/api/v1/availability',
      { schema: availabilityRouteSchema },
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

    app.get(
      '/api/v1/availabilities',
      { schema: availabilitiesRouteSchema },
      async (request, reply) => {
        const { dealershipId, serviceType, date, includeBooked } = request.query as {
          dealershipId: string;
          serviceType?: string;
          date?: string;
          includeBooked?: boolean;
        };

        if (!dealershipId) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Dealership ID is required',
            errors: { dealershipId: ['Dealership ID is required'] },
          });
        }

        return reply.status(200).send({
          dealershipId,
          serviceType,
          date,
          includeBooked,
          availableSlots: [],
          message: 'Getting availability for ' + dealershipId,
        });
      },
    );

    if (bookingService) {
      await app.register(createBookingRouter(bookingService));
    }
  };
}
