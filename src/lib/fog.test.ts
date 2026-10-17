import { describe, expect, it } from 'vitest';
import type { GamePhase } from '../core/types';
import { advanceFogTimeline, createFogTimeline, fogAnimationDuration, fogTimelineProgress, getBreathOrigin, pauseFogTimeline, resumeFogTimeline } from './fog';

describe('fog and animation timing', () => {
  it('places the breath cloud at the mouth after the portrait cover crop', () => {
    for (const [width, height] of [[328, 440], [1280, 720], [360, 800]]) {
      const origin = getBreathOrigin(width, height);
      expect(origin.x).toBeGreaterThanOrEqual(0);
      expect(origin.x).toBeLessThanOrEqual(width);
      expect(origin.y).toBeGreaterThanOrEqual(0);
      expect(origin.y).toBeLessThanOrEqual(height);
    }

    expect(getBreathOrigin(328, 440).x).toBeCloseTo(328 * 0.6);
    expect(getBreathOrigin(328, 440).y).toBeGreaterThan(440 * 0.4);
    expect(getBreathOrigin(1280, 720).y).toBeGreaterThan(720 * 0.6);
  });

  it('uses visible daytime breath, short night refog, and shared sketch timing', () => {
    expect(fogAnimationDuration('day', 'girl_breath', false)).toBe(650);
    expect(fogAnimationDuration('night', 'girl_breath', false)).toBe(280);
    expect(fogAnimationDuration('day', 'girl_drawing', false, 1120)).toBe(1120);
    expect(fogAnimationDuration('day', 'girl_breath', true)).toBe(0);
  });

  it('keeps held and in-progress drawings steady over time', () => {
    const stablePhases: GamePhase[] = ['girl_holding', 'player_drawing', 'recognizing', 'recognition_error'];
    for (const phase of stablePhases) {
      const timeline = createFogTimeline('day', phase, 100);
      expect(fogTimelineProgress(timeline, 100_000)).toBe(1);
      expect(advanceFogTimeline(timeline, 100_000).completedNow).toBe(false);
    }
  });

  it('resets progress when a new phase starts', () => {
    const breath = createFogTimeline('day', 'girl_breath', 0);
    expect(fogTimelineProgress(breath, 325)).toBe(0.5);
    const playback = createFogTimeline('day', 'girl_drawing', 325, { playbackDurationMs: 900 });
    expect(fogTimelineProgress(playback, 325)).toBe(0);
  });

  it('pauses offscreen, resumes from the same elapsed time, and completes once', () => {
    const started = createFogTimeline('day', 'girl_breath', 0);
    const paused = pauseFogTimeline(started, 250);
    expect(fogTimelineProgress(paused, 20_000)).toBeCloseTo(250 / 650);
    const resumed = resumeFogTimeline(paused, 20_000);
    expect(fogTimelineProgress(resumed, 20_399)).toBeCloseTo(649 / 650);
    expect(advanceFogTimeline(resumed, 20_399).completedNow).toBe(false);
    const finished = advanceFogTimeline(resumed, 20_400);
    expect(finished.progress).toBe(1);
    expect(finished.completedNow).toBe(true);
    expect(advanceFogTimeline(finished.timeline, 30_000).completedNow).toBe(false);
  });

  it('still completes reduced-motion transitions on the next clock advance', () => {
    const timeline = createFogTimeline('night', 'girl_drawing', 0, { reducedMotion: true });
    expect(fogTimelineProgress(timeline, 0)).toBe(1);
    const result = advanceFogTimeline(timeline, 16);
    expect(result.completedNow).toBe(true);
    expect(advanceFogTimeline(result.timeline, 32).completedNow).toBe(false);
  });
});
