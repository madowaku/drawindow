import type { Stroke } from './types';

/** Compare input publications by content: reducers copy data before storing it. */
export function sameStrokes(a: readonly Stroke[], b: readonly Stroke[]): boolean {
  return a === b || (a.length === b.length && a.every((stroke, index) => {
    const other = b[index];
    return stroke.id === other.id && stroke.points.length === other.points.length && stroke.points.every((point, pointIndex) => {
      const next = other.points[pointIndex];
      return point.x === next.x && point.y === next.y && point.t === next.t && point.pressure === next.pressure;
    });
  }));
}
