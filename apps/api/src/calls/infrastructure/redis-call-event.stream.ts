import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { CallEvent } from '@rcm/contracts';
import type Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import type { CallEventStream } from '../application/call-event-stream';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { CALL_EVENTS_CHANNEL } from './call-events.channel';

@Injectable()
export class RedisCallEventStream implements CallEventStream, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCallEventStream.name);
  private readonly subject = new Subject<CallEvent>();
  private subscriber?: Redis;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  events(): Observable<CallEvent> {
    return this.subject.asObservable();
  }

  async onModuleInit(): Promise<void> {
    // A connection in subscriber mode cannot run other commands, so it needs its own.
    const subscriber = this.redis.duplicate({ maxRetriesPerRequest: null });
    this.subscriber = subscriber;
    subscriber.on('error', (error) => this.logger.warn(`Redis subscriber: ${String(error)}`));
    subscriber.on('message', (_channel, payload) => this.dispatch(payload));
    await subscriber.subscribe(CALL_EVENTS_CHANNEL);
  }

  onModuleDestroy(): void {
    this.subject.complete();
    this.subscriber?.disconnect();
  }

  private dispatch(payload: string): void {
    try {
      this.subject.next(JSON.parse(payload) as CallEvent);
    } catch (error) {
      this.logger.warn(`Ignoring malformed event: ${String(error)}`);
    }
  }
}
