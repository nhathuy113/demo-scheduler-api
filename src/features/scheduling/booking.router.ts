import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BookingRequestSchema, DomainError } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';
import { bookingRouteSchema, getVehicleAppointmentsSchema } from './booking.swagger.js';

const VehicleVinParamsSchema = z.object({
  vehicleVin: z
    .string()
    .min(1, 'Vehicle identifier is required')
    .max(64, 'Vehicle identifier cannot exceed 64 characters'),
});

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
          const statusCode = DOMAIN_ERROR_HTTP_STATUS[result.error.code] ?? 500;
          return reply.status(statusCode).send(result.error);
        }

        return reply.status(201).send(result.data);
      },
    );

    app.get(
      '/api/v1/vehicles/:vehicleVin/appointments',
      { schema: getVehicleAppointmentsSchema },
      async (request, reply) => {
        const parseResult = VehicleVinParamsSchema.safeParse(request.params);
        if (!parseResult.success) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid vehicle identifier format',
            errors: parseResult.error.flatten().fieldErrors,
          });
        }

        const result = await service.getAppointmentsByVehicleVin(parseResult.data.vehicleVin);
        if (!result.success) {
          return reply.status(500).send(result.error);
        }

        return reply.status(200).send(result.data);
      },
    );
  };
}
