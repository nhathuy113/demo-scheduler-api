import {
  addMinutes,
  areIntervalsOverlapping,
  isAfter,
  parseISO,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns';
import {
  AvailableSlotResponse,
  ExistingBooking,
  ServiceBay,
  Technician,
  TimeSlot,
} from './scheduling.contract.js';

export function calculateEndTime(startTime: Date, durationMinutes: number): Date {
  return addMinutes(startTime, durationMinutes);
}

export function isTimeOverlapping(slotA: TimeSlot, slotB: TimeSlot): boolean {
  return areIntervalsOverlapping(
    { start: slotA.startTime, end: slotA.endTime },
    { start: slotB.startTime, end: slotB.endTime },
    { inclusive: false },
  );
}

export function hasRequiredSkills(
  technicianSkills: readonly string[],
  requiredSkills: readonly string[],
): boolean {
  if (requiredSkills.length === 0) return true;
  return requiredSkills.every((skill) => technicianSkills.includes(skill));
}

export function generateCandidateSlots(
  dateStr: string,
  durationMinutes: number,
  stepMinutes: number = 30,
  startHour: number = 8,
  endHour: number = 18,
): TimeSlot[] {
  const base = startOfDay(parseISO(dateStr));
  const dayStart = setHours(setMinutes(setSeconds(setMilliseconds(base, 0), 0), 0), startHour);
  const dayEnd = setHours(setMinutes(setSeconds(setMilliseconds(base, 0), 0), 0), endHour);

  const slots: TimeSlot[] = [];
  let currentStart = dayStart;

  while (true) {
    const currentEnd = addMinutes(currentStart, durationMinutes);
    if (isAfter(currentEnd, dayEnd)) break;

    slots.push({ startTime: currentStart, endTime: currentEnd });
    currentStart = addMinutes(currentStart, stepMinutes);
  }

  return slots;
}

export interface EvaluateSlotsInput {
  readonly candidateSlots: readonly TimeSlot[];
  readonly bays: readonly ServiceBay[];
  readonly technicians: readonly Technician[];
  readonly existingBookings: readonly ExistingBooking[];
  readonly requiredSkills: readonly string[];
}

export function evaluateAvailableSlots(input: EvaluateSlotsInput): AvailableSlotResponse[] {
  const qualifiedTechs = input.technicians.filter((t) =>
    hasRequiredSkills(t.skills, input.requiredSkills),
  );

  if (qualifiedTechs.length === 0 || input.bays.length === 0) {
    return [];
  }

  const results: AvailableSlotResponse[] = [];

  for (const slot of input.candidateSlots) {
    const freeBay = input.bays.find(
      (bay) => !input.existingBookings.some((b) => b.serviceBayId === bay.id && isTimeOverlapping(slot, b)),
    );
    if (!freeBay) continue;

    const freeTech = qualifiedTechs.find(
      (tech) => !input.existingBookings.some((b) => b.technicianId === tech.id && isTimeOverlapping(slot, b)),
    );
    if (!freeTech) continue;

    results.push({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      availableBayId: freeBay.id,
      availableTechnicianId: freeTech.id,
    });
  }

  return results;
}
