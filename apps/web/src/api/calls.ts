import type { CallDto, ListCallsQuery, ListCallsResponse } from '@rcm/contracts';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function toQueryString(query: ListCallsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export async function fetchCalls(query: ListCallsQuery): Promise<ListCallsResponse> {
  const res = await fetch(`${API_URL}/calls?${toQueryString(query)}`);
  if (!res.ok) throw new Error(`Could not load calls (${res.status})`);
  return res.json();
}

export async function setSpam(id: string, isSpam: boolean): Promise<CallDto> {
  const res = await fetch(`${API_URL}/calls/${id}/spam`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSpam }),
  });
  if (!res.ok) throw new Error(`Could not update call (${res.status})`);
  return res.json();
}
