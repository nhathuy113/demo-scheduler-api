import { describe, expect, it, vi } from 'vitest';
import {
  ServiceTypeEnum,
  SkillCodeEnum,
} from '../src/features/scheduling/index.js';
import {
  BASELINE_REQUIRED_SKILLS,
  BASELINE_SERVICE_DURATIONS,
  seedDatabaseEnums,
} from '../src/shared/db/seed.js';

describe('seedDatabaseEnums', () => {
  it('executes expected INSERT queries for all SkillCodes and ServiceTypes', async () => {
    const executedQueries: Array<{ text: string; params?: any[] }> = [];

    const mockClient = {
      query: vi.fn().mockImplementation((text: string, params?: any[]) => {
        executedQueries.push({ text, params });
        return Promise.resolve({ rows: [] });
      }),
    } as any;

    await seedDatabaseEnums(mockClient);

    // 1. Verify skill_codes queries
    const skillQueries = executedQueries.filter((q) =>
      q.text.includes('INSERT INTO skill_codes'),
    );
    expect(skillQueries).toHaveLength(Object.values(SkillCodeEnum).length);

    // 2. Verify service_types queries
    const serviceQueries = executedQueries.filter((q) =>
      q.text.includes('INSERT INTO service_types'),
    );
    expect(serviceQueries).toHaveLength(Object.values(ServiceTypeEnum).length);
    expect(
      serviceQueries.some(
        (q) =>
          q.params?.[0] === ServiceTypeEnum.OIL_CHANGE &&
          q.params?.[2] === BASELINE_SERVICE_DURATIONS[ServiceTypeEnum.OIL_CHANGE],
      ),
    ).toBe(true);

    // 3. Verify service_required_skills queries
    const mappingQueries = executedQueries.filter((q) =>
      q.text.includes('INSERT INTO service_required_skills'),
    );
    const totalMappings = Object.values(BASELINE_REQUIRED_SKILLS).reduce(
      (acc, s) => acc + s.length,
      0,
    );
    expect(mappingQueries).toHaveLength(totalMappings);
  });
});
