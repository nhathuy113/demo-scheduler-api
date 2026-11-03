import { describe, expect, it } from 'vitest';
import { parseEnvConfig } from '../src/config/env.js';

describe('Environment Configuration Parser', () => {
  it('loads valid defaults when empty object is passed', () => {
    const config = parseEnvConfig({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('coerces and parses explicit custom environment variables', () => {
    const config = parseEnvConfig({
      PORT: '8080',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      DATABASE_URL: 'postgresql://usr:pwd@localhost:5432/testdb',
      LOG_LEVEL: 'warn',
    });
    expect(config.PORT).toBe(8080);
    expect(config.NODE_ENV).toBe('production');
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.LOG_LEVEL).toBe('warn');
  });

  it('throws descriptive error when PORT is non-numeric or negative', () => {
    expect(() => parseEnvConfig({ PORT: '-10' })).toThrowError(
      /Environment configuration validation failed/,
    );
  });
});
