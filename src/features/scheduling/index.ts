export { AvailabilityService } from './availability.service.js';
export { BookingService } from './booking.service.js';
export { createBookingRouter } from './booking.router.js';
export { DrizzleSchedulingStorage } from './drizzle.storage.js';
export { InMemorySchedulingStorage } from './in-memory.storage.js';
export {
  AvailabilityQuerySchema,
  BookingRequestSchema,
  ServiceTypeEnum,
  SkillCodeEnum,
} from './scheduling.contract.js';
export type {
  AllocatedBooking,
  AvailabilityQuery,
  AvailableSlotResponse,
  BookingRequestInput,
  ConfirmedAppointment,
  DomainError,
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  SkillCode,
  Technician,
  TimeSlot,
} from './scheduling.contract.js';
export { createSchedulingRouter } from './scheduling.router.js';
export {
  calculateEndTime,
  evaluateAvailableSlots,
  generateCandidateSlots,
  hasRequiredSkills,
  isTimeOverlapping,
} from './scheduling.rules.js';
export {
  evaluateBooking,
  createConfirmedAppointment,
} from './booking.rules.js';
export type { BookAppointmentRecordInput, DrizzleDb, ISchedulingStorage } from './scheduling.storage.js';
