import type { GamePhase, Mode } from '../core/types';
import { clampPlaybackDuration, DEFAULT_SKETCH_PLAYBACK_MS } from './playback';
import { characterPortraitRect } from './character';

/** Maps the BREATH sprite's lips through the same bottom-center portrait as CSS. */
export function getBreathOrigin(width: number, height: number): { x: number; y: number } {
  const safeWidth = Math.max(0, Number.isFinite(width) ? width : 0);
  const safeHeight = Math.max(0, Number.isFinite(height) ? height : 0);
  const rect = characterPortraitRect(safeWidth, safeHeight);
  const originX = rect.left + rect.width * 0.55;
  const originY = rect.top + rect.height * 0.49;

  return {
    x: Math.min(safeWidth, Math.max(0, originX)),
    y: Math.min(safeHeight, Math.max(0, originY)),
  };
}

export interface FogTimeline {
  mode: Mode;
  phase: GamePhase;
  durationMs: number;
  elapsedMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  completed: boolean;
}

export interface FogAdvance {
  timeline: FogTimeline;
  progress: number;
  completedNow: boolean;
}

export function isTimedCanvasPhase(phase: GamePhase): boolean {
  return phase === 'girl_breath' || phase === 'girl_drawing';
}

export function fogAnimationDuration(
  mode: Mode,
  phase: GamePhase,
  reducedMotion: boolean,
  playbackDurationMs = DEFAULT_SKETCH_PLAYBACK_MS,
): number {
  if (!isTimedCanvasPhase(phase) || reducedMotion) return 0;
  if (phase === 'girl_breath') return mode === 'day' ? 650 : 280;
  return clampPlaybackDuration(playbackDurationMs);
}

export function createFogTimeline(
  mode: Mode,
  phase: GamePhase,
  now: number,
  options: { reducedMotion?: boolean; playbackDurationMs?: number } = {},
): FogTimeline {
  const timed = isTimedCanvasPhase(phase);
  return {
    mode,
    phase,
    durationMs: fogAnimationDuration(mode, phase, options.reducedMotion ?? false, options.playbackDurationMs),
    elapsedMs: 0,
    startedAt: timed ? now : null,
    pausedAt: null,
    completed: !timed,
  };
}

export function fogTimelineProgress(timeline: FogTimeline, now: number): number {
  if (timeline.completed || !isTimedCanvasPhase(timeline.phase)) return 1;
  if (timeline.pausedAt !== null) {
    return timeline.durationMs === 0 ? 0 : Math.min(1, timeline.elapsedMs / timeline.durationMs);
  }
  if (timeline.durationMs === 0) return 1;
  const elapsed = timeline.elapsedMs + Math.max(0, now - (timeline.startedAt ?? now));
  return Math.min(1, elapsed / timeline.durationMs);
}

export function advanceFogTimeline(timeline: FogTimeline, now: number): FogAdvance {
  const progress = fogTimelineProgress(timeline, now);
  const completedNow = isTimedCanvasPhase(timeline.phase) && !timeline.completed && progress >= 1 && timeline.pausedAt === null;
  if (!completedNow) return { timeline, progress, completedNow: false };
  return {
    timeline: {
      ...timeline,
      elapsedMs: timeline.durationMs,
      startedAt: null,
      completed: true,
    },
    progress: 1,
    completedNow: true,
  };
}

export function pauseFogTimeline(timeline: FogTimeline, now: number): FogTimeline {
  if (!isTimedCanvasPhase(timeline.phase) || timeline.completed || timeline.pausedAt !== null) return timeline;
  const elapsedMs = timeline.durationMs === 0
    ? 0
    : Math.min(timeline.durationMs, timeline.elapsedMs + Math.max(0, now - (timeline.startedAt ?? now)));
  return { ...timeline, elapsedMs, startedAt: null, pausedAt: now };
}

export function resumeFogTimeline(timeline: FogTimeline, now: number): FogTimeline {
  if (timeline.pausedAt === null || timeline.completed) return timeline;
  return { ...timeline, startedAt: now, pausedAt: null };
}
