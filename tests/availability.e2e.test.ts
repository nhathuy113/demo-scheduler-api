import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  InMemorySchedulingStorage,
  ServiceTypeEnum,
} from '../src/features/scheduling/index.js';

describe('E2E /api/v1/availability Acceptance Tests', () => {
  function createTestStorage() {
    const storage = new InMemorySchedulingStorage(
      [{ id: 'BAY-01' }, { id: 'BAY-02' }],
      [
        { id: 'TECH-01', skills: ['GENERAL_MAINTENANCE', 'BRAKE_SYSTEMS', 'ENGINE_ADVANCED'] },
        { id: 'TECH-02', skills: ['GENERAL_MAINTENANCE', 'HIGH_VOLTAGE_EV'] },
      ],
    );

    storage.setServiceConfig(ServiceTypeEnum.OIL_CHANGE, {
      durationMinutes: 30,
      requiredSkills: ['GENERAL_MAINTENANCE'],
    });

    storage.setServiceConfig(ServiceTypeEnum.BATTERY_EV_SERVICE, {
      durationMinutes: 90,
      requiredSkills: ['HIGH_VOLTAGE_EV'],
    });

    return storage;
  }

  it('returns 200 OK with available slots and proves half-open interval adjacency', async () => {
    const storage = createTestStorage();
    storage.addBooking({
      serviceBayId: 'BAY-01',
      technicianId: 'TECH-01',
      startTime: new Date('2026-11-03T08:00:00.000Z'),
      endTime: new Date('2026-11-03T08:30:00.000Z'),
    });

    const app = buildApp({ storage });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/availability?dealershipId=D01&serviceType=OIL_CHANGE&date=2026-11-03',
    });

    expect(response.statusCode).toBe(200);
    const slots = JSON.parse(response.payload);
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);

    // Slot 08:30 to 09:00 must appear as available
    const slot0830 = slots.find(
      (s: any) =>
        s.startTime === '2026-11-03T08:30:00.000Z' &&
        s.endTime === '2026-11-03T09:00:00.000Z',
    );
    expect(slot0830).toBeDefined();
    await app.close();
  });

  it('proves Dual-Resource Invariant: returns empty slots if no qualified tech is present', async () => {
    // Only TECH-01 (no EV skill) configured
    const storage = new InMemorySchedulingStorage(
      [{ id: 'BAY-01' }],
      [{ id: 'TECH-01', skills: ['GENERAL_MAINTENANCE'] }],
    );
    storage.setServiceConfig(ServiceTypeEnum.BATTERY_EV_SERVICE, {
      durationMinutes: 90,
      requiredSkills: ['HIGH_VOLTAGE_EV'],
    });

    const app = buildApp({ storage });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/availability?dealershipId=D01&serviceType=BATTERY_EV_SERVICE&date=2026-11-03',
    });

    expect(response.statusCode).toBe(200);
    const slots = JSON.parse(response.payload);
    expect(slots).toEqual([]);
    await app.close();
  });

  it('returns 400 Bad Request on invalid date format', async () => {
    const storage = createTestStorage();
    const app = buildApp({ storage });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/availability?dealershipId=D01&serviceType=OIL_CHANGE&date=2026-02-31',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.code).toBe('VALIDATION_ERROR');
    await app.close();
  });
});
