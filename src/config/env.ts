import { z } from 'zod';

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/scheduler';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().url().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required in production environment',
      });
    }
  })
  .transform((data) => ({
    ...data,
    DATABASE_URL: data.DATABASE_URL ?? DEFAULT_DEV_DATABASE_URL,
  }));

export type EnvConfig = z.infer<typeof EnvSchema>;

export function parseEnvConfig(
  envSource: Record<string, string | undefined> = process.env,
): EnvConfig {
  const result = EnvSchema.safeParse(envSource);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `[${issue.path.join('.')}]: ${issue.message}`)
      .join(', ');
    throw new Error(`Environment configuration validation failed: ${errorDetails}`);
  }

  return result.data;
}

export const env = parseEnvConfig();

