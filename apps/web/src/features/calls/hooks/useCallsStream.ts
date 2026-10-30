import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CALL_EVENTS } from '@rcm/contracts';
import type { CallDto, ListCallsQuery, ListCallsResponse } from '@rcm/contracts';
import { API_URL } from '../../../api/calls';
import { CALLS_KEY, prependCall, replaceCall } from '../callsCache';
import { pauseAllAudio } from '../audioCoordinator';
import { CallEventBuffer } from './callEventBuffer';

export type StreamStatus = 'connecting' | 'live' | 'offline';

interface Options {
  query: ListCallsQuery;
  /** True when new calls belong on screen: page 1, default order, no filters. */
  isLiveView: boolean;
  onNewEvent?: (kind: 'created' | 'updated') => void;
}

export function useCallsStream({ query, isLiveView, onNewEvent }: Options) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [pending, setPending] = useState(0);
  const [newCallId, setNewCallId] = useState<string>();
  const insertionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ query, isLiveView, onNewEvent });

  useEffect(() => {
    latest.current = { query, isLiveView, onNewEvent };
  }, [query, isLiveView, onNewEvent]);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/calls/stream`);
    let wasOffline = false;
    const parse = (event: Event) => JSON.parse((event as MessageEvent<string>).data) as CallDto;
    const buffer = new CallEventBuffer((event) => {
      if (event.kind === 'created') {
        if (!latest.current.isLiveView) {
          setPending((count) => count + 1);
          return;
        }
        setNewCallId(event.call.id);
        if (insertionTimer.current !== undefined) clearTimeout(insertionTimer.current);
        insertionTimer.current = setTimeout(() => {
          setNewCallId(undefined);
          insertionTimer.current = undefined;
        }, 450);
        queryClient.setQueryData<ListCallsResponse>([CALLS_KEY, latest.current.query], (old) =>
          prependCall(old, event.call),
        );
        return;
      }
      replaceCall(queryClient, event.call);
    });

    source.onopen = () => {
      setStatus('live');
      if (wasOffline) {
        // Pub/sub keeps no history: anything missed while offline must be reloaded.
        buffer.clear();
        setPending(0);
        void queryClient.invalidateQueries({ queryKey: [CALLS_KEY] });
      }
      wasOffline = false;
    };
    source.onerror = () => {
      wasOffline = true;
      setStatus('offline');
    };

    source.addEventListener(CALL_EVENTS.CREATED, (event) => {
      const call = parse(event);
      pauseAllAudio();
      latest.current.onNewEvent?.('created');
      buffer.enqueue({ kind: 'created', call });
    });
    source.addEventListener(CALL_EVENTS.SPAM_UPDATED, (event) => {
      const call = parse(event);
      pauseAllAudio();
      latest.current.onNewEvent?.('updated');
      buffer.enqueue({ kind: 'updated', call });
    });

    return () => {
      buffer.dispose();
      source.close();
      if (insertionTimer.current !== undefined) clearTimeout(insertionTimer.current);
    };
  }, [queryClient]);

  const refresh = () => {
    setPending(0);
    void queryClient.invalidateQueries({ queryKey: [CALLS_KEY] });
  };

  return { status, pending, newCallId, refresh };
}
