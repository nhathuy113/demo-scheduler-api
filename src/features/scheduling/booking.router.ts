import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BookingRequestSchema, DomainError } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';
import { bookingRouteSchema } from './booking.swagger.js';

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
      { schema: bookingRouteSchema },
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
