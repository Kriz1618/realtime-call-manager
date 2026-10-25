import { QueryClient } from '@tanstack/react-query';
import type { CallDto, ListCallsResponse } from '@rcm/contracts';
import { describe, expect, it } from 'vitest';
import { CALLS_KEY, prependCall, replaceCall } from './callsCache';

const call = (id: string, overrides: Partial<CallDto> = {}): CallDto => ({
  id,
  callId: `c-${id}`,
  phoneNumber: '+573001234567',
  agent: 'agente-07',
  durationSeconds: 10,
  recordingUrl: 'https://x.com/a.mp3',
  isSpam: false,
  isRepeatCaller: false,
  previousCallsCount: 0,
  receivedAt: '2026-10-25T12:00:00.000Z',
  ...overrides,
});

const page = (items: CallDto[], pageSize = 3, total = items.length): ListCallsResponse => ({
  items,
  total,
  page: 1,
  pageSize,
});

describe('prependCall', () => {
  it('adds the call on top and increments the total', () => {
    const result = prependCall(page([call('1')]), call('2'));

    expect(result?.items.map((c) => c.id)).toEqual(['2', '1']);
    expect(result?.total).toBe(2);
  });

  it('ignores a call that is already listed', () => {
    const old = page([call('1')]);
    expect(prependCall(old, call('1'))).toBe(old);
  });

  it('keeps the page size by dropping the last row', () => {
    const result = prependCall(page([call('1'), call('2'), call('3')]), call('4'));

    expect(result?.items.map((c) => c.id)).toEqual(['4', '1', '2']);
    expect(result?.total).toBe(4);
  });

  it('does nothing when there is no cached page yet', () => {
    expect(prependCall(undefined, call('1'))).toBeUndefined();
  });
});

describe('replaceCall', () => {
  it('updates the call in every cached query that contains it', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData([CALLS_KEY, { page: 1 }], page([call('1'), call('2')]));
    queryClient.setQueryData([CALLS_KEY, { page: 2 }], page([call('1')]));
    queryClient.setQueryData([CALLS_KEY, { page: 3 }], page([call('9')]));

    replaceCall(queryClient, call('1', { isSpam: true }));

    const first = queryClient.getQueryData<ListCallsResponse>([CALLS_KEY, { page: 1 }]);
    const second = queryClient.getQueryData<ListCallsResponse>([CALLS_KEY, { page: 2 }]);
    const untouched = queryClient.getQueryData<ListCallsResponse>([CALLS_KEY, { page: 3 }]);

    expect(first?.items.map((c) => c.isSpam)).toEqual([true, false]);
    expect(second?.items[0]?.isSpam).toBe(true);
    expect(untouched?.items[0]?.isSpam).toBe(false);
  });
});
