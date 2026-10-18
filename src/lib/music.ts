import titleUrl from '../assets/music/title.bin?url';
import dayUrl from '../assets/music/day.bin?url';
import nightUrl from '../assets/music/night.bin?url';
import type { GamePhase, Mode } from '../core/types';

export type MusicTrack = 'title' | 'day' | 'night';
export interface MusicAsset { url: string; release(): void }
export const MUSIC_GAIN: Record<MusicTrack, number> = { title: 0.18, day: 0.18, night: 0.22 };
const urls: Record<MusicTrack, string> = { title: titleUrl, day: dayUrl, night: nightUrl };

export function musicForScene(phase: GamePhase, mode: Mode): MusicTrack {
  return phase === 'title' ? 'title' : mode;
}

export function unpackMusic(packed: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(packed);
  const header = new TextEncoder().encode('DRAWBGM1');
  if (bytes.length <= header.length || header.some((byte, i) => bytes[i] !== byte)) throw new Error('Invalid game music container');
  const decoded = new Uint8Array(bytes.length - header.length);
  for (let i = 0; i < decoded.length; i++) decoded[i] = bytes[header.length + i] ^ 0xa7;
  return decoded;
}

/** Loaded only after sound is enabled; media decoding stays off the JS heap. */
export async function loadMusic(track: MusicTrack, signal: AbortSignal): Promise<MusicAsset> {
  const response = await fetch(urls[track], { signal });
  if (!response.ok) throw new Error('Music unavailable');
  const decoded = unpackMusic(await response.arrayBuffer());
  if (signal.aborted) throw new Error('Music cancelled');
  const url = URL.createObjectURL(new Blob([decoded], { type: 'audio/mpeg' }));
  return { url, release: () => URL.revokeObjectURL(url) };
}
