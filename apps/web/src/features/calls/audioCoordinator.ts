let activeAudio: HTMLAudioElement | null = null;

export function pauseAllAudio() {
  if (activeAudio && !activeAudio.paused) {
    activeAudio.pause();
  }
  activeAudio = null;
}

export function registerAudioPlayer(audio: HTMLAudioElement | null) {
  if (!audio) {
    return () => {};
  }

  const handlePlay = () => {
    if (activeAudio && activeAudio !== audio) {
      activeAudio.pause();
    }
    activeAudio = audio;
  };

  const handlePause = () => {
    if (activeAudio === audio) {
      activeAudio = null;
    }
  };

  const handleEnded = () => {
    if (activeAudio === audio) {
      activeAudio = null;
    }
  };

  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handlePause);
  audio.addEventListener('ended', handleEnded);

  return () => {
    audio.removeEventListener('play', handlePlay);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('ended', handleEnded);
    if (activeAudio === audio) {
      activeAudio = null;
    }
  };
}
