import { Injectable } from '@nestjs/common';
import type { Call as CallRow } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Call } from '../domain/call';
import { PhoneNumber } from '../domain/phone-number';
import type { CallRepository, InsertResult } from '../domain/ports/call.repository';

@Injectable()
export class PrismaCallRepository implements CallRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertIfAbsent(call: Call): Promise<InsertResult> {
    // ON CONFLICT DO NOTHING: the unique constraint on call_id decides, atomically.
    const { count } = await this.prisma.call.createMany({
      data: [toRow(call)],
      skipDuplicates: true,
    });

    const stored = await this.findByCallId(call.callId);
    if (!stored) throw new Error(`Call ${call.callId} not found after insert`);

    return { call: stored, created: count === 1 };
  }

  async findByCallId(callId: string): Promise<Call | null> {
    const row = await this.prisma.call.findUnique({ where: { callId } });
    return row ? toDomain(row) : null;
  }

  countByPhoneNumberBefore(phoneNumber: PhoneNumber, before: Date): Promise<number> {
    return this.prisma.call.count({
      where: { phoneNumber: phoneNumber.value, receivedAt: { lt: before } },
    });
  }
}

function toRow(call: Call): CallRow {
  const p = call.toProps();
  return {
    id: p.id,
    callId: p.callId,
    phoneNumber: p.phoneNumber.value,
    agent: p.agent,
    durationSeconds: p.durationSeconds,
    recordingUrl: p.recordingUrl,
    isSpam: p.isSpam,
    isRepeatCaller: call.isRepeatCaller,
    previousCallsCount: p.previousCallsCount,
    receivedAt: p.receivedAt,
  };
}

function toDomain(row: CallRow): Call {
  return Call.restore({
    id: row.id,
    callId: row.callId,
    phoneNumber: PhoneNumber.fromE164(row.phoneNumber),
    agent: row.agent,
    durationSeconds: row.durationSeconds,
    recordingUrl: row.recordingUrl,
    isSpam: row.isSpam,
    previousCallsCount: row.previousCallsCount,
    receivedAt: row.receivedAt,
  });
}
