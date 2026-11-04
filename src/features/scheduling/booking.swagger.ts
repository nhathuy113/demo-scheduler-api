const appointmentProperties = {
  appointmentId: { type: 'string', description: 'Unique booking ID' },
  dealershipId: { type: 'string', description: 'Dealership ID' },
  customerId: { type: 'string', description: 'Customer ID' },
  vehicleVin: { type: 'string', description: 'Vehicle VIN' },
  serviceBayId: { type: 'string', description: 'Allocated service bay ID' },
  technicianId: { type: 'string', description: 'Allocated technician ID' },
  serviceType: { type: 'string', description: 'Service type code' },
  startTime: { type: 'string', format: 'date-time', description: 'Scheduled start time' },
  endTime: { type: 'string', format: 'date-time', description: 'Scheduled end time' },
  status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'], description: 'Booking status' },
  createdAt: { type: 'string', format: 'date-time', description: 'Record creation timestamp' },
} as const;

export const bookingRouteSchema = {
  summary: 'Atomically book a service appointment',
  description:
    'Atomically reserves an active service bay and matches an available qualified technician using PostgreSQL row-level locks (SELECT ... FOR UPDATE) to eliminate double-booking risks.',
  operationId: 'bookAppointment',
  tags: ['Appointments'],
  body: {
    type: 'object',
    required: ['customerId', 'dealershipId', 'vehicleVin', 'serviceType', 'requestedStartTime'],
    properties: {
      customerId: { type: 'string', description: 'Customer identifier', example: 'CUST-01' },
      dealershipId: { type: 'string', description: 'Dealership facility identifier', example: 'D01' },
      vehicleVin: {
        type: 'string',
        minLength: 1,
        maxLength: 64,
        description: 'Vehicle identifier (17-char ISO VIN or legacy DMS opaque identifier)',
        example: '1HGCR2F83HA000000',
      },
      serviceType: {
        type: 'string',
        enum: ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'],
        description: 'Type of maintenance required',
        example: 'OIL_CHANGE',
      },
      requestedStartTime: {
        type: 'string',
        format: 'date-time',
        description: 'Requested appointment start timestamp in ISO-8601 format',
        example: '2026-11-04T09:00:00.000Z',
      },
    },
  },
  response: {
    201: {
      description: 'Appointment confirmed and dual resources allocated',
      type: 'object',
      properties: appointmentProperties,
    },
    400: {
      description: 'Request payload validation failure',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Invalid booking request payload' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    404: {
      description: 'Requested service type is not configured in catalog',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'SERVICE_NOT_FOUND' },
        message: { type: 'string', example: 'Service type not configured' },
      },
    },
    409: {
      description: 'Double-booking conflict — slot or resource already reserved',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'SLOT_ALREADY_BOOKED' },
        message: { type: 'string', example: 'Requested time slot has already been reserved' },
      },
    },
    422: {
      description: 'Resource unavailable or technician lacks required skill certifications',
      type: 'object',
      properties: {
        code: {
          type: 'string',
          enum: ['BAY_UNAVAILABLE', 'TECHNICIAN_UNAVAILABLE', 'SKILL_MISMATCH', 'INVALID_TIME_SLOT'],
          example: 'TECHNICIAN_UNAVAILABLE',
        },
        message: { type: 'string', example: 'No qualified technician available for this time slot' },
      },
    },
  },
} as const;

export const getVehicleAppointmentsSchema = {
  summary: 'Retrieve all confirmed appointments for a vehicle',
  description:
    'Returns chronological list of confirmed workshop appointments associated with the specified vehicle identifier (VIN or legacy vehicle ID).',
  operationId: 'getAppointmentsByVehicleVin',
  tags: ['Appointments'],
  params: {
    type: 'object',
    required: ['vehicleVin'],
    properties: {
      vehicleVin: {
        type: 'string',
        description: 'Vehicle identifier (inclusive, opaque identifier from legacy DMS or ISO VIN)',
        example: '1HGCR2F83HA000000',
      },
    },
  },
  response: {
    200: {
      description: 'Chronological list of confirmed appointments for the vehicle (empty array if none found)',
      type: 'array',
      items: {
        type: 'object',
        properties: appointmentProperties,
      },
    },
    400: {
      description: 'Invalid Vehicle Identifier format',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Invalid vehicle identifier format' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'INTERNAL_ERROR' },
        message: { type: 'string', example: 'Internal server error' },
      },
    },
  },
} as const;
