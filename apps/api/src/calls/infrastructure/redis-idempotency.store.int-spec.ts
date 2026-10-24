import { config } from 'dotenv';
import Redis from 'ioredis';
import { RedisIdempotencyStore } from './redis-idempotency.store';

config({ path: '../../.env', quiet: true });

describe('RedisIdempotencyStore (integration)', () => {
  const redis = new Redis(process.env.REDIS_URL as string);
  const store = new RedisIdempotencyStore(redis);
  const key = `it-${Date.now()}`;

  afterAll(async () => {
    await redis.del(`idempotency:${key}`);
    await redis.quit();
  });

  it('grants the key only to the first claimant', async () => {
    expect(await store.acquire(key, 60)).toBe(true);
    expect(await store.acquire(key, 60)).toBe(false);
  });

  it('lets a new claimant in after release', async () => {
    await store.release(key);
    expect(await store.acquire(key, 60)).toBe(true);
  });

  it('grants exactly one of many concurrent claimants', async () => {
    const raceKey = `${key}-race`;
    const results = await Promise.all(Array.from({ length: 20 }, () => store.acquire(raceKey, 60)));
    expect(results.filter(Boolean)).toHaveLength(1);
    await redis.del(`idempotency:${raceKey}`);
  });

  it('expires the key after its ttl', async () => {
    const ttlKey = `${key}-ttl`;
    expect(await store.acquire(ttlKey, 1)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(await store.acquire(ttlKey, 1)).toBe(true);
    await redis.del(`idempotency:${ttlKey}`);
  });
});
