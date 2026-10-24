import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { toCallDto } from '../call.mapper';
import { Call } from '../domain/call';
import { CALL_EVENTS_CHANNEL } from './call-events.channel';
import { RedisCallEventPublisher } from './redis-call-event.publisher';

const call = Call.create(
  {
    callId: 'c-1',
    phoneNumber: '+573001234567',
    agent: 'agente-07',
    durationSeconds: 10,
    recordingUrl: 'https://x.com/a.mp3',
  },
  0,
  new Date('2026-10-24T12:00:00Z'),
);

describe('RedisCallEventPublisher', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterAll(() => jest.restoreAllMocks());

  it.each([
    ['callCreated', 'call.created'],
    ['spamUpdated', 'call.spam_updated'],
  ] as const)('%s publishes %s as JSON on the events channel', async (method, type) => {
    const publish = jest.fn(async (_channel: string, _payload: string) => 1);
    const publisher = new RedisCallEventPublisher({ publish } as unknown as Redis);

    await publisher[method](call);

    const [channel, payload] = publish.mock.calls[0];
    expect(channel).toBe(CALL_EVENTS_CHANNEL);
    expect(JSON.parse(payload)).toEqual({ type, data: toCallDto(call) });
  });

  it('does not throw when redis fails', async () => {
    const publish = jest.fn().mockRejectedValue(new Error('connection refused'));
    const publisher = new RedisCallEventPublisher({ publish } as unknown as Redis);

    await expect(publisher.callCreated(call)).resolves.toBeUndefined();
  });
});
