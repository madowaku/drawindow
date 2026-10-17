import { describe, expect, it } from 'vitest';
import type { Stroke } from '../core/types';
import { clampPlaybackDuration, createTimedStrokes, getPlaybackDuration, strokesAtProgress } from './playback';

describe('stroke playback', () => {
  it('keeps girl sketches within the requested half-to-one-and-a-half second range', () => {
    expect(clampPlaybackDuration(100)).toBe(500);
    expect(clampPlaybackDuration(2400)).toBe(1500);
    expect(clampPlaybackDuration(Number.NaN)).toBe(900);
    expect(getPlaybackDuration([{ id: 'fast', points: [{ x: 0, y: 0, t: 0 }, { x: 1, y: 1, t: 430 }] }])).toBe(500);
    expect(getPlaybackDuration([{ id: 'empty-time', points: [{ x: 0, y: 0, t: 0 }] }])).toBe(900);
  });

  it('reveals strokes in timestamp order and interpolates the active segment', () => {
    const strokes: readonly Stroke[] = [
      { id: 'first', points: [{ x: 0, y: 0, t: 0 }, { x: 1, y: 0.5, t: 1000 }] },
      { id: 'second', points: [{ x: 0.2, y: 0.8, t: 1000 }] },
    ];
    expect(strokesAtProgress(strokes, 0.5)).toEqual([
      { id: 'first', points: [{ x: 0, y: 0, t: 0 }, { x: 0.5, y: 0.25, t: 500 }] },
    ]);
    expect(strokesAtProgress(strokes, 1)).toEqual(strokes);
    expect(strokesAtProgress(strokes, -2)).toEqual([{ id: 'first', points: [{ x: 0, y: 0, t: 0 }] }]);
  });

  it('assigns monotonic synthetic timestamps to untimed source paths', () => {
    const result = createTimedStrokes('sample', [
      [[0.1, 0.2], [0.3, 0.4], [0.5, 0.4]],
      [[0.5, 0.5], [0.7, 0.8]],
    ], 900);
    expect(result).toHaveLength(2);
    expect(result[0].points[0].t).toBe(0);
    expect(result[0].points.at(-1)!.t).toBeLessThan(result[1].points[0].t);
    expect(result[1].points.at(-1)!.t).toBe(900);
    expect(getPlaybackDuration(result)).toBe(900);
  });
});
