import { describe, expect, it, vi } from 'vitest';
import type { Stroke } from '../core/types';
import { drawStrokes, normalizePointerPoint, normalizeStrokes, renderDrawingDataUrl } from './strokes';

function mockContext() {
  const ctx = {
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(), setTransform: vi.fn(),
    lineCap: '', lineJoin: '', lineWidth: 0, strokeStyle: '', fillStyle: '',
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('normalized strokes', () => {
  it('maps pointer input into bounded drawing-relative coordinates and keeps pressure when present', () => {
    expect(normalizePointerPoint(45, 130, { left: 20, top: 30, width: 100, height: 200 }, 44, 0.7)).toEqual({
      x: 0.25, y: 0.5, t: 44, pressure: 0.7,
    });
    expect(normalizePointerPoint(-50, 400, { left: 0, top: 0, width: 100, height: 100 }, -1)).toEqual({
      x: 0, y: 1, t: 0,
    });
  });

  it('copies and sanitizes paths without mutating the supplied drawing', () => {
    const original: readonly Stroke[] = [{ id: 'one', points: [
      { x: -0.2, y: 1.4, t: -4, pressure: 1.5 },
      { x: Number.NaN, y: 0.5, t: 8 },
      { x: 0.25, y: 0.75, t: 12, pressure: 0.4 },
    ] }];
    expect(normalizeStrokes(original)).toEqual([{ id: 'one', points: [
      { x: 0, y: 1, t: 0, pressure: 1 },
      { x: 0.25, y: 0.75, t: 12, pressure: 0.4 },
    ] }]);
    expect(original[0].points[0].x).toBe(-0.2);
  });

  it('renders a one-point tap as a visible round mark', () => {
    const ctx = mockContext();
    drawStrokes(ctx, [{ id: 'tap', points: [{ x: 0.5, y: 0.25, t: 0 }] }], 200, 100);
    expect(ctx.arc).toHaveBeenCalledWith(100, 25, expect.any(Number), 0, Math.PI * 2);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('keeps the glass edge close to a thinner ink line', () => {
    const ctx = mockContext();
    const widths: number[] = [];
    Object.defineProperty(ctx, 'lineWidth', {
      configurable: true,
      set: (value: number) => widths.push(value),
    });
    drawStrokes(ctx, [{ id: 'line', points: [{ x: 0.1, y: 0.5, t: 0 }, { x: 0.9, y: 0.5, t: 80 }] }], 320, 320, {
      color: '#152a32',
      edgeColor: '#ffffff',
      widthScale: 0.96,
      edgeWidthScale: 0.002,
    });
    expect(widths).toEqual([3.712, 3.072]);
  });

  it('exports a neutral white-background PNG at the requested size', () => {
    const ctx = mockContext();
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx), toDataURL: vi.fn(() => 'data:image/png;base64,neutral') };
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    try {
      expect(renderDrawingDataUrl([{ id: 'mark', points: [{ x: 0.5, y: 0.5, t: 0 }] }], 256)).toBe('data:image/png;base64,neutral');
      expect(canvas.width).toBe(256);
      expect(canvas.height).toBe(256);
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 256, 256);
      expect(ctx.strokeStyle).toBe('#111111');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
