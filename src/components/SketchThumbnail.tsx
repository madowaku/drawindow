import { useEffect, useRef } from 'react';
import type { Stroke } from '../core/types';
import { drawStrokes } from '../lib/strokes';

export function SketchThumbnail({ strokes, label }: { strokes: readonly Stroke[]; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 200, 200);
    drawStrokes(ctx, strokes, 200, 200);
  }, [strokes]);
  return <canvas className="sketch-thumb" ref={canvas} width={200} height={200} role="img" aria-label={label} />;
}
