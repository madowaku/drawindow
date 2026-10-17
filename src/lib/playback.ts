import type { Stroke, StrokePoint } from '../core/types';
import { normalizeStrokes } from './strokes';

export const MIN_SKETCH_PLAYBACK_MS = 500;
export const MAX_SKETCH_PLAYBACK_MS = 1500;
export const DEFAULT_SKETCH_PLAYBACK_MS = 900;

export function clampPlaybackDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return DEFAULT_SKETCH_PLAYBACK_MS;
  return Math.min(MAX_SKETCH_PLAYBACK_MS, Math.max(MIN_SKETCH_PLAYBACK_MS, durationMs));
}

/** Gets the shared replay length encoded by stroke timestamps. */
export function getPlaybackDuration(strokes: readonly Stroke[]): number {
  let lastTime = 0;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      if (Number.isFinite(point.t)) lastTime = Math.max(lastTime, point.t);
    }
  }
  return clampPlaybackDuration(lastTime > 0 ? lastTime : DEFAULT_SKETCH_PLAYBACK_MS);
}

/**
 * Returns the path portion visible at a normalized time. The last segment is
 * interpolated, so playback never jumps from one recorded point to the next.
 */
export function strokesAtProgress(strokes: readonly Stroke[], progress: number): readonly Stroke[] {
  const safeStrokes = normalizeStrokes(strokes);
  const amount = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  let lastTime = 0;
  for (const stroke of safeStrokes) {
    for (const point of stroke.points) lastTime = Math.max(lastTime, point.t);
  }
  if (lastTime <= 0) return amount >= 1 ? safeStrokes : [];
  const targetTime = lastTime * amount;

  return safeStrokes.flatMap((stroke): Stroke[] => {
    const source = stroke.points;
    if (source[0].t > targetTime) return [];
    const visible: StrokePoint[] = [source[0]];
    for (let index = 1; index < source.length; index += 1) {
      const previous = source[index - 1];
      const next = source[index];
      if (next.t <= targetTime) {
        visible.push(next);
        continue;
      }
      if (previous.t < targetTime && next.t > previous.t) {
        const ratio = (targetTime - previous.t) / (next.t - previous.t);
        visible.push({
          x: previous.x + (next.x - previous.x) * ratio,
          y: previous.y + (next.y - previous.y) * ratio,
          t: targetTime,
          ...(previous.pressure !== undefined && next.pressure !== undefined
            ? { pressure: previous.pressure + (next.pressure - previous.pressure) * ratio }
            : {}),
        });
      }
      break;
    }
    return [{ id: stroke.id, points: visible }];
  });
}

/**
 * Adds deterministic synthetic timing to simplified Quick, Draw! paths. Stroke
 * breaks get a short pause, while point timing follows the original path length.
 */
export function createTimedStrokes(
  idPrefix: string,
  paths: readonly (readonly (readonly [number, number])[])[],
  durationMs = DEFAULT_SKETCH_PLAYBACK_MS,
): readonly Stroke[] {
  const duration = clampPlaybackDuration(durationMs);
  const validPaths = paths.filter(path => path.length > 0);
  if (validPaths.length === 0) return [];
  const pauseMs = validPaths.length > 1 ? Math.min(35, duration / (validPaths.length * 4)) : 0;
  const motionMs = Math.max(1, duration - pauseMs * (validPaths.length - 1));
  const pathLengths = validPaths.map(path => {
    let length = 0;
    for (let index = 1; index < path.length; index += 1) {
      const dx = path[index][0] - path[index - 1][0];
      const dy = path[index][1] - path[index - 1][1];
      length += Math.hypot(dx, dy);
    }
    return length;
  });
  const totalLength = pathLengths.reduce((sum, length) => sum + length, 0);
  const equalPathWeight = 1 / validPaths.length;
  let elapsedMotion = 0;

  return validPaths.map((path, pathIndex) => {
    const pathDuration = motionMs * (totalLength > 0 ? pathLengths[pathIndex] / totalLength : equalPathWeight);
    let traversed = 0;
    const totalPathLength = pathLengths[pathIndex];
    const points: StrokePoint[] = path.map(([x, y], pointIndex) => {
      if (pointIndex > 0) {
        traversed += Math.hypot(path[pointIndex][0] - path[pointIndex - 1][0], path[pointIndex][1] - path[pointIndex - 1][1]);
      }
      const fraction = totalPathLength > 0 ? traversed / totalPathLength : (path.length <= 1 ? 0 : pointIndex / (path.length - 1));
      return { x, y, t: elapsedMotion + pathDuration * fraction };
    });
    const stroke: Stroke = { id: `${idPrefix}-${pathIndex + 1}`, points };
    elapsedMotion += pathDuration + pauseMs;
    return stroke;
  });
}
