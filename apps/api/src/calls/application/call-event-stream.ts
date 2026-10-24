import type { CallEvent } from '@rcm/contracts';
import type { Observable } from 'rxjs';

export interface CallEventStream {
  /** Hot stream of events published by any API instance; completes on shutdown. */
  events(): Observable<CallEvent>;
}

export const CALL_EVENT_STREAM = Symbol('CALL_EVENT_STREAM');
