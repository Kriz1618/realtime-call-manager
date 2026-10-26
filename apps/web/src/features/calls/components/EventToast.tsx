type EventToastProps = {
  message: string | null;
  isDark?: boolean;
};

export function EventToast({ message, isDark = false }: EventToastProps) {
  if (!message) {
    return null;
  }

  const className = isDark
    ? 'rounded border border-blue-500/40 bg-blue-950/60 px-3 py-2 text-sm text-blue-100 shadow-sm'
    : 'rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow-sm';

  return <div className={className}>{message}</div>;
}
