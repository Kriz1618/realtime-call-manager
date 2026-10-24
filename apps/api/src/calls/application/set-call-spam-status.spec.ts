import { Call } from '../domain/call';
import { CallNotFoundError } from '../domain/errors';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';
import type { CallRepository } from '../domain/ports/call.repository';
import { SetCallSpamStatus } from './set-call-spam-status';

function setup() {
  const call = Call.create(
    {
      callId: 'c-1',
      phoneNumber: '+573001234567',
      agent: 'agente-07',
      durationSeconds: 10,
      recordingUrl: 'https://x.com/a.mp3',
    },
    0,
    new Date(),
  );
  const updateSpamStatus = jest.fn(async () => undefined);
  const spamUpdated = jest.fn(async () => undefined);
  const repository = {
    findById: async (id: string) => (id === call.id ? call : null),
    updateSpamStatus,
  } as unknown as CallRepository;
  const events = { spamUpdated } as unknown as CallEventPublisher;
  return { call, updateSpamStatus, spamUpdated, useCase: new SetCallSpamStatus(repository, events) };
}

describe('SetCallSpamStatus', () => {
  it('marks a call as spam, saves it and publishes one event', async () => {
    const { useCase, call, updateSpamStatus, spamUpdated } = setup();

    const result = await useCase.execute(call.id, true);

    expect(result.isSpam).toBe(true);
    expect(updateSpamStatus).toHaveBeenCalledTimes(1);
    expect(spamUpdated).toHaveBeenCalledTimes(1);
  });

  it('unmarks a call that was spam', async () => {
    const { useCase, call } = setup();
    await useCase.execute(call.id, true);

    expect((await useCase.execute(call.id, false)).isSpam).toBe(false);
  });

  it('does not save or publish when the status does not change', async () => {
    const { useCase, call, updateSpamStatus, spamUpdated } = setup();

    await useCase.execute(call.id, false);

    expect(updateSpamStatus).not.toHaveBeenCalled();
    expect(spamUpdated).not.toHaveBeenCalled();
  });

  it('fails when the call does not exist', async () => {
    const { useCase } = setup();
    await expect(useCase.execute('8f14e45f-ceea-4672-9a4e-2b1b7c0d5a11', true)).rejects.toThrow(
      CallNotFoundError,
    );
  });
});
