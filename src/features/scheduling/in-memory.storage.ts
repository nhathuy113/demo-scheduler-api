import {
  ExistingBooking,
  ServiceBay,
  ServiceConfig,
  ServiceType,
  Technician,
} from './scheduling.contract.js';
import { ISchedulingStorage } from './scheduling.storage.js';

export class InMemorySchedulingStorage implements ISchedulingStorage {
  private appointments: ExistingBooking[] = [];
  private serviceConfigs = new Map<ServiceType, ServiceConfig>();

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
}
