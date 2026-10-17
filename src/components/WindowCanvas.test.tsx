// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import type { Stroke, WindowCanvasProps } from '../core/types';
import { WindowCanvas } from './WindowCanvas';

const context = new Proxy({} as Record<string, any>, {
  get(target, property) {
    if (typeof property === 'symbol') return undefined;
    if (property === 'createRadialGradient') return () => ({ addColorStop: vi.fn() });
    if (!(property in target)) target[property] = vi.fn();
    return target[property];
  },
  set(target, property, value) {
    if (typeof property !== 'symbol') target[property] = value;
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

function box(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function pointer(type: string, values: Partial<PointerEvent> = {}): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.assign(event, {
    pointerId: 7, button: 0, isPrimary: true, clientX: 0, clientY: 0, pressure: 0,
    pointerType: 'mouse', ...values,
  });
  return event;
}

function props(overrides: Partial<WindowCanvasProps> = {}): WindowCanvasProps {
  return {
    mode: 'day', phase: 'player_drawing', strokes: [],
    onStrokesChange: vi.fn(), onBreathDone: vi.fn(), onPlaybackDone: vi.fn(), reducedMotion: false,
    ...overrides,
  };
}

let originalContext: PropertyDescriptor | undefined;
let originalCapture: PropertyDescriptor | undefined;
let originalHasCapture: PropertyDescriptor | undefined;
let originalReleaseCapture: PropertyDescriptor | undefined;

beforeEach(() => {
  originalContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
  originalCapture = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'setPointerCapture');
  originalHasCapture = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'hasPointerCapture');
  originalReleaseCapture = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'releasePointerCapture');
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: vi.fn(() => context) });
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'window-canvas') return box(10, 20, 320, 440);
    if (this.dataset.testid === 'window-drawing-canvas') return box(10, 140, 320, 320);
    return box(0, 0, 320, 440);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  const restore = (name: string, descriptor: PropertyDescriptor | undefined) => {
    if (descriptor) Object.defineProperty(HTMLCanvasElement.prototype, name, descriptor);
    else delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)[name];
  };
  restore('getContext', originalContext);
  restore('setPointerCapture', originalCapture);
  restore('hasPointerCapture', originalHasCapture);
  restore('releasePointerCapture', originalReleaseCapture);
});

describe('WindowCanvas input', () => {
  it('captures a pointer, includes coalesced samples, and preserves a single tap', () => {
    const onStrokesChange = vi.fn();
    render(<WindowCanvas {...props({ onStrokesChange })} />);
    const canvas = screen.getByTestId('window-drawing-canvas') as HTMLCanvasElement;
    expect(canvas.style.width).toBe('320px');
    expect(canvas.style.bottom).toBe('0px');

    fireEvent(canvas, pointer('pointerdown', { clientX: 74, clientY: 220, pressure: 0.5 }));
    expect(HTMLCanvasElement.prototype.setPointerCapture).toHaveBeenCalledWith(7);
    expect(onStrokesChange.mock.lastCall?.[0]).toEqual([{ id: expect.any(String), points: [{ x: 0.2, y: 0.25, t: expect.any(Number), pressure: 0.5 }] }]);

    const move = pointer('pointermove', { clientX: 202, clientY: 340, pressure: 0.6 });
    Object.defineProperty(move, 'getCoalescedEvents', { value: () => [pointer('pointermove', { clientX: 170, clientY: 300, pressure: 0.55 })] });
    fireEvent(canvas, move);
    const withCoalesced = onStrokesChange.mock.lastCall?.[0] as readonly Stroke[];
    expect(withCoalesced[0].points.map(point => [point.x, point.y])).toEqual([[0.2, 0.25], [0.5, 0.5], [0.6, 0.625]]);

    fireEvent(canvas, pointer('pointerup', { clientX: 202, clientY: 340, pressure: 0.6 }));
    const finalStrokes = onStrokesChange.mock.lastCall?.[0] as readonly Stroke[];
    expect(finalStrokes[0].points).toHaveLength(3);
    expect(HTMLCanvasElement.prototype.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('supports keyboard drawing without exposing any word or template label', () => {
    const onStrokesChange = vi.fn();
    render(<WindowCanvas {...props({ onStrokesChange })} />);
    const canvas = screen.getByTestId('window-drawing-canvas');
    expect(canvas.getAttribute('aria-label')).toContain('arrow keys');

    fireEvent.keyDown(canvas, { key: ' ' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyUp(canvas, { key: ' ' });
    const path = onStrokesChange.mock.lastCall?.[0] as readonly Stroke[];
    expect(path).toHaveLength(1);
    expect(path[0].points.map(point => [point.x, point.y])).toEqual([[0.5, 0.5], [0.525, 0.5]]);

    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect((onStrokesChange.mock.lastCall?.[0] as readonly Stroke[])).toHaveLength(2);
  });

  it('marks the square input area and hides its non-spoiler hint after the first stroke', () => {
    const emptyProps = props();
    const { rerender } = render(<WindowCanvas {...emptyProps} />);
    const canvas = screen.getByTestId('window-drawing-canvas');
    expect(canvas.className).toContain('is-interactive');
    const hint = screen.getByTestId('window-drawing-hint');
    expect(hint.textContent).toBe('DRAW HERE');
    expect(hint.getAttribute('aria-hidden')).toBe('true');

    rerender(<WindowCanvas {...props({ strokes: [{ id: 'first', points: [{ x: 0.5, y: 0.5, t: 0 }] }] })} />);
    expect(canvas.className).toContain('is-interactive');
    expect(screen.queryByTestId('window-drawing-hint')).toBeNull();
  });

  it('runs a reduced-motion breath callback once on the next animation frame', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onBreathDone = vi.fn();
    render(<WindowCanvas {...props({ phase: 'girl_breath', onBreathDone, reducedMotion: true })} />);
    expect(callbacks).toHaveLength(1);
    act(() => callbacks.shift()?.(16));
    expect(onBreathDone).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(0);
  });
});
