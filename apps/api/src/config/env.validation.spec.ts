import { validateEnv } from './env.validation';

const validEnv = {
  DATABASE_URL: 'postgresql://rcm:rcm_password@localhost:5432/rcm?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  WEBHOOK_SECRET: 'secret',
  WEB_ORIGIN: 'http://localhost:5173',
};

describe('validateEnv', () => {
  it('accepts a valid environment and defaults the port to undefined', () => {
    expect(validateEnv(validEnv).API_PORT).toBeUndefined();
  });

  it('converts API_PORT to a number', () => {
    expect(validateEnv({ ...validEnv, API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('fails when a required variable is missing', () => {
    const { WEBHOOK_SECRET: _omitted, ...incomplete } = validEnv;
    expect(() => validateEnv(incomplete)).toThrow(/WEBHOOK_SECRET/);
  });

  it('fails when DATABASE_URL is not a postgres url', () => {
    expect(() => validateEnv({ ...validEnv, DATABASE_URL: 'mysql://x' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
