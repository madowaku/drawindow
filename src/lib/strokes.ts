import type { Stroke, StrokePoint } from '../core/types';

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StrokeRenderStyle {
  /** Ink color. The default is neutral, opaque ink for inference and thumbnails. */
  color?: string;
  /** Optional under-stroke that keeps glass marks readable over either scene. */
  edgeColor?: string;
  widthScale?: number;
  /** Extra edge thickness as a fraction of the shorter canvas side. */
  edgeWidthScale?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const finiteOr = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;

export function normalizePointerPoint(
  clientX: number,
  clientY: number,
  rect: CanvasRect,
  t: number,
  pressure?: number,
): StrokePoint {
  const width = Math.max(1, finiteOr(rect.width, 1));
  const height = Math.max(1, finiteOr(rect.height, 1));
  const point: StrokePoint = {
    x: clamp01((finiteOr(clientX, rect.left) - finiteOr(rect.left, 0)) / width),
    y: clamp01((finiteOr(clientY, rect.top) - finiteOr(rect.top, 0)) / height),
    t: Math.max(0, finiteOr(t, 0)),
  };
  if (pressure !== undefined && Number.isFinite(pressure) && pressure > 0) {
    point.pressure = clamp01(pressure);
  }
  return point;
}

/** Returns a safe, immutable copy with finite values and coordinates in 0..1. */
export function normalizeStrokes(strokes: readonly Stroke[]): readonly Stroke[] {
  return strokes.flatMap((stroke, index) => {
    const points = stroke.points.flatMap((point): StrokePoint[] => {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
      return [{
        x: clamp01(point.x),
        y: clamp01(point.y),
        t: Math.max(0, finiteOr(point.t, 0)),
        ...(point.pressure !== undefined && Number.isFinite(point.pressure) && point.pressure > 0
          ? { pressure: clamp01(point.pressure) }
          : {}),
      }];
    });
    if (points.length === 0) return [];
    return [{ id: stroke.id || `stroke-${index + 1}`, points }];
  });
}

function pathStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly StrokePoint[],
  width: number,
  height: number,
  lineWidth: number,
  color: string,
): void {
  if (points.length === 0) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x * width, points[0].y * height);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x * width, points[index].y * height);
  }
  if (points.length === 1) {
    ctx.arc(points[0].x * width, points[0].y * height, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

/** Draws normalized strokes into any logical canvas dimensions. */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  width: number,
  height: number,
  style: StrokeRenderStyle = {},
): void {
  const safeStrokes = normalizeStrokes(strokes);
  const size = Math.min(Math.max(1, width), Math.max(1, height));
  const inkWidth = Math.max(1.8, size * 0.01 * (style.widthScale ?? 1));
  ctx.save();
  for (const stroke of safeStrokes) {
    if (style.edgeColor) {
      const edgeWidth = Math.max(0, size * (style.edgeWidthScale ?? 0.002));
      pathStroke(ctx, stroke.points, width, height, inkWidth + edgeWidth, style.edgeColor);
    }
    pathStroke(ctx, stroke.points, width, height, inkWidth, style.color ?? '#101820');
  }
  ctx.restore();
}

/** Builds a neutral black-on-white inference image from marks alone. */
export function renderDrawingDataUrl(strokes: readonly Stroke[], size = 512): string {
  if (typeof document === 'undefined') throw new Error('Drawing image export requires a browser canvas.');
  const pixels = Math.floor(size);
  if (!Number.isFinite(pixels) || pixels < 32 || pixels > 2048) {
    throw new RangeError('Drawing image size must be between 32 and 2048 pixels.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = pixels;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pixels, pixels);
  drawStrokes(ctx, strokes, pixels, pixels, { color: '#111111', widthScale: 1.1 });
  return canvas.toDataURL('image/png');
}
