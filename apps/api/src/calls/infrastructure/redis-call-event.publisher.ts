import { Inject, Injectable, Logger } from '@nestjs/common';
import { CALL_EVENTS, type CallEvent } from '@rcm/contracts';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { toCallDto } from '../call.mapper';
import type { Call } from '../domain/call';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';
import { CALL_EVENTS_CHANNEL } from './call-events.channel';

@Injectable()
export class RedisCallEventPublisher implements CallEventPublisher {
  private readonly logger = new Logger(RedisCallEventPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  callCreated(call: Call): Promise<void> {
    return this.publish({ type: CALL_EVENTS.CREATED, data: toCallDto(call) });
  }

  spamUpdated(call: Call): Promise<void> {
    return this.publish({ type: CALL_EVENTS.SPAM_UPDATED, data: toCallDto(call) });
  }

  private async publish(event: CallEvent): Promise<void> {
    try {
      await this.redis.publish(CALL_EVENTS_CHANNEL, JSON.stringify(event));
    } catch (error) {
      // Best-effort by contract: the call is already stored, so a lost event must not fail the request.
      this.logger.warn(`Could not publish ${event.type}: ${String(error)}`);
    }
  }
}
