import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CALL_EVENTS } from '@rcm/contracts';
import type { CallDto, ListCallsQuery, ListCallsResponse } from '@rcm/contracts';
import { API_URL } from '../../../api/calls';
import { CALLS_KEY, prependCall, replaceCall } from '../callsCache';

export type StreamStatus = 'connecting' | 'live' | 'offline';

interface Options {
  query: ListCallsQuery;
  /** True when new calls belong on screen: page 1, default order, no filters. */
  isLiveView: boolean;
}

export function useCallsStream({ query, isLiveView }: Options) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [pending, setPending] = useState(0);
  const latest = useRef({ query, isLiveView });

  useEffect(() => {
    latest.current = { query, isLiveView };
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/calls/stream`);
    let wasOffline = false;
    const parse = (event: Event) => JSON.parse((event as MessageEvent<string>).data) as CallDto;

    source.onopen = () => {
      setStatus('live');
      if (wasOffline) {
        // Pub/sub keeps no history: anything missed while offline must be reloaded.
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
      if (!latest.current.isLiveView) {
        setPending((n) => n + 1);
        return;
      }
      queryClient.setQueryData<ListCallsResponse>([CALLS_KEY, latest.current.query], (old) =>
        prependCall(old, call),
      );
    });
    source.addEventListener(CALL_EVENTS.SPAM_UPDATED, (event) => replaceCall(queryClient, parse(event)));

    return () => source.close();
  }, [queryClient]);

  const refresh = () => {
    setPending(0);
    void queryClient.invalidateQueries({ queryKey: [CALLS_KEY] });
  };

  return { status, pending, refresh };
}
