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
      for (const mode of ['day', 'night'] as const) for (const hasPlayerMarks of [false, true]) {
        const context = { phase, mode, hasPlayerMarks, reducedMotion: false };
        expect(getShizukuReaction({ ...context, ...{ score: 0, correct: false, guess: 'cat' } }))
          .toEqual(getShizukuReaction({ ...context, ...{ score: 9, correct: true, guess: 'tree' } }));
      }
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

  it('uses round context for holding and results, never a guess or score', () => {
    expect(getShizukuReaction({ phase: 'girl_holding', mode: 'day', round: 1, reducedMotion: false }).pose).toBe('neutral');
    expect(getShizukuReaction({ phase: 'girl_holding', mode: 'day', round: 2, reducedMotion: false }).pose).toBe('smile');
    expect(getShizukuReaction({ phase: 'player_drawing', mode: 'night', round: 1, reducedMotion: false }).pose).toBe('neutral');
    expect(getShizukuReaction({ phase: 'player_drawing', mode: 'night', round: 2, reducedMotion: false }).pose).toBe('neutral');
    expect(getShizukuReaction({ phase: 'results', mode: 'day', round: 5, reducedMotion: false }).pose).toBe('smile');
  });

  it('changes from neutral to curious only after the first player marks, regardless of round or lighting', () => {
    for (const mode of ['day', 'night'] as const) {
      for (const round of [1, 2, 5]) {
        expect(getShizukuReaction({ phase: 'player_drawing', mode, round, reducedMotion: false, hasPlayerMarks: false }))
          .toMatchObject({ pose: 'neutral', motion: 'idle', durationMs: 0 });
        expect(getShizukuReaction({ phase: 'player_drawing', mode, round, reducedMotion: false, hasPlayerMarks: true }))
          .toMatchObject({ pose: 'curious', motion: 'watch', durationMs: 600, leanPx: mode === 'day' ? 2 : 1 });
        expect(getShizukuReaction({ phase: 'player_drawing', mode, round, reducedMotion: true, hasPlayerMarks: true }))
          .toMatchObject({ pose: 'curious', durationMs: 0, leanPx: 0 });
      }
    }
  });

  it('holds the first girl pose, then follows monotonic drawing progress to the exact end', () => {
    expect(getShizukuReaction({ phase: 'girl_drawing', mode: 'day', reducedMotion: false, progress: 0 }))
      .toMatchObject({ pose: 'thinking', motion: 'think', durationMs: 0, leanPx: 0 });
    expect(getShizukuReaction({ phase: 'girl_drawing', mode: 'day', reducedMotion: false, progress: DRAWING_HESITATION }))
      .toMatchObject({ pose: 'drawing', motion: 'draw', durationMs: 600, leanPx: 2 });
    let last = 0;
    for (let i = 0; i <= 100; i += 1) {
      const current = characterDrawingProgress(i / 100);
      expect(current).toBeGreaterThanOrEqual(last);
      last = current;
    }
    expect(characterDrawingProgress(1)).toBe(1);
  });

  it('reserves shy for the night farewell and ignores outcome data and round parity', () => {
    for (const mode of ['day', 'night'] as const) for (const round of [1, 2, 5]) {
      const context = { phase: 'results' as const, mode, round, reducedMotion: false };
      expect(getShizukuReaction(context).pose).toBe(mode === 'day' ? 'smile' : 'shy');
      const outcomeA = { ...context, score: 0, correct: false, recognition: { guess: 'cat' } };
      const outcomeB = { ...context, score: 9, correct: true, recognition: { guess: 'tree' } };
      expect(getShizukuReaction(outcomeA)).toEqual(getShizukuReaction(outcomeB));
      for (const phase of ['girl_holding', 'player_drawing', 'recognition_error'] as const) {
        expect(getShizukuReaction({ ...context, phase }).pose).not.toBe('shy');
      }
    }
  });
});
