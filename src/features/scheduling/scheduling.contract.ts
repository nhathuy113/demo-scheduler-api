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

export interface ListAvailsResponse {
  readonly date: string;
  readonly serviceType: string;
  readonly durationMinutes: number;
  readonly timeSlots: readonly ListAvailsTimeSlot[];
}

export interface ListAvailsTimeSlot {
  readonly startTime: string;
  readonly endTime: string;
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

export interface AllocatedBooking {
  readonly serviceBayId: string;
  readonly technicianId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}

export interface BookingRequestInput {
  readonly customerId: string;
  readonly dealershipId: string;
  readonly vehicleVin: string;
  readonly serviceType: ServiceType;
  readonly requestedStartTime: string;
}

export interface ConfirmedAppointment {
  readonly appointmentId: string;
  readonly dealershipId: string;
  readonly customerId: string;
  readonly vehicleVin: string;
  readonly serviceBayId: string;
  readonly technicianId: string;
  readonly serviceType: ServiceType;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: 'CONFIRMED' | 'CANCELLED';
  readonly createdAt: string;
}

export const AvailabilityQuerySchema = z.object({
  dealershipId: z.string().min(1, 'Dealership ID is required'),
  serviceType: z.nativeEnum(ServiceTypeEnum, {
    errorMap: () => ({ message: 'Invalid service type' }),
  }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return (
        isValid(date) &&
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      );
    }, { message: 'Date must be a valid calendar date' }),
  vehicleVin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format: must be 17 uppercase characters excluding I, O, Q')
    .optional(),
});

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const BookingRequestSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  dealershipId: z.string().min(1, 'Dealership ID is required'),
  vehicleVin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format: 17 uppercase characters excluding I, O, Q'),
  serviceType: z.nativeEnum(ServiceTypeEnum),
  requestedStartTime: z.string().datetime(),
});

export type DomainError =
  | { readonly code: 'SERVICE_NOT_FOUND'; readonly message: string }
  | { readonly code: 'BAY_UNAVAILABLE'; readonly message: string }
  | { readonly code: 'TECHNICIAN_UNAVAILABLE'; readonly message: string }
  | { readonly code: 'SKILL_MISMATCH'; readonly message: string }
  | { readonly code: 'INVALID_TIME_SLOT'; readonly message: string }
  | { readonly code: 'SLOT_ALREADY_BOOKED'; readonly message: string };
