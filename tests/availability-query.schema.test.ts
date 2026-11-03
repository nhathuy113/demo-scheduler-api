import { describe, expect, it } from 'vitest';
import {
  AvailabilityQuerySchema,
  ServiceTypeEnum,
} from '../src/features/scheduling/index.js';

describe('AvailabilityQuerySchema Contract Verification', () => {
  it('passes validation with valid required parameters', () => {
    const validPayload = {
      dealershipId: 'D01',
      date: '2026-11-03',
      serviceType: ServiceTypeEnum.OIL_CHANGE,
    };
    const result = AvailabilityQuerySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('passes validation with valid 17-character ISO 3779 VIN', () => {
    const validWithVin = {
      dealershipId: 'D01',
      date: '2026-11-03',
      serviceType: ServiceTypeEnum.BATTERY_EV_SERVICE,
      vehicleVin: '1HGCR2F83HA000000',
    };
    const result = AvailabilityQuerySchema.safeParse(validWithVin);
    expect(result.success).toBe(true);
  });

  it('rejects unpadded date like 2026-1-3', () => {
    const unpaddedDate = {
      dealershipId: 'D01',
      date: '2026-1-3',
      serviceType: ServiceTypeEnum.OIL_CHANGE,
    };
    const result = AvailabilityQuerySchema.safeParse(unpaddedDate);
    expect(result.success).toBe(false);
  });

  it('rejects invalid VIN with forbidden characters (I, O, Q)', () => {
    const invalidVin = {
      dealershipId: 'D01',
      date: '2026-11-03',
      serviceType: ServiceTypeEnum.OIL_CHANGE,
      vehicleVin: '1HGCR2F83HI000000',
    };
    const result = AvailabilityQuerySchema.safeParse(invalidVin);
    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar date like 2026-02-31', () => {
    const invalidDate = {
      dealershipId: 'D01',
      date: '2026-02-31',
      serviceType: ServiceTypeEnum.OIL_CHANGE,
    };
    const result = AvailabilityQuerySchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it('rejects invalid service type', () => {
    const invalidService = {
      dealershipId: 'D01',
      date: '2026-11-03',
      serviceType: 'TURBO_INSTALLATION',
    };
    const result = AvailabilityQuerySchema.safeParse(invalidService);
    expect(result.success).toBe(false);
  });

  it('rejects missing dealership ID', () => {
    const missingDealership = {
      date: '2026-11-03',
      serviceType: ServiceTypeEnum.OIL_CHANGE,
    };
    const result = AvailabilityQuerySchema.safeParse(missingDealership);
    expect(result.success).toBe(false);
  });
});
