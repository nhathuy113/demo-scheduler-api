import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema.js';
import {
  ConfirmedAppointment,
  DomainError,
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  Technician,
} from './scheduling.contract.js';
import { Result } from '../../shared/result.js';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export interface BookAppointmentRecordInput {
  readonly appointmentId?: string;
  readonly customerId: string;
  readonly dealershipId: string;
  readonly vehicleVin: string;
  readonly serviceType: ServiceType;
  readonly serviceBayId: string;
  readonly technicianId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}

export interface ISchedulingStorage {
  getBays(dealershipId: string): Promise<readonly ServiceBay[]>;
  getTechnicians(dealershipId: string): Promise<readonly Technician[]>;
  getBookings(
    dealershipId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<readonly ExistingBooking[]>;
  getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig | null>;
  saveAppointmentAtomic(input: BookAppointmentRecordInput): Promise<Result<ConfirmedAppointment, DomainError>>;
  countAppointments(dealershipId: string, startTime: Date): Promise<number>;
}
