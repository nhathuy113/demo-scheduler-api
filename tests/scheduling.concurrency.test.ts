import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { InMemorySchedulingStorage } from '../src/features/scheduling/index.js';

describe('Anti-Double-Booking Concurrency Guard (Task 3)', () => {
  it('allows exactly 1 booking and rejects 9 concurrent requests with 409 Conflict', async () => {
    const storage = new InMemorySchedulingStorage(
      [{ id: 'BAY-01' }],
      [{ id: 'TECH-01', skills: ['GENERAL_MAINTENANCE'] }]
    );
    storage.setServiceConfig('OIL_CHANGE', {
      durationMinutes: 30,
      requiredSkills: ['GENERAL_MAINTENANCE'],
    });

    const app = buildApp({ storage });
    await app.ready();

    const targetStartTime = '2026-11-03T10:00:00.000Z';
    const totalRequests = 10;

    const concurrentRequests = Array.from({ length: totalRequests }, (_, index) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/appointments/book',
        payload: {
          customerId: `CUST-${index + 1}`,
          dealershipId: 'D01',
          vehicleVin: `1HGCR2F83HA00000${index}`,
          serviceType: 'OIL_CHANGE',
          requestedStartTime: targetStartTime,
        },
      })
    );

    const responses = await Promise.all(concurrentRequests);

    const successfulBookings = responses.filter((res) => res.statusCode === 201);
    const conflictedBookings = responses.filter((res) => res.statusCode === 409);

    expect(successfulBookings.length).toBe(1);
    expect(conflictedBookings.length).toBe(9);

    const successBody = JSON.parse(successfulBookings[0].body);
    expect(successBody.status).toBe('CONFIRMED');
    expect(successBody.serviceBayId).toBe('BAY-01');
    expect(successBody.technicianId).toBe('TECH-01');

    for (const conflictRes of conflictedBookings) {
      const conflictBody = JSON.parse(conflictRes.body);
      expect(conflictBody.code).toBe('SLOT_ALREADY_BOOKED');
      expect(conflictBody.message).toContain('already been reserved');
    }

    const recordedCount = await storage.countAppointments('D01', new Date(targetStartTime));
    expect(recordedCount).toBe(1);

    await app.close();
  });
});
