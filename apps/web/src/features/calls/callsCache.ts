import type { QueryClient } from '@tanstack/react-query';
import type { CallDto, ListCallsResponse } from '@rcm/contracts';

export const CALLS_KEY = 'calls';

/** Replaces a call in every cached page that contains it. */
export function replaceCall(queryClient: QueryClient, call: CallDto): void {
  queryClient.setQueriesData<ListCallsResponse>({ queryKey: [CALLS_KEY] }, (old) =>
    old ? { ...old, items: old.items.map((c) => (c.id === call.id ? call : c)) } : old,
  );
}

/** Adds a call at the top of a page, ignoring duplicates and keeping the page size. */
export function prependCall(old: ListCallsResponse | undefined, call: CallDto): ListCallsResponse | undefined {
  if (!old || old.items.some((c) => c.id === call.id)) return old;
  return { ...old, total: old.total + 1, items: [call, ...old.items].slice(0, old.pageSize) };
}
