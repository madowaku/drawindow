// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { GameState, WindowCanvasProps } from './core/types';
import { RECEIVE_MS } from './lib/drawingTempo';

vi.mock('./components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div data-testid="canvas-contract" data-phase={props.phase} data-strokes={props.strokes.length}>
  {props.phase === 'girl_breath' && <button onClick={props.onBreathDone}>Test complete breath</button>}
  {props.phase === 'girl_drawing' && <button onClick={props.onPlaybackDone}>Test complete playback</button>}
  {props.phase === 'player_drawing' && <button onClick={() => props.onStrokesChange([{ id: 'test', points: [{ x: .2, y: .2, t: 0 }, { x: .6, y: .6, t: 100 }] }])}>Test draw</button>}
</div> }));
vi.mock('./components/SketchThumbnail', () => ({ SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));

const phase = () => document.querySelector('main')?.getAttribute('data-phase');

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_RECOGNITION_URL', '');
  vi.stubEnv('VITE_ENABLE_LIVE_API', 'false');
  window.scrollTo = vi.fn();
  // Motion allowed: the receive beat applies.
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

async function reachDrawing() {
  await waitFor(() => expect(phase()).toBe('girl_breath'));
  fireEvent.click(screen.getByRole('button', { name: 'Test complete breath' }));
  fireEvent.click(screen.getByRole('button', { name: 'Test complete playback' }));
  fireEvent.click(await screen.findByRole('button', { name: /YOUR TURN/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Test draw' }));
}

// Each exchange waits the real receive beat, so a five-exchange case needs more than the default.
const REAL_TIME = 20000;

describe('she looks at the finished picture before answering', () => {
  it('keeps the player picture in front of her even when recognition is instant', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /PLAY DEMO/ }));
    await reachDrawing();
    const submitted = performance.now();
    fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    expect(phase()).toBe('recognizing');
    expect(screen.getByTestId('canvas-contract').getAttribute('data-strokes')).toBe('1');
    await new Promise(resolve => setTimeout(resolve, 200));
    // The demo answer is already available; the picture is still being looked at.
    expect(phase()).toBe('recognizing');
    await waitFor(() => expect(phase()).toBe('girl_breath'), { timeout: 3000 });
    expect(performance.now() - submitted).toBeGreaterThanOrEqual(RECEIVE_MS.day - 50);
  }, REAL_TIME);

  it('looks at the unrecognized fifth picture, then asks for its name', async () => {
    let current: GameState | undefined;
    render(<App onStateChange={state => { current = state; }} />);
    fireEvent.click(screen.getByRole('button', { name: /PLAY DEMO/ }));
    for (let round = 1; round <= 4; round++) {
      await reachDrawing();
      fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    }
    await reachDrawing();
    fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    expect(screen.getByRole('heading', { name: 'Your last reply.' })).toBeTruthy();
    expect(screen.getByText('SHE IS LOOKING')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^DONE/ })).toBeNull();
    // Input is closed while she looks; no recognition request is made.
    expect(screen.getByTestId('canvas-contract').getAttribute('data-phase')).toBe('recognizing');
    expect(current!.phase).toBe('player_drawing');
    expect(current!.recognitionRequest).toBeNull();
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(5), { timeout: 3000 });
    expect(current!.entries.at(-1)!.recognition).toBeNull();
  }, REAL_TIME);

  it('cancels the final look when the player leaves', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /PLAY DEMO/ }));
    for (let round = 1; round <= 4; round++) {
      await reachDrawing();
      fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    }
    await reachDrawing();
    fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAWINDOW home' }));
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO TITLE' }));
    await new Promise(resolve => setTimeout(resolve, RECEIVE_MS.day + 300));
    expect(phase()).toBe('title');
    expect(screen.queryByRole('textbox')).toBeNull();
  }, REAL_TIME);
});
