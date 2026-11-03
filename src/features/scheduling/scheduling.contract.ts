import { isMatch, isValid, parseISO } from 'date-fns';
import { z } from 'zod';

export const ServiceTypeEnum = {
  OIL_CHANGE: 'OIL_CHANGE',
  BRAKE_INSPECTION: 'BRAKE_INSPECTION',
  TIRE_ROTATION: 'TIRE_ROTATION',
  ENGINE_DIAGNOSTIC: 'ENGINE_DIAGNOSTIC',
  BATTERY_EV_SERVICE: 'BATTERY_EV_SERVICE',
} as const;

export type ServiceType = (typeof ServiceTypeEnum)[keyof typeof ServiceTypeEnum];

export const SkillCodeEnum = {
  GENERAL_MAINTENANCE: 'GENERAL_MAINTENANCE',
  BRAKE_SYSTEMS: 'BRAKE_SYSTEMS',
  ENGINE_ADVANCED: 'ENGINE_ADVANCED',
  HIGH_VOLTAGE_EV: 'HIGH_VOLTAGE_EV',
} as const;

export type SkillCode = (typeof SkillCodeEnum)[keyof typeof SkillCodeEnum];

export interface TimeSlot {
  readonly startTime: Date;
  readonly endTime: Date;
}

export interface ServiceBay {
  readonly id: string;
}

export interface Technician {
  readonly id: string;
  readonly skills: readonly string[];
}

export interface ExistingBooking {
  readonly serviceBayId: string;
  readonly technicianId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}

export type BookedSlot = ExistingBooking;

export interface ServiceConfig {
  readonly durationMinutes: number;
  readonly requiredSkills: readonly string[];
}

export interface AvailableSlotResponse {
  readonly startTime: string;
  readonly endTime: string;
  readonly availableBayId: string;
  readonly availableTechnicianId: string;
}

export const AvailabilityQuerySchema = z.object({
  dealershipId: z.string().min(1, 'Dealership ID is required'),
  serviceType: z.nativeEnum(ServiceTypeEnum, {
    errorMap: () => ({ message: 'Invalid service type' }),
  }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
    .refine((val) => isMatch(val, 'yyyy-MM-dd') && isValid(parseISO(`${val}T00:00:00.000Z`)), {
      message: 'Date must be valid calendar date',
    }),
  vehicleVin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format: must be 17 uppercase characters excluding I, O, Q')
    .optional(),
});

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export type DomainError =
  | { readonly code: 'SERVICE_NOT_FOUND'; readonly message: string }
  | { readonly code: 'BAY_UNAVAILABLE'; readonly message: string }
  | { readonly code: 'TECHNICIAN_UNAVAILABLE'; readonly message: string };
