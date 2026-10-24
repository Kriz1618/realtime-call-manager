import type { CallDto, CallSortField, SortOrder } from '@rcm/contracts';

interface Props {
  calls: CallDto[];
  sortBy: CallSortField;
  order: SortOrder;
  busyId?: string;
  onSort: (field: CallSortField) => void;
  onToggleSpam: (call: CallDto) => void;
}

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function SortHeader({ field, label, sortBy, order, onSort }: {
  field: CallSortField;
  label: string;
  sortBy: CallSortField;
  order: SortOrder;
  onSort: (field: CallSortField) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-4 py-2 text-left font-medium">
      <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-slate-900">
        {label}
        <span className={active ? 'text-slate-900' : 'text-transparent'}>{order === 'asc' ? '▲' : '▼'}</span>
      </button>
    </th>
  );
}

export function CallsTable({ calls, sortBy, order, busyId, onSort, onToggleSpam }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Número</th>
            <th className="px-4 py-2 text-left font-medium">Agente</th>
            <SortHeader field="durationSeconds" label="Duración" sortBy={sortBy} order={order} onSort={onSort} />
            <SortHeader field="receivedAt" label="Recibida" sortBy={sortBy} order={order} onSort={onSort} />
            <th className="px-4 py-2 text-left font-medium">Estado</th>
            <th className="px-4 py-2 text-left font-medium">Grabación</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {calls.map((call) => (
            <tr key={call.id} className={call.isSpam ? 'bg-red-50 text-slate-500' : undefined}>
              <td className="px-4 py-2 font-mono">{call.phoneNumber}</td>
              <td className="px-4 py-2">{call.agent}</td>
              <td className="px-4 py-2 tabular-nums">{formatDuration(call.durationSeconds)}</td>
              <td className="px-4 py-2">{new Date(call.receivedAt).toLocaleString()}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  {call.isSpam && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Spam</span>}
                  {call.isRepeatCaller && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Recurrente ({call.previousCallsCount})
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2">
                <a href={call.recordingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Abrir
                </a>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  disabled={busyId === call.id}
                  onClick={() => onToggleSpam(call)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
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
