type CallsFooterProps = {
  page: number;
  totalPages: number;
  totalCalls: number;
  isDark: boolean;
  onPrev: () => void;
  onNext: () => void;
};

type ChevronIconProps = { direction: 'left' | 'right' };

function ChevronIcon({ direction }: ChevronIconProps) {
  const d = direction === 'left'
    ? 'M12.5 4.5L7 10l5.5 5.5'
    : 'M7.5 4.5L13 10l-5.5 5.5';

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 stroke-current">
      <path d={d} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CallsFooter({
  page,
  totalPages,
  totalCalls,
  isDark,
  onPrev,
  onNext,
}: CallsFooterProps) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  const navButton = `
    inline-flex h-10 w-10 items-center justify-center rounded-full border
    border-slate-200 bg-white text-slate-700 shadow-sm
    hover:bg-slate-50 hover:border-slate-300
    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200
    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none
    dark:hover:bg-slate-800 dark:hover:border-slate-600
    dark:disabled:hover:bg-slate-900 dark:disabled:hover:border-slate-700
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    dark:focus-visible:ring-offset-slate-900
    transition-all duration-200
  `;

  const footerTextClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const pillClass = isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700';

  return (
    <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
      <span
        className={`
          justify-self-start inline-flex items-center gap-1.5 rounded-full
          px-3 py-1 text-xs font-medium ${pillClass}
        `}
      >
        <span className="font-semibold tabular-nums">
          {totalCalls.toLocaleString('es-CO')}
        </span>
        <span>{totalCalls === 1 ? 'llamada' : 'llamadas'}</span>
      </span>

      <div className="justify-self-center inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Página anterior"
          className={navButton}
        >
          <ChevronIcon direction="left" />
        </button>

        <span className={`min-w-[8.5rem] text-center text-sm tabular-nums ${footerTextClass}`}>
          Página{' '}
          <strong className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-900'}>
            {page}
          </strong>{' '}
          de {totalPages}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          aria-label="Página siguiente"
          className={navButton}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <span aria-hidden="true" />
    </footer>
  );
}
