import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQuerySchema, ServiceType, ServiceTypeEnum } from './scheduling.contract.js';
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

        const validServices = Object.values(ServiceTypeEnum) as string[];
        if (serviceType && !validServices.includes(serviceType)) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid service type',
            errors: { serviceType: ['Invalid service type'] },
          });
        }

        const targetServiceType = (serviceType as ServiceType) || ServiceTypeEnum.OIL_CHANGE;
        const targetDate = date || new Date().toISOString().slice(0, 10);

        const parsed = AvailabilityQuerySchema.safeParse({
          dealershipId,
          serviceType: targetServiceType,
          date: targetDate,
        });
        if (!parsed.success) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid availability query parameters',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const result = await service.getAvailableSlots(parsed.data);

        if (!result.success) {
          return reply.status(404).send(result.error);
        }

        const availableSlots = result.data.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));

        return reply.status(200).send({
          dealershipId,
          serviceType: targetServiceType,
          date: targetDate,
          includeBooked: Boolean(includeBooked),
          availableSlots,
          message: `Found ${availableSlots.length} available slots for ${dealershipId}`,
        });
      },
    );

    if (bookingService) {
      await app.register(createBookingRouter(bookingService));
    }
  };
}
