import { useEffect, useMemo, useState } from 'react';
import type { CallSortField, ListCallsQuery, SortOrder } from '@rcm/contracts';
import { CallsTable } from './components/CallsTable';
import { useCalls, useSetSpam } from './hooks/useCalls';
import { useCallsStream, type StreamStatus } from './hooks/useCallsStream';

const PAGE_SIZE = 10;
type SpamFilter = 'all' | 'spam' | 'clean';

const STATUS_LABEL: Record<StreamStatus, { text: string; dot: string }> = {
  live: { text: 'En vivo', dot: 'bg-green-500' },
  connecting: { text: 'Conectando…', dot: 'bg-amber-500' },
  offline: { text: 'Sin conexión', dot: 'bg-red-500' },
};

export function CallsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [spamFilter, setSpamFilter] = useState<SpamFilter>('all');
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [sortBy, setSortBy] = useState<CallSortField>('receivedAt');
  const [order, setOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo<ListCallsQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      isSpam: spamFilter === 'all' ? undefined : spamFilter === 'spam',
      isRepeatCaller: repeatOnly ? true : undefined,
      sortBy,
      order,
    }),
    [page, debouncedSearch, spamFilter, repeatOnly, sortBy, order],
  );
  const isLiveView =
    page === 1 && sortBy === 'receivedAt' && order === 'desc' && !debouncedSearch && spamFilter === 'all' && !repeatOnly;

  const { data, isPending, isError, error, refetch } = useCalls(query);
  const { status, pending, refresh } = useCallsStream({ query, isLiveView });
  const setSpam = useSetSpam();

  const onSort = (field: CallSortField) => {
    if (field === sortBy) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const badge = STATUS_LABEL[status];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Llamadas entrantes</h1>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
          {badge.text}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={spamFilter}
          onChange={(e) => {
            setSpamFilter(e.target.value as SpamFilter);
            setPage(1);
          }}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="all">Todas</option>
          <option value="clean">Sin spam</option>
          <option value="spam">Solo spam</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={repeatOnly}
            onChange={(e) => {
              setRepeatOnly(e.target.checked);
              setPage(1);
            }}
          />
          Solo recurrentes
        </label>
      </div>

      {pending > 0 && (
        <button
          type="button"
          onClick={refresh}
          className="w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
        >
          {pending} {pending === 1 ? 'llamada nueva' : 'llamadas nuevas'}: actualizar
        </button>
      )}

      {isPending && <p className="text-sm text-slate-500">Cargando…</p>}
      {isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error.message}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {setSpam.isError && <p className="text-sm text-red-700">No se pudo actualizar la llamada.</p>}

      {data && data.items.length === 0 && <p className="text-sm text-slate-500">No hay llamadas que mostrar.</p>}
      {data && data.items.length > 0 && (
        <CallsTable
          calls={data.items}
          sortBy={sortBy}
          order={order}
          busyId={setSpam.isPending ? setSpam.variables?.id : undefined}
          onSort={onSort}
          onToggleSpam={(call) => setSpam.mutate({ id: call.id, isSpam: !call.isSpam })}
        />
      )}

      {data && (
        <footer className="flex items-center justify-between text-sm text-slate-600">
          <span>{data.total} llamadas</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </main>
  );
}
