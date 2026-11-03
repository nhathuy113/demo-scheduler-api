import { endOfDay, parseISO, startOfDay } from 'date-fns';
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

    const targetDate = parseISO(query.date);
    const rangeStart = startOfDay(targetDate);
    const rangeEnd = endOfDay(targetDate);

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
