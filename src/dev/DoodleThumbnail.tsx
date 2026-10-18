import { useEffect, useRef } from 'react';
import type { Mode, Stroke } from '../core/types';
import { drawFrost } from '../components/WindowCanvas';
import { drawWetEdges, wipeCondensation } from '../lib/glass';
import { drawStrokes } from '../lib/strokes';

/** Static study tile. The expanded window also includes the in-game character. */
export function DoodleThumbnail({ strokes, mode, fog }: { strokes: readonly Stroke[]; mode: Mode; fog: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 300, 300);
    if (fog) {
      drawFrost(ctx, 300, 300, mode, 'girl_holding', 1, true);
      wipeCondensation(ctx, strokes, 300);
      drawWetEdges(ctx, strokes, 300, mode);
    } else {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 300);
      drawStrokes(ctx, strokes, 300, 300);
    }
  }, [strokes, mode, fog]);
  return <canvas className="doodle-thumbnail" ref={canvas} width={300} height={300} aria-hidden="true" />;
}
