import type { Mode, Stroke } from '../core/types';
import { drawStrokes } from './strokes';

/** Presentation only. Never use these widths or wet edges for inference exports. */
export function wipeCondensation(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], size: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const [widthScale, opacity] of [[2.5, 0.18], [2.12, 0.42], [1.8, 1]]) {
    ctx.globalAlpha = opacity;
    drawStrokes(ctx, strokes, size, size, { color: '#000', widthScale });
  }
  ctx.restore();
}

/** A hollow meniscus: the middle stays fully transparent, even over dark hair. */
export function drawWetEdges(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], size: number, mode: Mode): void {
  ctx.save();
  // A thin cool lower rim supports pale sleeves; the opposite highlight supports
  // dark hair. Keep the full 1.8-wide center clear instead of filling it with ink.
  drawStrokes(ctx, strokes, size, size, { color: mode === 'day' ? 'rgba(34,66,79,.46)' : 'rgba(34,66,79,.26)', widthScale: 2.32 });
  ctx.save();
  ctx.translate(-0.4, -0.55);
  drawStrokes(ctx, strokes, size, size, { color: mode === 'day' ? 'rgba(250,255,253,.64)' : 'rgba(234,247,255,.74)', widthScale: 2.14 });
  ctx.restore();
  ctx.globalCompositeOperation = 'destination-out';
  drawStrokes(ctx, strokes, size, size, { color: '#000', widthScale: 1.8 });
  ctx.restore();
}
