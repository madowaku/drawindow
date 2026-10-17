import { useCallback, useEffect, useRef, useState } from 'react';
import { createGameAudio, type SoundKind } from './audio';
import type { MusicTrack } from './music';

export function useGameAudio(track: MusicTrack) {
  const audioRef = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    const audio = createGameAudio(); audioRef.current = audio;
    const visibility = () => audio.setVisible(document.visibilityState !== 'hidden');
    const hide = () => audio.setVisible(false);
    const gesture = () => audio.retryFromGesture();
    visibility();
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerdown', gesture, { passive: true });
    document.addEventListener('keydown', gesture);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', gesture);
      document.removeEventListener('keydown', gesture);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', visibility);
      audio.dispose(); audioRef.current = null;
    };
  }, []);
  useEffect(() => { audioRef.current?.setTrack(track); }, [track]);
  const playSound = useCallback((kind: SoundKind) => audioRef.current?.playSound(kind), []);
  const toggleSound = () => {
    const next = !sound;
    audioRef.current?.setEnabled(next);
    if (next) audioRef.current?.playSound('turn');
    setSound(next);
  };
  return { sound, toggleSound, playSound };
}
