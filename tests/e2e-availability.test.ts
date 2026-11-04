import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { InMemorySchedulingStorage } from '../src/features/scheduling/in-memory.storage.js';
import { ServiceTypeEnum } from '../src/features/scheduling/scheduling.contract.js';

const BASE = '/api/v1';

function makeStorage() {
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

describe('E2E Availability', () => {
  it('GET /availability service not configured → 404 SERVICE_NOT_FOUND', async () => {
    const storage = makeStorage();
    // TIRE_ROTATION không được set config
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/availability?dealershipId=D01&serviceType=TIRE_ROTATION&date=2026-11-03`,
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.code).toBe('SERVICE_NOT_FOUND');

    await app.close();
  });

  it('GET /availability valid → 200 with slots', async () => {
    const storage = makeStorage();
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/availability?dealershipId=D01&serviceType=OIL_CHANGE&date=2026-11-03`,
    });

    expect(res.statusCode).toBe(200);
    const slots = res.json();
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);

    await app.close();
  });

  it('GET /availability no free bay/tech → 200 empty slots', async () => {
    // Booking đầy đủ cả 2 bays và 2 techs trong khung 10:00-10:30
    const storage = makeStorage();
    storage.addBooking({
      serviceBayId: 'BAY-01',
      technicianId: 'TECH-01',
      startTime: new Date('2026-11-03T10:00:00.000Z'),
      endTime: new Date('2026-11-03T10:30:00.000Z'),
    });
    storage.addBooking({
      serviceBayId: 'BAY-02',
      technicianId: 'TECH-02',
      startTime: new Date('2026-11-03T10:00:00.000Z'),
      endTime: new Date('2026-11-03T10:30:00.000Z'),
    });
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/availability?dealershipId=D01&serviceType=OIL_CHANGE&date=2026-11-03`,
    });

    expect(res.statusCode).toBe(200);
    const slots = res.json();
    // Không có slot nào là 10:00-10:30 (cả 2 bays và 2 techs đều bị booked)
    const bookedSlot = slots.find(
      (s: any) =>
        s.startTime === '2026-11-03T10:00:00.000Z' &&
        s.endTime === '2026-11-03T10:30:00.000Z',
    );
    expect(bookedSlot).toBeUndefined();

    await app.close();
  });
});