import {
  BookingRequestInput,
  ConfirmedAppointment,
  DomainError,
} from './scheduling.contract.js';
import { ISchedulingStorage } from './scheduling.storage.js';
import { evaluateBooking } from './booking.rules.js';
import { Result } from '../../shared/result.js';

export class BookingService {
  constructor(private readonly storage: ISchedulingStorage) {}

  async bookAppointment(
    request: BookingRequestInput,
  ): Promise<Result<ConfirmedAppointment, DomainError>> {
    const serviceConfig = await this.storage.getServiceConfig(request.serviceType);
    if (!serviceConfig) {
      return Result.err({
        code: 'SERVICE_NOT_FOUND',
        message: `Service type ${request.serviceType} is not configured`,
      });
    }

    const startTime = new Date(request.requestedStartTime);
    const endTime = new Date(startTime.getTime() + serviceConfig.durationMinutes * 60 * 1000);

    const [bays, technicians, existingBookings] = await Promise.all([
      this.storage.getBays(request.dealershipId),
      this.storage.getTechnicians(request.dealershipId),
      this.storage.getBookings(
        request.dealershipId,
        startTime,
        endTime,
      ),
    ]);

    const allocationResult = evaluateBooking({
      serviceType: request.serviceType,
      startTime,
      durationMinutes: serviceConfig.durationMinutes,
      requiredSkills: serviceConfig.requiredSkills,
      bays,
      technicians,
      existingBookings,
    });

    if (!allocationResult.success) {
      return allocationResult;
    }

    return this.storage.saveAppointmentAtomic({
      customerId: request.customerId,
      dealershipId: request.dealershipId,
      vehicleVin: request.vehicleVin,
      serviceType: request.serviceType,
      serviceBayId: allocationResult.data.serviceBayId,
      technicianId: allocationResult.data.technicianId,
      startTime: allocationResult.data.startTime,
      endTime: allocationResult.data.endTime,
    });
  }
}
