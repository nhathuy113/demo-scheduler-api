import { parseISO } from 'date-fns';
import { Result } from '../../shared/result.js';
import {
  AvailabilityQuery,
  AvailableSlotResponse,
  DomainError,
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
}
