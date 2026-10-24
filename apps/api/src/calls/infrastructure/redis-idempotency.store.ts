import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { IdempotencyStore } from '../domain/ports/idempotency-store';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';

const PREFIX = 'idempotency:';

@Injectable()
export class RedisIdempotencyStore implements IdempotencyStore {
  private readonly logger = new Logger(RedisIdempotencyStore.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const reply = await this.redis.set(PREFIX + key, '1', 'EX', ttlSeconds, 'NX');
      return reply === 'OK';
    } catch (error) {
      // Redis is only a shortcut: the unique constraint in the database still prevents duplicates.
      this.logger.warn(`Redis unavailable, continuing without it: ${String(error)}`);
      return true;
    }
  }

  async release(key: string): Promise<void> {
    try {
      await this.redis.del(PREFIX + key);
    } catch (error) {
      this.logger.warn(`Could not release idempotency key: ${String(error)}`);
    }
  }
}
