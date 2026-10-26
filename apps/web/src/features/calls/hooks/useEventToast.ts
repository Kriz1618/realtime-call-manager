import { useEffect, useState } from 'react';

export function useEventToast() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (kind: 'created' | 'updated') => {
    const message = kind === 'created' ? 'Nueva llamada recibida' : 'Se actualizó una llamada';
    setToast(message);

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => undefined);
      }

      if (Notification.permission === 'granted') {
        new Notification(kind === 'created' ? 'Nueva llamada' : 'Llamada actualizada', {
          body: message,
        });
      }
    }
  };

  return { toast, notify } as const;
}
