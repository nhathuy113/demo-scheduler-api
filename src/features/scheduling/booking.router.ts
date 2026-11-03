import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BookingRequestSchema } from './scheduling.contract.js';
import { BookingService } from './booking.service.js';

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
              vehicleVin: { type: 'string', example: '1HGCR2F83HA000000' },
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
                errors: { type: 'object' },
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
          const statusCode = result.error.code === 'SKILL_MISMATCH' ? 422 : 409;
          return reply.status(statusCode).send(result.error);
        }

        return reply.status(201).send(result.data);
      },
    );
  };
}
