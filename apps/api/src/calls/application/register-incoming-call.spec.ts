import { Call, NewCallInput } from '../domain/call';
import { InvalidCallError } from '../domain/errors';
import type { PhoneNumber } from '../domain/phone-number';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';
import type { CallPage, CallRepository, InsertResult } from '../domain/ports/call.repository';
import type { IdempotencyStore } from '../domain/ports/idempotency-store';
import { RegisterIncomingCall } from './register-incoming-call';

class InMemoryCallRepository implements CallRepository {
  readonly stored = new Map<string, Call>();
  failNextInsert = false;

  async insertIfAbsent(call: Call): Promise<InsertResult> {
    if (this.failNextInsert) {
      this.failNextInsert = false;
      throw new Error('database unavailable');
    }
    const existing = this.stored.get(call.callId);
    if (existing) return { call: existing, created: false };
    this.stored.set(call.callId, call);
    return { call, created: true };
  }

  async findByCallId(callId: string): Promise<Call | null> {
    return this.stored.get(callId) ?? null;
  }

  async list(): Promise<CallPage> {
    return { items: [...this.stored.values()], total: this.stored.size };
  }

  async countByPhoneNumberBefore(phoneNumber: PhoneNumber, before: Date): Promise<number> {
    return [...this.stored.values()].filter(
      (c) => c.phoneNumber.equals(phoneNumber) && c.toProps().receivedAt < before,
    ).length;
  }
}

class InMemoryIdempotencyStore implements IdempotencyStore {
  readonly keys = new Set<string>();

  async acquire(key: string): Promise<boolean> {
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }

  async release(key: string): Promise<void> {
    this.keys.delete(key);
  }
}

class RecordingPublisher implements CallEventPublisher {
  readonly created: Call[] = [];

  async callCreated(call: Call): Promise<void> {
    this.created.push(call);
  }

  async spamUpdated(): Promise<void> {}
}

const input: NewCallInput = {
  callId: 'c-10234',
  phoneNumber: '+573001234567',
  agent: 'agente-07',
  durationSeconds: 185,
  recordingUrl: 'https://grabaciones.ejemplo.com/c-10234.mp3',
};

function setup() {
  const calls = new InMemoryCallRepository();
  const idempotency = new InMemoryIdempotencyStore();
  const events = new RecordingPublisher();
  let current = new Date('2026-10-23T12:00:00Z');
  const useCase = new RegisterIncomingCall(calls, idempotency, events, () => current);
  const advance = () => {
    current = new Date(current.getTime() + 60_000);
  };
  return { calls, idempotency, events, useCase, advance };
}

describe('RegisterIncomingCall', () => {
  it('stores a new call and publishes one event', async () => {
    const { useCase, calls, events } = setup();

    const result = await useCase.execute(input);

    expect(result.duplicated).toBe(false);
    expect(result.call.isRepeatCaller).toBe(false);
    expect(calls.stored.size).toBe(1);
    expect(events.created).toHaveLength(1);
  });

  it('does not duplicate when the same event arrives twice', async () => {
    const { useCase, calls, events } = setup();

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.duplicated).toBe(true);
    expect(second.call.id).toBe(first.call.id);
    expect(calls.stored.size).toBe(1);
    expect(events.created).toHaveLength(1);
  });

  it('stays correct when the idempotency key was lost but the call is stored', async () => {
    const { useCase, idempotency, calls, events } = setup();
    await useCase.execute(input);
    idempotency.keys.clear();

    const result = await useCase.execute(input);

    expect(result.duplicated).toBe(true);
    expect(calls.stored.size).toBe(1);
    expect(events.created).toHaveLength(1);
  });

  it('stores the call when the key is claimed but nothing was stored', async () => {
    const { useCase, idempotency, calls } = setup();
    idempotency.keys.add('call:c-10234');

    const result = await useCase.execute(input);

    expect(result.duplicated).toBe(false);
    expect(calls.stored.size).toBe(1);
  });

  it('creates exactly one call when identical events race', async () => {
    const { useCase, calls, events } = setup();

    const results = await Promise.all([useCase.execute(input), useCase.execute(input)]);

    expect(results.filter((r) => !r.duplicated)).toHaveLength(1);
    expect(calls.stored.size).toBe(1);
    expect(events.created).toHaveLength(1);
  });

  it('flags a repeat caller across different number formats', async () => {
    const { useCase, advance } = setup();
    await useCase.execute(input);
    advance();

    const second = await useCase.execute({
      ...input,
      callId: 'c-10235',
      phoneNumber: '+57 300 123 4567',
    });

    expect(second.call.isRepeatCaller).toBe(true);
    expect(second.call.toProps().previousCallsCount).toBe(1);
  });

  it('releases the key when persistence fails so a retry can succeed', async () => {
    const { useCase, calls, idempotency } = setup();
    calls.failNextInsert = true;

    await expect(useCase.execute(input)).rejects.toThrow('database unavailable');
    expect(idempotency.keys.size).toBe(0);

    const retry = await useCase.execute(input);
    expect(retry.duplicated).toBe(false);
  });

  it('does not keep the key for an invalid payload', async () => {
    const { useCase, idempotency, calls } = setup();

    await expect(useCase.execute({ ...input, recordingUrl: 'not a url' })).rejects.toThrow(
      InvalidCallError,
    );

    expect(idempotency.keys.size).toBe(0);
    expect(calls.stored.size).toBe(0);
  });
});
