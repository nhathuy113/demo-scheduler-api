import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/scheduler'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function parseEnvConfig(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Environment configuration validation failed: ${errorDetails}`);
  }
  return result.data;
}

export const env = parseEnvConfig();
