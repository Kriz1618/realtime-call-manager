import type { CallDto } from '@rcm/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CallEventBuffer } from './callEventBuffer';

const call = (id: string, isSpam = false): CallDto => ({
  id,
  callId: `call-${id}`,
  phoneNumber: '+573001234567',
  agent: 'agent-1',
  durationSeconds: 30,
  recordingUrl: 'https://example.com/recording.mp3',
  isSpam,
  isRepeatCaller: false,
  previousCallsCount: 0,
  receivedAt: '2026-10-30T12:00:00.000Z',
});

afterEach(() => vi.useRealTimers());

describe('CallEventBuffer', () => {
  it('processes immediately when no events are waiting', () => {
    const process = vi.fn();
    const buffer = new CallEventBuffer(process);
    const event = { kind: 'created', call: call('1') } as const;

    buffer.enqueue(event);

    expect(process).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('processes queued events one at a time every 500 ms', () => {
    vi.useFakeTimers();
    const process = vi.fn();
    const buffer = new CallEventBuffer(process);

    buffer.enqueue({ kind: 'created', call: call('1') });
    buffer.enqueue({ kind: 'created', call: call('2') });
    buffer.enqueue({ kind: 'created', call: call('3') });

    expect(process.mock.calls.map(([event]) => event.call.id)).toEqual(['1']);
    vi.advanceTimersByTime(499);
    expect(process).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(process.mock.calls.map(([event]) => event.call.id)).toEqual(['1', '2']);
    vi.advanceTimersByTime(500);
    expect(process.mock.calls.map(([event]) => event.call.id)).toEqual(['1', '2', '3']);
  });

  it('keeps only the latest queued update for each call at its latest queue position', () => {
    vi.useFakeTimers();
    const process = vi.fn();
    const buffer = new CallEventBuffer(process);

    buffer.enqueue({ kind: 'created', call: call('first') });
    buffer.enqueue({ kind: 'updated', call: call('updated', false) });
    buffer.enqueue({ kind: 'created', call: call('second') });
    buffer.enqueue({ kind: 'updated', call: call('updated', true) });

    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);

    expect(process.mock.calls.map(([event]) => [event.kind, event.call.id, event.call.isSpam])).toEqual([
      ['created', 'first', false],
      ['created', 'second', false],
      ['updated', 'updated', true],
    ]);
  });

  it('cancels pending work when cleared or disposed', () => {
    vi.useFakeTimers();
    const process = vi.fn();
    const buffer = new CallEventBuffer(process);

    buffer.enqueue({ kind: 'created', call: call('first') });
    buffer.enqueue({ kind: 'created', call: call('second') });
    buffer.clear();
    vi.advanceTimersByTime(500);
    buffer.enqueue({ kind: 'created', call: call('third') });
    buffer.dispose();
    buffer.enqueue({ kind: 'created', call: call('fourth') });

    expect(process.mock.calls.map(([event]) => event.call.id)).toEqual(['first', 'third']);
    vi.runOnlyPendingTimers();
    expect(process).toHaveBeenCalledTimes(2);
  });
});
