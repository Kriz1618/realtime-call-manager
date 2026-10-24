import { Module } from '@nestjs/common';
import { CALL_REPOSITORY } from './domain/ports/call.repository';
import { PrismaCallRepository } from './infrastructure/prisma-call.repository';
import { IDEMPOTENCY_STORE } from './domain/ports/idempotency-store';
import { RedisIdempotencyStore } from './infrastructure/redis-idempotency.store';

@Module({
  providers: [
  { provide: CALL_REPOSITORY, useClass: PrismaCallRepository },
  { provide: IDEMPOTENCY_STORE, useClass: RedisIdempotencyStore },
],
  exports: [CALL_REPOSITORY],
})
export class CallsModule {}
