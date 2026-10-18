import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { musicForScene, unpackMusic } from './music';
import type { GamePhase } from '../core/types';
import manifest from '../../assets/bgm-manifest.json';

describe('scene music and admitted asset bytes', () => {
  it('uses the title track for both title themes and the mode track everywhere in a session', () => {
    for (const mode of ['day', 'night'] as const) {
      expect(musicForScene('title', mode)).toBe('title');
      for (const phase of ['girl_breath', 'girl_drawing', 'girl_holding', 'player_drawing', 'recognizing', 'recognition_error', 'review_intents', 'results'] as GamePhase[]) expect(musicForScene(phase, mode)).toBe(mode);
    }
  });

  it('preserves all three converted recordings exactly inside their game containers', async () => {
    for (const track of manifest.tracks) {
      const bytes = await readFile(track.output);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(track.outputSha256);
      const decoded = unpackMusic(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
      expect(createHash('sha256').update(decoded).digest('hex')).toBe(track.convertedSha256);
      expect(track.originalSha256).toHaveLength(64); expect(track.durationSeconds).toBeGreaterThan(100);
    }
  });

  it('rejects unrelated or truncated containers rather than playing arbitrary bytes', () => {
    expect(() => unpackMusic(new ArrayBuffer(0))).toThrow();
    expect(() => unpackMusic(new TextEncoder().encode('NOT-MUSIC').buffer)).toThrow();
  });
});
