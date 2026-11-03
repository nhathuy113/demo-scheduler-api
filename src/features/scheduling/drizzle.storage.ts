import { and, eq, gt, lt } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import {
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  Technician,
} from './scheduling.contract.js';
import { DrizzleDb, ISchedulingStorage } from './scheduling.storage.js';

export class DrizzleSchedulingStorage implements ISchedulingStorage {
  constructor(private readonly db: DrizzleDb) {}

  async getBays(dealershipId: string): Promise<readonly ServiceBay[]> {
    return this.db
      .select({ id: schema.serviceBays.id })
      .from(schema.serviceBays)
      .where(and(eq(schema.serviceBays.dealershipId, dealershipId), eq(schema.serviceBays.isActive, true)));
  }

  async getTechnicians(dealershipId: string): Promise<readonly Technician[]> {
    const rows = await this.db
      .select({ id: schema.technicians.id, skillCode: schema.technicianSkills.skillCode })
      .from(schema.technicians)
      .leftJoin(schema.technicianSkills, eq(schema.technicians.id, schema.technicianSkills.technicianId))
      .where(and(eq(schema.technicians.dealershipId, dealershipId), eq(schema.technicians.isActive, true)));

    const techMap = new Map<string, string[]>();
    for (const r of rows) {
      const skills = techMap.get(r.id) ?? [];
      if (r.skillCode) skills.push(r.skillCode);
      techMap.set(r.id, skills);
    }

    return Array.from(techMap.entries()).map(([id, skills]) => ({ id, skills }));
  }

  async getBookings(dealershipId: string, rangeStart: Date, rangeEnd: Date): Promise<readonly ExistingBooking[]> {
    return this.db
      .select({
        serviceBayId: schema.appointments.serviceBayId,
        technicianId: schema.appointments.technicianId,
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.dealershipId, dealershipId),
          eq(schema.appointments.status, 'CONFIRMED'),
          lt(schema.appointments.startTime, rangeEnd),
          gt(schema.appointments.endTime, rangeStart),
        ),
      );
  }

  async getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig | null> {
    const typeRows = await this.db
      .select({ durationMinutes: schema.serviceTypes.durationMinutes })
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.code, serviceType));

    if (typeRows.length === 0) return null;

    const skillRows = await this.db
      .select({ skillCode: schema.serviceRequiredSkills.skillCode })
      .from(schema.serviceRequiredSkills)
      .where(eq(schema.serviceRequiredSkills.serviceTypeCode, serviceType));

    return {
      durationMinutes: typeRows[0].durationMinutes,
      requiredSkills: skillRows.map((r) => r.skillCode),
    };
  }
}
