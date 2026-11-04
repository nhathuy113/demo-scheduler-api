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

describe('E2E Booking', () => {
  it('POST /appointments/book → 201 ConfirmedAppointment', async () => {
    const storage = makeStorage();
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: {
        customerId: 'CUST-01',
        dealershipId: 'D01',
        vehicleVin: '1HGCR2F83HA000000',
        serviceType: 'OIL_CHANGE',
        requestedStartTime: '2026-11-03T10:00:00.000Z',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('CONFIRMED');
    expect(body.appointmentId).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.startTime).toBe('2026-11-03T10:00:00.000Z');
    expect(body.endTime).toBe('2026-11-03T10:30:00.000Z');
    expect(body.serviceBayId).toBeDefined();
    expect(body.technicianId).toBeDefined();

    await app.close();
  });

  it('POST /appointments/book duplicate slot → 409 SLOT_ALREADY_BOOKED', async () => {
    const storage = new InMemorySchedulingStorage(
      [{ id: 'BAY-01' }],
      [{ id: 'TECH-01', skills: ['GENERAL_MAINTENANCE'] }],
    );
    storage.setServiceConfig(ServiceTypeEnum.OIL_CHANGE, {
      durationMinutes: 30,
      requiredSkills: ['GENERAL_MAINTENANCE'],
    });
    const app = buildApp({ storage });
    await app.ready();

    const bookingPayload = {
      customerId: 'CUST-02',
      dealershipId: 'D01',
      vehicleVin: '1HGCR2F83HA000001',
      serviceType: 'OIL_CHANGE',
      requestedStartTime: '2026-11-03T10:00:00.000Z',
    };

    // Lần 1: thành công
    const first = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: bookingPayload,
    });
    expect(first.statusCode).toBe(201);

    // Lần 2: trùng slot (chỉ có 1 bay + 1 tech) → 409
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: bookingPayload,
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('SLOT_ALREADY_BOOKED');

    await app.close();
  });

  it('POST /appointments/book service not configured → 404 SERVICE_NOT_FOUND', async () => {
    const storage = makeStorage();
    // TIRE_ROTATION không được set config → getServiceConfig trả về null
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: {
        customerId: 'CUST-03',
        dealershipId: 'D01',
        vehicleVin: '1HGCR2F83HA000002',
        serviceType: 'TIRE_ROTATION',
        requestedStartTime: '2026-11-03T10:00:00.000Z',
      },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.code).toBe('SERVICE_NOT_FOUND');

    await app.close();
  });

  it('POST /appointments/book technician lacks required skill → 422 TECHNICIAN_UNAVAILABLE', async () => {
    const storage = new InMemorySchedulingStorage(
      [{ id: 'BAY-01' }],
      [{ id: 'TECH-01', skills: ['GENERAL_MAINTENANCE'] }], // Không có HIGH_VOLTAGE_EV
    );
    storage.setServiceConfig(ServiceTypeEnum.BATTERY_EV_SERVICE, {
      durationMinutes: 90,
      requiredSkills: ['HIGH_VOLTAGE_EV'],
    });
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: {
        customerId: 'CUST-04',
        dealershipId: 'D01',
        vehicleVin: '1HGCR2F83HA000003',
        serviceType: 'BATTERY_EV_SERVICE',
        requestedStartTime: '2026-11-03T10:00:00.000Z',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe('TECHNICIAN_UNAVAILABLE');

    await app.close();
  });

  it('POST /appointments/book invalid body → 400 VALIDATION_ERROR', async () => {
    const storage = makeStorage();
    const app = buildApp({ storage });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/appointments/book`,
      payload: {
        customerId: '',
        dealershipId: '',
        vehicleVin: 'short',
        serviceType: 'INVALID',
        requestedStartTime: 'not-a-date',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});