import type { Call } from '../domain/call';
import { CallNotFoundError } from '../domain/errors';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';
import type { CallRepository } from '../domain/ports/call.repository';

export class SetCallSpamStatus {
  constructor(
    private readonly calls: CallRepository,
    private readonly events: CallEventPublisher,
  ) {}

  async execute(id: string, isSpam: boolean): Promise<Call> {
    const call = await this.calls.findById(id);
    if (!call) throw new CallNotFoundError(`Call ${id} not found`);

    if (call.isSpam === isSpam) return call;

    if (isSpam) call.markAsSpam();
    else call.unmarkAsSpam();

    await this.calls.updateSpamStatus(call);
    await this.events.spamUpdated(call);
    return call;
  }
}
