import type { CallDto } from '@rcm/contracts';
import type { Call } from '../domain/call';

export function toCallDto(call: Call): CallDto {
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
    receivedAt: p.receivedAt.toISOString(),
  };
}
