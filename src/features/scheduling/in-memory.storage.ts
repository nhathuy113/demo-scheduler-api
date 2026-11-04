import {
  ConfirmedAppointment,
  DomainError,
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  Technician,
} from './scheduling.contract.js';
import { BookAppointmentRecordInput, ISchedulingStorage } from './scheduling.storage.js';
import { isTimeOverlapping } from './scheduling.rules.js';
import { Result } from '../../shared/result.js';

export class InMemorySchedulingStorage implements ISchedulingStorage {
  private appointments: ExistingBooking[] = [];
  private confirmedAppointments: ConfirmedAppointment[] = [];
  private serviceConfigs = new Map<ServiceType, ServiceConfig>();
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private readonly bays: ServiceBay[] = [{ id: 'BAY-01' }, { id: 'BAY-02' }],
    private readonly technicians: Technician[] = [
      { id: 'TECH-01', skills: ['GENERAL_MAINTENANCE', 'BRAKE_SYSTEMS', 'ENGINE_ADVANCED'] },
      { id: 'TECH-02', skills: ['GENERAL_MAINTENANCE', 'HIGH_VOLTAGE_EV'] },
    ],
  ) {}

  setServiceConfig(serviceType: ServiceType, config: ServiceConfig): void {
    this.serviceConfigs.set(serviceType, config);
  }

  addBooking(booking: ExistingBooking): void {
    this.appointments.push(booking);
  }

  async getBays(): Promise<readonly ServiceBay[]> {
    return this.bays;
  }

  async getTechnicians(): Promise<readonly Technician[]> {
    return this.technicians;
  }

  async getBookings(
    _dealershipId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<readonly ExistingBooking[]> {
    return this.appointments.filter(
      (a) => a.startTime < rangeEnd && a.endTime > rangeStart,
    );
  }

  async getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig | null> {
    return this.serviceConfigs.get(serviceType) ?? null;
  }

  async saveAppointmentAtomic(input: BookAppointmentRecordInput): Promise<Result<ConfirmedAppointment, DomainError>> {
    return new Promise((resolve) => {
      this.lock = this.lock.then(async () => {
        const slot = { startTime: input.startTime, endTime: input.endTime };
        const hasConflict = this.appointments.some(
          (a) =>
            (a.serviceBayId === input.serviceBayId || a.technicianId === input.technicianId) &&
            isTimeOverlapping(slot, a),
        );

        if (hasConflict) {
          resolve(
            Result.err({
              code: 'SLOT_ALREADY_BOOKED',
              message: 'The requested slot has already been reserved by another client',
            }),
          );
          return;
        }

        const id = input.appointmentId ?? `APPT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmed: ConfirmedAppointment = {
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
          createdAt: new Date().toISOString(),
        };

        this.appointments.push({
          serviceBayId: input.serviceBayId,
          technicianId: input.technicianId,
          startTime: input.startTime,
          endTime: input.endTime,
        });
        this.confirmedAppointments.push(confirmed);
        resolve(Result.ok(confirmed));
      });
    });
  }

  async countAppointments(_dealershipId: string, startTime: Date): Promise<number> {
    return this.appointments.filter(
      (a) => a.startTime.getTime() === startTime.getTime(),
    ).length;
  }

  async getAppointmentsByVin(vehicleVin: string): Promise<readonly ConfirmedAppointment[]> {
    return this.confirmedAppointments.filter((a) => a.vehicleVin === vehicleVin);
  }
}
