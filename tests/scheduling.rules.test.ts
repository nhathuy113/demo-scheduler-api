import { describe, expect, it } from 'vitest';
import {
  calculateEndTime,
  evaluateAvailableSlots,
  generateCandidateSlots,
  hasRequiredSkills,
  isTimeOverlapping,
} from '../src/features/scheduling/scheduling.rules.js';
import {
  ExistingBooking,
  ServiceBay,
  Technician,
} from '../src/features/scheduling/scheduling.contract.js';

describe('Scheduling Pure Rules', () => {
  it('calculates correct end time using date-fns addMinutes', () => {
    const start = new Date('2026-11-02T08:00:00Z');
    const end = calculateEndTime(start, 30);
    expect(end.toISOString()).toBe('2026-11-02T08:30:00.000Z');
  });

  describe('isTimeOverlapping (Half-Open Interval)', () => {
    it('detects overlap when slot B is inside slot A', () => {
      const slotA = { startTime: new Date('2026-11-02T08:00:00Z'), endTime: new Date('2026-11-02T09:00:00Z') };
      const slotB = { startTime: new Date('2026-11-02T08:15:00Z'), endTime: new Date('2026-11-02T08:45:00Z') };
      expect(isTimeOverlapping(slotA, slotB)).toBe(true);
    });

    it('returns false when slot B is strictly adjacent after slot A', () => {
      const slotA = { startTime: new Date('2026-11-02T08:00:00Z'), endTime: new Date('2026-11-02T09:00:00Z') };
      const slotB = { startTime: new Date('2026-11-02T09:00:00Z'), endTime: new Date('2026-11-02T10:00:00Z') };
      expect(isTimeOverlapping(slotA, slotB)).toBe(false);
    });
  });

  describe('hasRequiredSkills', () => {
    it('returns true when technician has all required skills', () => {
      expect(hasRequiredSkills(['GENERAL_MAINTENANCE', 'BRAKE_SYSTEMS'], ['BRAKE_SYSTEMS'])).toBe(true);
    });

    it('returns false when technician lacks a required skill', () => {
      expect(hasRequiredSkills(['GENERAL_MAINTENANCE'], ['HIGH_VOLTAGE_EV'])).toBe(false);
    });
  });

  describe('generateCandidateSlots', () => {
    it('generates candidate windows between 08:00 and 18:00 UTC', () => {
      const slots = generateCandidateSlots('2026-11-03', 30, 30, 8, 18);
      expect(slots.length).toBe(20);
      expect(slots[0].startTime.getUTCHours()).toBe(8);
      expect(slots[0].startTime.getUTCMinutes()).toBe(0);
      expect(slots[slots.length - 1].endTime.getUTCHours()).toBe(18);
      expect(slots[slots.length - 1].endTime.getUTCMinutes()).toBe(0);
    });

    it('defensively returns empty array for invalid inputs without looping indefinitely', () => {
      expect(generateCandidateSlots('invalid-date', 30)).toEqual([]);
      expect(generateCandidateSlots('2026-11-03', 0)).toEqual([]);
      expect(generateCandidateSlots('2026-11-03', 30, -5)).toEqual([]);
      expect(generateCandidateSlots('2026-11-03', 30, 30, 18, 8)).toEqual([]);
    });
  });

  describe('evaluateAvailableSlots', () => {
    const bays: ServiceBay[] = [{ id: 'BAY-01' }, { id: 'BAY-02' }];
    const technicians: Technician[] = [
      { id: 'TECH-01', skills: ['GENERAL_MAINTENANCE'] },
      { id: 'TECH-02', skills: ['HIGH_VOLTAGE_EV'] },
    ];

    it('returns slots when resources are free', () => {
      const candidateSlots = generateCandidateSlots('2026-11-03', 30, 30, 8, 9);
      const results = evaluateAvailableSlots({
        candidateSlots,
        bays,
        technicians,
        existingBookings: [],
        requiredSkills: ['GENERAL_MAINTENANCE'],
      });

      expect(results.length).toBe(2);
      expect(results[0].availableBayId).toBe('BAY-01');
      expect(results[0].availableTechnicianId).toBe('TECH-01');
    });

    it('skips occupied slot and proves half-open adjacency', () => {
      const candidateSlots = generateCandidateSlots('2026-11-03', 30, 30, 8, 9);
      const existing: ExistingBooking[] = [
        {
          serviceBayId: 'BAY-01',
          technicianId: 'TECH-01',
          startTime: candidateSlots[0].startTime,
          endTime: candidateSlots[0].endTime,
        },
      ];

      const results = evaluateAvailableSlots({
        candidateSlots,
        bays: [{ id: 'BAY-01' }],
        technicians: [technicians[0]],
        existingBookings: existing,
        requiredSkills: ['GENERAL_MAINTENANCE'],
      });

      expect(results.length).toBe(1);
      expect(results[0].startTime).toBe(candidateSlots[1].startTime.toISOString());
    });
  });
});
