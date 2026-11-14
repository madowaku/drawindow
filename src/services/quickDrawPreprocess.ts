import type { Stroke } from '../core/types';

/**
 * Google QuickDraw's canonical numpy bitmap renderer uses a black (0)
 * background and light (1) foreground strokes. KashifKhn's train.py feeds
 * the bitmap's raw uint8/255 values into its model without inversion.
 * The model's README's prose describes the opposite polarity; the training
 * code and the original dataset rasterizer are the authoritative contract.
 *
 * 'legacy' is retained ONLY for reproducible A/B comparisons with v0.8.
 */
export interface QuickDrawPreprocessOptions {
  polarity?: 'training' | 'legacy';
  /** Supersampling 4x: 3 means a ~1.5px-wide 28x28 stroke. */
  strokeRadiusHiRes?: number;
  /** Padding in 28x28 output pixels. */
  paddingPx?: number;
  /** Research comparison: retain position and absolute input scale. */
  normalization?: 'bounds' | 'canvas';
}

const SIDE = 28, HI = 4, LARGE = SIDE * HI;
const MAX_POINTS = 16000;

export function preprocessQuickDraw(
  strokes: readonly Stroke[],
  options: QuickDrawPreprocessOptions = {},
): Float32Array | null {
  if (!Array.isArray(strokes) || !strokes.length || strokes.length > 256) return null;
  const radius = options.strokeRadiusHiRes ?? 3;
  const padding = options.paddingPx ?? 2.5;
  // Bounds limit CPU and prevent silent invalid/raster garbage.
  if (!Number.isInteger(radius) || radius < 1 || radius > 8 ||
      !Number.isFinite(padding) || padding < 0 || padding > 8) return null;

  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke?.points)) return null;
    for (const point of stroke.points) {
      if (!point || ++count > MAX_POINTS || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
  }
  if (count < 2) return null;
  const span = Math.max(maxX - minX, maxY - minY);
  if (span < .015) return null;
  const preserveCanvas = import.meta.env.DEV && options.normalization === 'canvas';
  if (preserveCanvas) { minX = 0; minY = 0; maxX = 1; maxY = 1; }
  const scale = (SIDE - 2 * padding) * HI / (preserveCanvas ? 1 : span);
  const originX = (LARGE - (maxX - minX) * scale) / 2;
  const originY = (LARGE - (maxY - minY) * scale) / 2;
  const bits = new Uint8Array(LARGE * LARGE);
  const r2 = radius * radius;
  const mark = (x: number, y: number) => {
    const cx = Math.round(x), cy = Math.round(y);
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const xx = cx + dx, yy = cy + dy;
      if (xx >= 0 && xx < LARGE && yy >= 0 && yy < LARGE) bits[yy * LARGE + xx] = 1;
    }
  };
  for (const stroke of strokes) {
    let previous: { x: number; y: number } | null = null;
    for (const point of stroke.points) {
      const current = { x: originX + (point.x - minX) * scale, y: originY + (point.y - minY) * scale };
      if (previous) {
        const length = Math.hypot(current.x - previous.x, current.y - previous.y);
        const steps = Math.max(1, Math.ceil(length / 1.5));
        for (let k = 0; k <= steps; k++) {
          mark(previous.x + (current.x - previous.x) * k / steps,
            previous.y + (current.y - previous.y) * k / steps);
        }
      } else mark(current.x, current.y);
      previous = current;
    }
  }

  const output = new Float32Array(SIDE * SIDE);
  const inverted = options.polarity === 'legacy';
  for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
    let foreground = 0;
    for (let yy = 0; yy < HI; yy++) for (let xx = 0; xx < HI; xx++)
      foreground += bits[(y * HI + yy) * LARGE + (x * HI + xx)];
    const ink = foreground / (HI * HI);
    output[y * SIDE + x] = inverted ? 1 - ink : ink;
  }
  return output;
}
