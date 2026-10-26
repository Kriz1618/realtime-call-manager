type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
};

export function ThemeToggle({ isDark, onToggle, className = '' }: ThemeToggleProps) {
  const actionLabel = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={actionLabel}
      title={actionLabel}
      className={`
        ${className}
        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
        bg-gray-100 text-gray-900 border border-gray-300 shadow-sm
        hover:bg-gray-200 hover:border-gray-400
        dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
        dark:hover:bg-gray-700 dark:hover:border-gray-500
        transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-gray-900
      `}
    >
      <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
