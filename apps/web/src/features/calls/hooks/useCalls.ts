import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListCallsQuery } from '@rcm/contracts';
import { fetchCalls, setSpam } from '../../../api/calls';
import { CALLS_KEY, replaceCall } from '../callsCache';

export function useCalls(query: ListCallsQuery) {
  return useQuery({
    queryKey: [CALLS_KEY, query],
    queryFn: () => fetchCalls(query),
    placeholderData: keepPreviousData,
  });
}

export function useSetSpam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isSpam }: { id: string; isSpam: boolean }) => setSpam(id, isSpam),
    onSuccess: (call) => replaceCall(queryClient, call),
  });
}
