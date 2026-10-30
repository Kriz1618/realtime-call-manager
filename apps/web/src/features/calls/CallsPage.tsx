import { useEffect, useMemo, useState } from 'react';
import type { CallSortField, ListCallsQuery, SortOrder } from '@rcm/contracts';
import { CallsFooter } from './components/CallsFooter';
import { CallsTable } from './components/CallsTable';
import { EventToast } from './components/EventToast';
import { ThemeToggle } from './components/ThemeToggle';
import { useCalls, useSetSpam } from './hooks/useCalls';
import { useCallsStream, type StreamStatus } from './hooks/useCallsStream';
import { useEventToast } from './hooks/useEventToast';
import { useThemeMode } from './hooks/useThemeMode';

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

  const { setTheme, isDark } = useThemeMode();
  const { toast, notify } = useEventToast();

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
  const setSpam = useSetSpam();

  const { status, pending, newCallId, refresh } = useCallsStream({
    query,
    isLiveView,
    onNewEvent: notify,
  });

  const onSort = (field: CallSortField) => {
    if (field === sortBy) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const badge = STATUS_LABEL[status];

  const shellClass = isDark ? 'min-h-screen bg-slate-950 text-slate-100' : 'min-h-screen bg-slate-100 text-slate-900';
  const inputClass = isDark
    ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-400'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500';
  const secondaryText = isDark ? 'text-slate-300' : 'text-slate-600';
  const actionButtonClass = isDark
    ? 'border-slate-700 bg-slate-800 text-slate-100'
    : 'border-slate-300 bg-white text-slate-700';

  return (
    <main className={`${shellClass} mx-auto max-w-5xl space-y-4 p-6`}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Llamadas entrantes</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle
            isDark={isDark}
            onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            className={`${actionButtonClass} inline-flex items-center gap-2`}
          />
          <span className={`flex items-center gap-2 text-sm ${secondaryText}`}>
            <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
            {badge.text}
          </span>
        </div>
      </header>

      <EventToast message={toast} isDark={isDark} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por número"
          className={`rounded border px-3 py-1.5 text-sm ${inputClass}`}
        />
        <select
          value={spamFilter}
          onChange={(event) => {
            setSpamFilter(event.target.value as SpamFilter);
            setPage(1);
          }}
          className={`rounded border px-3 py-1.5 text-sm ${inputClass}`}
        >
          <option value="all">Todas</option>
          <option value="clean">Sin spam</option>
          <option value="spam">Solo spam</option>
        </select>
        <label className={`flex items-center gap-2 text-sm ${secondaryText}`}>
          <input
            type="checkbox"
            checked={repeatOnly}
            onChange={(event) => {
              setRepeatOnly(event.target.checked);
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

      {isPending && <p className={`text-sm ${secondaryText}`}>Cargando…</p>}
      {isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error.message}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {setSpam.isError && <p className="text-sm text-red-700">No se pudo actualizar la llamada.</p>}

      {data && data.items.length === 0 && <p className={`text-sm ${secondaryText}`}>No hay llamadas que mostrar.</p>}
      {data && data.items.length > 0 && (
        <CallsTable
          calls={data.items}
          newCallId={newCallId}
          darkMode={isDark}
          sortBy={sortBy}
          order={order}
          busyId={setSpam.isPending ? setSpam.variables?.id : undefined}
          onSort={onSort}
          onToggleSpam={(call) => setSpam.mutate({ id: call.id, isSpam: !call.isSpam })}
        />
      )}

      {data && (
        <CallsFooter
          page={page}
          totalPages={totalPages}
          totalCalls={data.total}
          isDark={isDark}
          onPrev={() => setPage((current) => current - 1)}
          onNext={() => setPage((current) => current + 1)}
        />
      )}
    </main>
  );
}
