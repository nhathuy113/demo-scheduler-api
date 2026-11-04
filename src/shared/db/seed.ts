import type { Pool, PoolClient } from 'pg';
import {
  ServiceType,
  ServiceTypeEnum,
  SkillCode,
  SkillCodeEnum,
} from '../../features/scheduling/scheduling.contract.js';

export const BASELINE_SERVICE_DURATIONS: Record<ServiceType, number> = {
  [ServiceTypeEnum.OIL_CHANGE]: 30,
  [ServiceTypeEnum.TIRE_ROTATION]: 30,
  [ServiceTypeEnum.BRAKE_INSPECTION]: 45,
  [ServiceTypeEnum.ENGINE_DIAGNOSTIC]: 60,
  [ServiceTypeEnum.BATTERY_EV_SERVICE]: 90,
};

export const BASELINE_REQUIRED_SKILLS: Record<ServiceType, readonly SkillCode[]> = {
  [ServiceTypeEnum.OIL_CHANGE]: [SkillCodeEnum.GENERAL_MAINTENANCE],
  [ServiceTypeEnum.TIRE_ROTATION]: [SkillCodeEnum.GENERAL_MAINTENANCE],
  [ServiceTypeEnum.BRAKE_INSPECTION]: [SkillCodeEnum.BRAKE_SYSTEMS],
  [ServiceTypeEnum.ENGINE_DIAGNOSTIC]: [SkillCodeEnum.ENGINE_ADVANCED],
  [ServiceTypeEnum.BATTERY_EV_SERVICE]: [SkillCodeEnum.HIGH_VOLTAGE_EV],
};

export async function seedDatabaseEnums(client: Pool | PoolClient): Promise<void> {
  // 1. Seed Skill Codes from TypeScript Enum
  for (const skillCode of Object.values(SkillCodeEnum)) {
    await client.query(
      `INSERT INTO skill_codes (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
      [skillCode, skillCode.replace(/_/g, ' ')],
    );
  }

  // 2. Seed Service Types and Durations into database
  for (const serviceType of Object.values(ServiceTypeEnum)) {
    const duration = BASELINE_SERVICE_DURATIONS[serviceType];
    await client.query(
      `INSERT INTO service_types (code, name, duration_minutes) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
      [serviceType, serviceType.replace(/_/g, ' '), duration],
    );
  }

  // 3. Seed Required Skills Mapping into database
  for (const [serviceType, requiredSkills] of Object.entries(BASELINE_REQUIRED_SKILLS)) {
    for (const skillCode of requiredSkills) {
      await client.query(
        `INSERT INTO service_required_skills (service_type_code, skill_code) VALUES ($1, $2) ON CONFLICT (service_type_code, skill_code) DO NOTHING`,
        [serviceType, skillCode],
      );
    }
  }
}
