import type { CallDto, CallSortField, SortOrder } from '@rcm/contracts';
import { RecordingPlayer } from './RecordingPlayer';

interface Props {
  calls: CallDto[];
  darkMode?: boolean;
  sortBy: CallSortField;
  order: SortOrder;
  busyId?: string;
  onSort: (field: CallSortField) => void;
  onToggleSpam: (call: CallDto) => void;
}

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function SortHeader({ field, label, sortBy, order, onSort, darkMode }: {
  field: CallSortField;
  label: string;
  sortBy: CallSortField;
  order: SortOrder;
  onSort: (field: CallSortField) => void;
  darkMode: boolean;
}) {
  const active = sortBy === field;
  return (
    <th className="whitespace-nowrap px-2 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 ${darkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}
      >
        {label}
        <span className={active ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-transparent'}>
          {order === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  );
}

export function CallsTable({ calls, darkMode = false, sortBy, order, busyId, onSort, onToggleSpam }: Props) {
  const shellClass = darkMode ? 'overflow-x-auto rounded-lg border border-slate-700 bg-slate-900' : 'overflow-x-auto rounded-lg border border-slate-200 bg-white';
  const theadClass = darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600';
  const bodyClass = darkMode ? 'divide-y divide-slate-700' : 'divide-y divide-slate-100';
  const rowClass = darkMode ? 'text-slate-100' : 'text-slate-900';
  const buttonClass = darkMode
    ? 'w-24 whitespace-nowrap rounded border border-slate-600 px-1 py-1 text-center text-[10px] text-slate-100 hover:bg-slate-800 disabled:opacity-50'
    : 'w-24 whitespace-nowrap rounded border border-slate-300 px-1 py-1 text-center text-[10px] hover:bg-slate-100 disabled:opacity-50';

  return (
    <div className={shellClass}>
      <table className={`w-full text-sm ${rowClass}`}>
        <thead className={theadClass}>
          <tr>
            <th className="whitespace-nowrap px-2 py-2 text-left font-medium">Número</th>
            <th className="whitespace-nowrap px-2 py-2 text-left font-medium">Agente</th>
            <SortHeader field="durationSeconds" label="Duración" sortBy={sortBy} order={order} onSort={onSort} darkMode={darkMode} />
            <SortHeader field="receivedAt" label="Recibida" sortBy={sortBy} order={order} onSort={onSort} darkMode={darkMode} />
            <th className="min-w-40 px-2 py-2 text-left font-medium">Estado</th>
            <th className="whitespace-nowrap px-2 py-2 text-left font-medium">Grabación</th>
            <th className="w-28 px-2 py-2" />
          </tr>
        </thead>
        <tbody className={bodyClass}>
          {calls.map((call) => (
            <tr key={call.id} className={call.isSpam ? (darkMode ? 'bg-red-950/30 text-slate-400' : 'bg-red-50 text-slate-500') : undefined}>
              <td className="whitespace-nowrap px-2 py-2 font-mono">{call.phoneNumber}</td>
              <td className="whitespace-nowrap px-2 py-2">{call.agent}</td>
              <td className="whitespace-nowrap px-2 py-2 text-xs tabular-nums">
                {formatDuration(call.durationSeconds)}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-xs">
                {new Date(call.receivedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="min-w-40 px-2 py-2">
                <div className="flex gap-1">
                  {call.isSpam && (
                    <span className="shrink-0 whitespace-nowrap rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-800">
                      Spam
                    </span>
                  )}
                  {call.isRepeatCaller && (
                    <span className="shrink-0 whitespace-nowrap rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
                      Recurrente ({call.previousCallsCount})
                    </span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2">
                <RecordingPlayer url={call.recordingUrl} />
              </td>
              <td className="w-28 px-2 py-2 text-right">
                <button
                  type="button"
                  disabled={busyId === call.id}
                  onClick={() => onToggleSpam(call)}
                  className={buttonClass}
                >
                  {call.isSpam ? 'Quitar spam' : 'Marcar spam'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
