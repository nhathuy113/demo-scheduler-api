import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema.js';
import {
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  Technician,
} from './scheduling.contract.js';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export interface ISchedulingStorage {
  getBays(dealershipId: string): Promise<readonly ServiceBay[]>;
  getTechnicians(dealershipId: string): Promise<readonly Technician[]>;
  getBookings(
    dealershipId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<readonly ExistingBooking[]>;
  getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig | null>;
}
