import { Call, NewCallInput } from '../domain/call';
import { PhoneNumber } from '../domain/phone-number';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';
import type { CallRepository } from '../domain/ports/call.repository';
import type { IdempotencyStore } from '../domain/ports/idempotency-store';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export interface RegisterIncomingCallResult {
  call: Call;
  duplicated: boolean;
}

export class RegisterIncomingCall {
  constructor(
    private readonly calls: CallRepository,
    private readonly idempotency: IdempotencyStore,
    private readonly events: CallEventPublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: NewCallInput): Promise<RegisterIncomingCallResult> {
    const receivedAt = this.now();
    const phoneNumber = PhoneNumber.create(input.phoneNumber);
    const callId = input.callId.trim();
    const key = `call:${callId}`;

    const acquired = await this.idempotency.acquire(key, IDEMPOTENCY_TTL_SECONDS);

    try {
      if (!acquired) {
        const existing = await this.calls.findByCallId(callId);
        if (existing) return { call: existing, duplicated: true };
        // Key claimed but nothing stored yet: a concurrent request is still
        // inserting, or an earlier attempt died. The unique constraint decides below.
      }

      const previousCalls = await this.calls.countByPhoneNumberBefore(phoneNumber, receivedAt);
      const candidate = Call.create(input, previousCalls, receivedAt);
      const { call, created } = await this.calls.insertIfAbsent(candidate);

      if (!created) return { call, duplicated: true };

      await this.events.callCreated(call);
      return { call, duplicated: false };
    } catch (error) {
      // Free the key so a retry is not mistaken for a duplicate.
      if (acquired) await this.idempotency.release(key).catch(() => undefined);
      throw error;
    }
  }
}
