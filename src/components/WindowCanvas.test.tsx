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

it('reuses input capture on a neutral surface without mounting the character', () => {
  const onInputTypeChange = vi.fn();
  render(<WindowCanvas {...props({ variant: 'neutral', onInputTypeChange })} />);
  expect(screen.queryByTestId('character-scene')).toBeNull();
  expect(screen.getByTestId('window-canvas').getAttribute('data-variant')).toBe('neutral');
  fireEvent(screen.getByTestId('window-drawing-canvas'), pointer('pointerdown', { pointerType: 'touch' }));
  expect(onInputTypeChange).toHaveBeenCalledWith('touch');
});

it('changes character from neutral to curious at first player mark and back after clear', () => {
  const firstMark: Stroke[] = [{ id: 'mark', points: [{ x: 0.2, y: 0.3, t: 0 }] }];
  const { rerender } = render(<WindowCanvas {...props({ mode: 'day', phase: 'player_drawing', strokes: [] })} />);
  expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');

  rerender(<WindowCanvas {...props({ mode: 'day', phase: 'player_drawing', strokes: firstMark })} />);
  expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');

  rerender(<WindowCanvas {...props({ mode: 'night', phase: 'player_drawing', strokes: firstMark, reducedMotion: true })} />);
  expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');
  expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');

  rerender(<WindowCanvas {...props({ mode: 'night', phase: 'player_drawing', strokes: [] })} />);
  expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');
});

it('keeps a captured finger stroke when another primary-marked pointer arrives', () => {
  const onStrokesChange = vi.fn();
  render(<WindowCanvas {...props({ onStrokesChange })} />);
  const canvas=screen.getByTestId('window-drawing-canvas');
  fireEvent(canvas,pointer('pointerdown',{pointerId:7,clientX:50,clientY:180}));
  fireEvent(canvas,pointer('pointerdown',{pointerId:9,clientX:290,clientY:400}));
  fireEvent(canvas,pointer('pointermove',{pointerId:7,clientX:110,clientY:220}));
  fireEvent(canvas,pointer('pointerup',{pointerId:7,clientX:110,clientY:220}));
  const result=onStrokesChange.mock.calls.at(-1)?.[0] as Stroke[];
  expect(result).toHaveLength(1);
  expect(result[0].points.at(-1)?.x).toBeCloseTo(.3125);
  expect(document.querySelector('.window-canvas__finger')).toBeNull();
});

it('removes the contact cue immediately when pointer capture is lost', () => {
  render(<WindowCanvas {...props()} />);
  const canvas=screen.getByTestId('window-drawing-canvas');
  fireEvent(canvas,pointer('pointerdown',{clientX:50,clientY:180}));
  expect(document.querySelector('.window-canvas__finger')).toBeTruthy();
  fireEvent(canvas,pointer('lostpointercapture'));
  expect(document.querySelector('.window-canvas__finger')).toBeNull();
});

function installFrameClock() {
  let currentTime = 0;
  let nextId = 0;
  const pending = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = ++nextId;
    pending.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => pending.delete(id)));
  return {
    pending,
    at(time: number) {
      currentTime = time;
      const frame = [...pending.entries()];
      pending.clear();
      act(() => frame.forEach(([, callback]) => callback(time)));
    },
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
  it.each(['pointer', 'keyboard'] as const)('does not resurrect an externally undone in-progress %s stroke', input => {
    const onStrokesChange = vi.fn();
    const base = props({ onStrokesChange });
    const { rerender } = render(<WindowCanvas {...base} />);
    const canvas = screen.getByTestId('window-drawing-canvas');
    if (input === 'pointer') fireEvent(canvas, pointer('pointerdown', { clientX: 80, clientY: 200 }));
    else { fireEvent.keyDown(canvas, { key: ' ' }); fireEvent.keyDown(canvas, { key: 'ArrowRight' }); }
    const published = onStrokesChange.mock.lastCall![0] as Stroke[];
    rerender(<WindowCanvas {...base} strokes={structuredClone(published)} />);
    rerender(<WindowCanvas {...base} strokes={[]} />);
    onStrokesChange.mockClear();
    if (input === 'pointer') { fireEvent(canvas, pointer('pointermove', { clientX: 160, clientY: 300 })); fireEvent(canvas, pointer('pointerup', { clientX: 180, clientY: 310 })); }
    else { fireEvent.keyDown(canvas, { key: 'ArrowDown' }); fireEvent.keyUp(canvas, { key: ' ' }); }
    expect(onStrokesChange).not.toHaveBeenCalled();
    expect(canvas.getAttribute('data-has-strokes')).toBe('false');
  });

  it('shows the keyboard pen position and contact state, and hides it on blur or turn change', () => {
    const base = props();
    const { rerender } = render(<WindowCanvas {...base} />);
    const canvas = screen.getByTestId('window-drawing-canvas');
    fireEvent.focus(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    const cursor = screen.getByTestId('keyboard-cursor');
    expect(parseFloat(cursor.style.left)).toBeCloseTo(168);
    expect(cursor.getAttribute('data-drawing')).toBe('false');
    fireEvent.keyDown(canvas, { key: ' ' });
    expect(cursor.getAttribute('data-drawing')).toBe('true');
    fireEvent.keyUp(canvas, { key: ' ' });
    expect(cursor.getAttribute('data-drawing')).toBe('false');
    fireEvent.blur(canvas);
    expect(screen.queryByTestId('keyboard-cursor')).toBeNull();
    fireEvent.focus(canvas);
    rerender(<WindowCanvas {...base} phase="recognizing" />);
    expect(screen.queryByTestId('keyboard-cursor')).toBeNull();
  });

  it('localizes the drawing prompt and keyboard instructions without answer data', () => {
    render(<WindowCanvas {...props({ language: 'ja' })} />);
    expect(screen.getByTestId('window-drawing-hint').textContent).toBe('ここに描こう');
    expect(screen.getByTestId('window-drawing-canvas').getAttribute('aria-label')).toContain('矢印キー');
  });
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

  it.each([{ mode: 'day', duration: 650 }, { mode: 'night', duration: 280 }] as const)('pauses normal $mode refog and completes once after resume, resize, and motion preference changes', ({ mode, duration }) => {
    const clock = installFrameClock();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const onBreathDone = vi.fn();
    const initial = props({ mode, phase: 'girl_breath', round: 2, onBreathDone });
    const { rerender, unmount } = render(<WindowCanvas {...initial} />);
    clock.at(100);
    expect(onBreathDone).not.toHaveBeenCalled();
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(clock.pending.size).toBe(0);
    clock.at(20_000);
    expect(onBreathDone).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    clock.at(20_000 + duration - 101);
    expect(onBreathDone).not.toHaveBeenCalled();
    clock.at(20_000 + duration - 100);
    expect(onBreathDone).toHaveBeenCalledTimes(1);
    expect(clock.pending.size).toBe(0);
    act(() => window.dispatchEvent(new Event('resize')));
    rerender(<WindowCanvas {...initial} reducedMotion />);
    expect(clock.pending.size).toBe(0);
    expect(onBreathDone).toHaveBeenCalledTimes(1);
    unmount();
    expect(clock.pending.size).toBe(0);
  });

  it.each(['girl_holding', 'player_drawing', 'recognizing', 'recognition_error'] as const)('keeps %s ink and does not start a timer after visibility changes', phase => {
    const clock = installFrameClock();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const initial = props({ phase, strokes: [{ id: 'kept', points: [{ x: 0.3, y: 0.6, t: 0 }] }] });
    render(<WindowCanvas {...initial} />);
    expect(clock.pending.size).toBe(0);
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    clock.at(100_000);
    expect(clock.pending.size).toBe(0);
    expect(screen.getByTestId('window-drawing-canvas').getAttribute('data-has-strokes')).toBe('true');
    expect(initial.onBreathDone).not.toHaveBeenCalled();
    expect(initial.onPlaybackDone).not.toHaveBeenCalled();
  });

  it('cancels unfinished playback on unmount', () => {
    const clock = installFrameClock();
    const onPlaybackDone = vi.fn();
    const { unmount } = render(<WindowCanvas {...props({ phase: 'girl_drawing', onPlaybackDone })} />);
    expect(clock.pending.size).toBe(1);
    unmount();
    expect(clock.pending.size).toBe(0);
    clock.at(2000);
    expect(onPlaybackDone).not.toHaveBeenCalled();
  });

  it('uses the visible ink endpoint and the resized square for the girl contact cursor, hiding it on lifts and completion', () => {
    const clock = installFrameClock();
    let width = 320;
    let height = 440;
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(() => box(10, 20, width, height));
    const strokes: Stroke[] = [
      { id: 'first', points: [{ x: 0.1, y: 0.2, t: 0 }, { x: 0.5, y: 0.6, t: 400 }] },
      { id: 'second', points: [{ x: 0.8, y: 0.3, t: 600 }, { x: 0.8, y: 0.9, t: 1000 }] },
    ];
    const onPlaybackDone = vi.fn();
    render(<WindowCanvas {...props({ phase: 'girl_drawing', strokes, onPlaybackDone })} />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    // After the shared 14% hesitation, 31.2% of wall time exposes 20% of the ink.
    clock.at(312);
    let tip = screen.getByTestId('stroke-tip-overlay');
    expect(parseFloat(tip.style.left)).toBeCloseTo(96);
    expect(parseFloat(tip.style.top)).toBeCloseTo(248);
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    width = 400;
    height = 500;
    act(() => window.dispatchEvent(new Event('resize')));
    tip = screen.getByTestId('stroke-tip-overlay');
    expect(parseFloat(tip.style.left)).toBeCloseTo(120);
    expect(parseFloat(tip.style.top)).toBeCloseTo(260);
    clock.at(570); // Ink time 500ms lies between the two recorded gestures.
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    clock.at(700);
    expect(parseFloat(screen.getByTestId('stroke-tip-overlay').style.left)).toBeCloseTo(320);
    clock.at(1000);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    expect(onPlaybackDone).toHaveBeenCalledTimes(1);
    expect(clock.pending.size).toBe(0);
  });
});

it('replays breath and drawing in the same round after a slip, including a NIGHT breath pose', () => {
  const clock = installFrameClock();
  const ink: Stroke[] = [{id:'old',points:[{x:.2,y:.3,t:0},{x:.7,y:.6,t:900}]}];
  const base = props({mode:'night',round:2,strokes:ink,previousStrokes:ink});
  const {rerender} = render(<WindowCanvas {...base} phase="girl_breath"/>);
  expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('breath');
  clock.at(300); expect(base.onBreathDone).toHaveBeenCalledTimes(1);
  rerender(<WindowCanvas {...base} phase="girl_drawing"/>);
  clock.at(1300);expect(base.onPlaybackDone).toHaveBeenCalledTimes(1);
  rerender(<WindowCanvas {...base} phase="girl_notice"/>);
  rerender(<WindowCanvas {...base} phase="girl_flustered"/>);
  rerender(<WindowCanvas {...base} phase="girl_breath"/>);
  clock.at(1600);expect(base.onBreathDone).toHaveBeenCalledTimes(2);
  rerender(<WindowCanvas {...base} phase="girl_drawing"/>);
  clock.at(2600);expect(base.onPlaybackDone).toHaveBeenCalledTimes(2);
});
