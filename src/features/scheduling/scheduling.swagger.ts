export const availabilityRouteSchema = {
  summary: 'Query real-time available service appointment slots',
  description:
    'Evaluates workshop bay capacity and qualified technician schedules using half-open time interval math [start, end) to return bookable appointment slots.',
  operationId: 'getAvailability',
  tags: ['Availability'],
  querystring: {
    type: 'object',
    required: ['dealershipId', 'serviceType', 'date'],
    properties: {
      dealershipId: {
        type: 'string',
        description: 'Dealership facility identifier',
        example: 'D01',
      },
      serviceType: {
        type: 'string',
        enum: ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'],
        description: 'Target maintenance service type',
        example: 'OIL_CHANGE',
      },
      date: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Calendar date for slot search (YYYY-MM-DD)',
        example: '2026-11-04',
      },
      vehicleVin: {
        type: 'string',
        pattern: '^[A-HJ-NPR-Z0-9]{17}$',
        description: '17-character ISO 3779 Vehicle Identification Number (optional)',
        example: '1HGCR2F83HA000000',
      },
    },
  },
  response: {
    200: {
      description: 'List of available time slots matching bay capacity and technician skills',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          startTime: { type: 'string', format: 'date-time', description: 'Slot start timestamp' },
          endTime: { type: 'string', format: 'date-time', description: 'Slot end timestamp' },
          availableBayId: { type: 'string', description: 'Available service bay ID' },
          availableTechnicianId: { type: 'string', description: 'Qualified technician ID' },
        },
      },
    },
    400: {
      description: 'Query parameter validation failure',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Invalid availability query parameters' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    404: {
      description: 'Requested service type is not configured in database catalog',
      type: 'object',
      properties: {
        code: { type: 'string', example: 'SERVICE_NOT_FOUND' },
        message: { type: 'string', example: 'Service type not found in catalog' },
      },
    },
  },
} as const;

export const availabilitiesRouteSchema = {
  summary: 'List available candidate time slots by dealership',
  description: 'Returns candidate time slots and availability status overview for a given dealership.',
  operationId: 'listAvailabilities',
  tags: ['Availability'],
  querystring: {
    type: 'object',
    required: ['dealershipId'],
    properties: {
      dealershipId: { type: 'string', description: 'Dealership ID', example: 'D01' },
      serviceType: {
        type: 'string',
        enum: ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'],
        description: 'Optional service type filter',
      },
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date (YYYY-MM-DD)' },
      includeBooked: { type: 'boolean', description: 'Include already-booked slots', default: false },
    },
  },
  response: {
    200: {
      description: 'Dealership availability overview and candidate slots',
      type: 'object',
      properties: {
        dealershipId: { type: 'string' },
        serviceType: { type: 'string' },
        date: { type: 'string' },
        includeBooked: { type: 'boolean' },
        availableSlots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
    400: {
      description: 'Validation error',
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    404: {
      description: 'Dealership not found',
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;
