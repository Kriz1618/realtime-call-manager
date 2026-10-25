import { useState } from 'react';

interface Props {
  url: string;
}

export function RecordingPlayer({ url }: Props) {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <div className="relative h-8 w-36 shrink-0">
      <audio
        controls
        preload="none"
        src={url}
        onError={() => setUnavailable(true)}
        aria-label="Reproducir grabación"
        className="block h-8 w-36 max-w-none"
      />
      {unavailable && (
        <span
          className="absolute inset-0 flex items-center bg-white/90 px-2 text-xs text-slate-600"
          title="No se pudo cargar el audio"
        >
          Audio no disponible
        </span>
      )}
    </div>
  );
}
