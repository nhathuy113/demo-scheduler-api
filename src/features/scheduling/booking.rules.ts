import {
  AllocatedBooking,
  BookingRequestInput,
  ConfirmedAppointment,
  DomainError,
  ExistingBooking,
  ServiceBay,
  ServiceType,
  Technician,
  TimeSlot,
} from './scheduling.contract.js';
import { calculateEndTime, hasRequiredSkills, isTimeOverlapping } from './scheduling.rules.js';
import { Result } from '../../shared/result.js';

export interface BookingEvaluationInput {
  readonly serviceType: ServiceType;
  readonly startTime: Date;
  readonly durationMinutes: number;
  readonly requiredSkills: readonly string[];
  readonly bays: readonly ServiceBay[];
  readonly technicians: readonly Technician[];
  readonly existingBookings: readonly ExistingBooking[];
}

export function evaluateBooking(
  input: BookingEvaluationInput,
): Result<AllocatedBooking, DomainError> {
  const endTime = calculateEndTime(input.startTime, input.durationMinutes);
  const targetSlot: TimeSlot = { startTime: input.startTime, endTime };

  if (input.bays.length === 0) {
    return Result.err({ code: 'BAY_UNAVAILABLE', message: 'No service bay configured' });
  }

  const availableBays = input.bays.filter(
    (bay) => !input.existingBookings.some((b) => b.serviceBayId === bay.id && isTimeOverlapping(targetSlot, b)),
  );
  if (availableBays.length === 0) {
    return Result.err({ code: 'SLOT_ALREADY_BOOKED', message: 'The requested slot has already been reserved by another client' });
  }

  const qualifiedTechs = input.technicians.filter((t) => hasRequiredSkills(t.skills, input.requiredSkills));
  if (qualifiedTechs.length === 0) {
    return Result.err({ code: 'TECHNICIAN_UNAVAILABLE', message: 'No qualified technician available for the requested service' });
  }

  const availableTechs = qualifiedTechs.filter(
    (tech) => !input.existingBookings.some((b) => b.technicianId === tech.id && isTimeOverlapping(targetSlot, b)),
  );
  if (availableTechs.length === 0) {
    return Result.err({ code: 'SLOT_ALREADY_BOOKED', message: 'The requested slot has already been reserved by another client' });
  }

  return Result.ok({
    serviceBayId: availableBays[0].id,
    technicianId: availableTechs[0].id,
    startTime: input.startTime,
    endTime,
  });
}

export function createConfirmedAppointment(
  request: BookingRequestInput,
  allocation: AllocatedBooking,
  appointmentId: string = `APPT-${Date.now()}`,
): ConfirmedAppointment {
  return {
    appointmentId,
    dealershipId: request.dealershipId,
    customerId: request.customerId,
    vehicleVin: request.vehicleVin,
    serviceBayId: allocation.serviceBayId,
    technicianId: allocation.technicianId,
    serviceType: request.serviceType,
    startTime: allocation.startTime.toISOString(),
    endTime: allocation.endTime.toISOString(),
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };
}
