import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisIdempotencyStore } from './redis-idempotency.store';

describe('RedisIdempotencyStore when Redis fails', () => {
  const broken = {
    set: jest.fn().mockRejectedValue(new Error('connection refused')),
    del: jest.fn().mockRejectedValue(new Error('connection refused')),
  } as unknown as Redis;

  let warnSpy: jest.SpiedFunction<typeof Logger.prototype.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('lets the request through so the database decides', async () => {
    const store = new RedisIdempotencyStore(broken);
    await expect(store.acquire('call:x', 60)).resolves.toBe(true);
  });

  it('does not throw when releasing fails', async () => {
    const store = new RedisIdempotencyStore(broken);
    await expect(store.release('call:x')).resolves.toBeUndefined();
  });
});
