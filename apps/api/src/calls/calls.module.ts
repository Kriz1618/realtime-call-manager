import { Module } from '@nestjs/common';
import { CALL_REPOSITORY } from './domain/ports/call.repository';
import { PrismaCallRepository } from './infrastructure/prisma-call.repository';

@Module({
  providers: [{ provide: CALL_REPOSITORY, useClass: PrismaCallRepository }],
  exports: [CALL_REPOSITORY],
})
export class CallsModule {}
