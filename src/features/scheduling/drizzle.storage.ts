import { and, eq, gt, lt, or } from 'drizzle-orm';
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
import { BookAppointmentRecordInput, DrizzleDb, ISchedulingStorage } from './scheduling.storage.js';
import { Result } from '../../shared/result.js';

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

  async saveAppointmentAtomic(input: BookAppointmentRecordInput): Promise<Result<ConfirmedAppointment, DomainError>> {
    return this.db.transaction(async (tx) => {
      const conflicts = await tx
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.dealershipId, input.dealershipId),
            eq(schema.appointments.status, 'CONFIRMED'),
            or(eq(schema.appointments.serviceBayId, input.serviceBayId), eq(schema.appointments.technicianId, input.technicianId)),
            lt(schema.appointments.startTime, input.endTime),
            gt(schema.appointments.endTime, input.startTime),
          ),
        )
        .for('update');

      if (conflicts.length > 0) {
        return Result.err({
          code: 'SLOT_ALREADY_BOOKED',
          message: 'The requested slot has already been reserved by another client',
        });
      }

      const id = input.appointmentId ?? `APPT-${Date.now()}`;
      const [inserted] = await tx
        .insert(schema.appointments)
        .values({
          id,
          dealershipId: input.dealershipId,
          customerId: input.customerId,
          vehicleVin: input.vehicleVin,
          serviceBayId: input.serviceBayId,
          technicianId: input.technicianId,
          serviceType: input.serviceType,
          startTime: input.startTime,
          endTime: input.endTime,
          status: 'CONFIRMED',
        })
        .returning({ createdAt: schema.appointments.createdAt });

      return Result.ok({
        appointmentId: id,
        dealershipId: input.dealershipId,
        customerId: input.customerId,
        vehicleVin: input.vehicleVin,
        serviceBayId: input.serviceBayId,
        technicianId: input.technicianId,
        serviceType: input.serviceType,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        status: 'CONFIRMED',
        createdAt: inserted.createdAt.toISOString(),
      });
    });
  }

  async countAppointments(dealershipId: string, startTime: Date): Promise<number> {
    const rows = await this.db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(and(eq(schema.appointments.dealershipId, dealershipId), eq(schema.appointments.startTime, startTime), eq(schema.appointments.status, 'CONFIRMED')));
    return rows.length;
  }
}
