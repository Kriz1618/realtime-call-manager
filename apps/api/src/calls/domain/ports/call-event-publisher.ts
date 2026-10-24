import type { Call } from '../call';

/** Best-effort: implementations must not throw. A lost event must never fail a stored call. */
export interface CallEventPublisher {
  callCreated(call: Call): Promise<void>;
  spamUpdated(call: Call): Promise<void>;
}

export const CALL_EVENT_PUBLISHER = Symbol('CALL_EVENT_PUBLISHER');
