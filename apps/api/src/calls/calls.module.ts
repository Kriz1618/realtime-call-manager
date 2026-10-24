import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { RegisterIncomingCall } from './application/register-incoming-call';
import { CALL_EVENT_PUBLISHER, CallEventPublisher } from './domain/ports/call-event-publisher';
import { CALL_REPOSITORY, CallRepository } from './domain/ports/call.repository';
import { IDEMPOTENCY_STORE, IdempotencyStore } from './domain/ports/idempotency-store';
import { LoggingCallEventPublisher } from './infrastructure/logging-call-event.publisher';
import { PrismaCallRepository } from './infrastructure/prisma-call.repository';
import { RedisIdempotencyStore } from './infrastructure/redis-idempotency.store';
import { DomainExceptionFilter } from './presentation/domain-exception.filter';
import { WebhooksController } from './presentation/webhooks.controller';
import { CallsController } from './presentation/calls.controller';
import { ListCalls } from './application/list-calls';
import { SetCallSpamStatus } from './application/set-call-spam-status';

@Module({
  controllers: [WebhooksController, CallsController],
  providers: [
    { provide: CALL_REPOSITORY, useClass: PrismaCallRepository },
    { provide: IDEMPOTENCY_STORE, useClass: RedisIdempotencyStore },
    { provide: CALL_EVENT_PUBLISHER, useClass: LoggingCallEventPublisher },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    {
      provide: RegisterIncomingCall,
      inject: [CALL_REPOSITORY, IDEMPOTENCY_STORE, CALL_EVENT_PUBLISHER],
      useFactory: (
        calls: CallRepository,
        idempotency: IdempotencyStore,
        events: CallEventPublisher,
      ) => new RegisterIncomingCall(calls, idempotency, events),
    },
    {
      provide: ListCalls,
      inject: [CALL_REPOSITORY],
      useFactory: (calls: CallRepository) => new ListCalls(calls),
    },
    {
      provide: SetCallSpamStatus,
      inject: [CALL_REPOSITORY, CALL_EVENT_PUBLISHER],
      useFactory: (calls: CallRepository, events: CallEventPublisher) => new SetCallSpamStatus(calls, events),
    },
  ],
})
export class CallsModule {}
