import { parseISO } from 'date-fns';
import { Result } from '../../shared/result.js';
import {
  AvailabilityQuery,
  AvailableSlotResponse,
  DomainError,
  ListAvailsResponse,
  ListAvailsTimeSlot,
  ServiceTypeEnum,
  TimeSlot,
} from './scheduling.contract.js';
import {
  evaluateAvailableSlots,
  generateCandidateSlots,
} from './scheduling.rules.js';
import { ISchedulingStorage } from './scheduling.storage.js';

export class AvailabilityService {
  constructor(private readonly storage: ISchedulingStorage) {}

  async getAvailableSlots(
    query: AvailabilityQuery,
  ): Promise<Result<readonly AvailableSlotResponse[], DomainError>> {
    const serviceConfig = await this.storage.getServiceConfig(query.serviceType);
    if (!serviceConfig) {
      return Result.err({
        code: 'SERVICE_NOT_FOUND',
        message: `Service type ${query.serviceType} is not configured in database catalog`,
      });
    }

    const rangeStart = parseISO(`${query.date}T00:00:00.000Z`);
    const rangeEnd = parseISO(`${query.date}T23:59:59.999Z`);

    const [bays, technicians, existingBookings] = await Promise.all([
      this.storage.getBays(query.dealershipId),
      this.storage.getTechnicians(query.dealershipId),
      this.storage.getBookings(query.dealershipId, rangeStart, rangeEnd),
    ]);

    const candidateSlots = generateCandidateSlots(
      query.date,
      serviceConfig.durationMinutes,
    );

    const slots = evaluateAvailableSlots({
      candidateSlots,
      bays,
      technicians,
      existingBookings,
      requiredSkills: serviceConfig.requiredSkills,
    });

    return Result.ok(slots);
  }

  /**
   * Returns a simple list of candidate time slots for Oil Change service
   * (without bay/technician matching). Used for the "list avails" endpoint.
   */
  async listAvails(
    dealershipId: string,
  ): Promise<Result<readonly TimeSlot[], DomainError>> {
    const serviceConfig = await this.storage.getServiceConfig(ServiceTypeEnum.OIL_CHANGE);
    if (!serviceConfig) {
      return Result.err({
        code: 'SERVICE_NOT_FOUND',
        message: 'Oil Change service type is not configured in database catalog',
      });
    }

    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayStr = todayStart.toISOString().slice(0, 10);

    const candidateSlots = generateCandidateSlots(
      todayStr,
      serviceConfig.durationMinutes,
    );

    return Result.ok(candidateSlots);
  }

  /**
   * Returns a full ListAvailsResponse for Oil Change service including vehicle info.
   * All business logic lives here; router only delegates and serializes.
   */
  async listAvailsWithVehicle(
    params: { dealershipId: string; vehicleVin?: string; vehicleType?: string },
  ): Promise<Result<ListAvailsResponse, DomainError>> {
    const serviceConfig = await this.storage.getServiceConfig(ServiceTypeEnum.OIL_CHANGE);
    if (!serviceConfig) {
      return Result.err({
        code: 'SERVICE_NOT_FOUND',
        message: 'Oil Change service type is not configured in database catalog',
      });
    }

    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayStr = todayStart.toISOString().slice(0, 10);

    const candidateSlots = generateCandidateSlots(todayStr, serviceConfig.durationMinutes);

    const vehicleInfo = params.vehicleVin
      ? { vehicleVin: params.vehicleVin, vehicleType: 'PRIVATE' }
      : params.vehicleType
      ? { vehicleType: params.vehicleType }
      : null;

    const response: ListAvailsResponse = {
      date: todayStr,
      serviceType: 'OIL_CHANGE',
      durationMinutes: serviceConfig.durationMinutes,
      timeSlots: candidateSlots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      })),
    };

    return Result.ok(response);
  }
}
