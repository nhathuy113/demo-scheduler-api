import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { InMemorySchedulingStorage } from '../src/features/scheduling/in-memory.storage.js';
import { ServiceTypeEnum } from '../src/features/scheduling/scheduling.contract.js';

describe('Vehicle Appointments API (GET /api/v1/vehicles/:vehicleVin/appointments)', () => {
  const targetVin = '1HGCR2F83HA000000';

  it('returns 200 with confirmed appointments matching the target vehicle VIN', async () => {
    const storage = new InMemorySchedulingStorage();
    storage.setServiceConfig(ServiceTypeEnum.OIL_CHANGE, {
      durationMinutes: 30,
      requiredSkills: ['GENERAL_MAINTENANCE'],
    });

    const app = buildApp({ storage });
    await app.ready();

    // Seed 1 appointment via book API for target VIN
    const bookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/appointments/book',
      payload: {
        customerId: 'CUST-01',
        dealershipId: 'D01',
        vehicleVin: targetVin,
        serviceType: 'OIL_CHANGE',
        requestedStartTime: '2026-11-04T09:00:00.000Z',
      },
    });
    expect(bookRes.statusCode).toBe(201);

    // Seed 1 appointment for a different vehicle VIN
    await app.inject({
      method: 'POST',
      url: '/api/v1/appointments/book',
      payload: {
        customerId: 'CUST-02',
        dealershipId: 'D01',
        vehicleVin: '1HGCR2F83HA999999',
        serviceType: 'OIL_CHANGE',
        requestedStartTime: '2026-11-04T10:00:00.000Z',
      },
    });

    // Query appointments for target VIN
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/vehicles/${targetVin}/appointments`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].vehicleVin).toBe(targetVin);
    expect(body[0].customerId).toBe('CUST-01');
    expect(body[0].status).toBe('CONFIRMED');

    await app.close();
  });

  it('returns 200 with empty array when vehicle has no appointments', async () => {
    const storage = new InMemorySchedulingStorage();
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/vehicles/${targetVin}/appointments`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('supports legacy vehicle IDs such as VEH-00123', async () => {
    const storage = new InMemorySchedulingStorage();
    const app = buildApp({ storage });
    await app.ready();

    const legacyVin = 'VEH-00123';
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/vehicles/${legacyVin}/appointments`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('supports arbitrary opaque vehicle identifiers without rigid format blocking', async () => {
    const storage = new InMemorySchedulingStorage();
    const app = buildApp({ storage });
    await app.ready();

    const opaqueId = 'STOCK-992-SPECIAL';
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/vehicles/${opaqueId}/appointments`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });
});
