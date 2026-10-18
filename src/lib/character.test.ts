import { describe, expect, it } from 'vitest';
import type { GamePhase } from '../core/types';
import {
  characterDrawingProgress,
  DRAWING_HESITATION,
  getShizukuReaction,
} from './character';

describe('Shizuku conversational reactions', () => {
  it('returns a valid phase reaction without taking recognition or result data', () => {
    const phases: GamePhase[] = [
      'title', 'girl_breath', 'girl_drawing', 'girl_holding', 'player_drawing',
      'recognizing', 'recognition_error', 'review_intents', 'results',
    ];
    for (const phase of phases) {
      expect(getShizukuReaction({ phase, mode: 'day', round: 1, reducedMotion: false }).pose)
        .toMatch(/^(neutral|thinking|smile|shy|breath|curious|drawing)$/);
    }

    expect(getShizukuReaction({ phase: 'recognition_error', mode: 'day', reducedMotion: false }))
      .toMatchObject({ pose: 'neutral', motion: 'concern', leanPx: 0 });
    expect(getShizukuReaction({ phase: 'recognizing', mode: 'day', reducedMotion: false }).pose).toBe('thinking');
    expect(getShizukuReaction({ phase: 'review_intents', mode: 'day', reducedMotion: false }).pose).toBe('neutral');
  });

  it('uses a fixed breath gesture with a visible day lean and subdued night lean', () => {
    expect(getShizukuReaction({ phase: 'girl_breath', mode: 'day', reducedMotion: false }))
      .toMatchObject({ pose: 'breath', motion: 'breath', leanPx: 11, durationMs: 650 });
    expect(getShizukuReaction({ phase: 'girl_breath', mode: 'night', reducedMotion: false }))
      .toMatchObject({ pose: 'neutral', motion: 'breath', leanPx: 3, durationMs: 280 });
    expect(getShizukuReaction({ phase: 'girl_breath', mode: 'day', reducedMotion: true }))
      .toMatchObject({ pose: 'breath', leanPx: 0, durationMs: 0 });
  });

  it('varies only on round number during turns, never on a guess or score', () => {
    expect(getShizukuReaction({ phase: 'girl_holding', mode: 'day', round: 1, reducedMotion: false }).pose).toBe('neutral');
    expect(getShizukuReaction({ phase: 'girl_holding', mode: 'day', round: 2, reducedMotion: false }).pose).toBe('smile');
    expect(getShizukuReaction({ phase: 'player_drawing', mode: 'night', round: 1, reducedMotion: false }).pose).toBe('curious');
    expect(getShizukuReaction({ phase: 'player_drawing', mode: 'night', round: 2, reducedMotion: false }).pose).toBe('neutral');
    expect(getShizukuReaction({ phase: 'results', mode: 'day', round: 5, reducedMotion: false }).pose).toBe('smile');
  });

  it('holds the first girl pose, then follows monotonic drawing progress to the exact end', () => {
    expect(getShizukuReaction({ phase: 'girl_drawing', mode: 'day', reducedMotion: false, progress: 0 }).pose).toBe('thinking');
    expect(getShizukuReaction({ phase: 'girl_drawing', mode: 'day', reducedMotion: false, progress: DRAWING_HESITATION }).pose).toBe('drawing');
    let last = 0;
    for (let i = 0; i <= 100; i += 1) {
      const current = characterDrawingProgress(i / 100);
      expect(current).toBeGreaterThanOrEqual(last);
      last = current;
    }
    expect(characterDrawingProgress(1)).toBe(1);
  });
});
