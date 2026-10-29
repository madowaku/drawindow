// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { DrawingRecognizer, RecognitionResult, WindowCanvasProps } from './core/types';

vi.mock('./components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div data-testid="canvas-contract">
  {props.phase === 'girl_breath' && <button onClick={props.onBreathDone}>Test complete breath</button>}
  {props.phase === 'girl_drawing' && <button onClick={props.onPlaybackDone}>Test complete playback</button>}
  {props.phase === 'player_drawing' && <button onClick={() => props.onStrokesChange([{ id: 'test', points: [{ x: .2, y: .2, t: 0 }, { x: .6, y: .6, t: 100 }] }])}>Test draw</button>}
</div> }));
vi.mock('./services/quickDrawRecognizer', () => ({ createQuickDrawRecognizer: () => ({ recognize: async () => ({ guess: null, source: 'ml' }) }), preloadQuickDrawModel: async () => undefined }));

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_OFFLINE_EDITION', 'true');
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

async function failWith(result: RecognitionResult) {
  const recognize = vi.fn(async () => result);
  const recognizer: DrawingRecognizer = { recognize };
  render(<App mlRecognizer={recognizer} />);
  fireEvent.click(screen.getByRole('button', { name: '日本語' }));
  fireEvent.click(screen.getByRole('button', { name: /はじめる/ }));
  await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath'));
  fireEvent.click(screen.getByRole('button', { name: 'Test complete breath' }));
  fireEvent.click(screen.getByRole('button', { name: 'Test complete playback' }));
  fireEvent.click(await screen.findByRole('button', { name: /あなたの番/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Test draw' }));
  fireEvent.click(screen.getByRole('button', { name: /できた/ }));
  await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('recognition_error'));
  return recognize;
}

describe('a local recognition miss is not a dead end', () => {
  it('speaks as Shizuku, offers no identical retry, and makes adding lines the main action', async () => {
    const recognize = await failWith({ guess: null, source: 'ml', errorCode: 'invalid_response', failureReason: 'low_score', error: 'low' });
    expect(document.querySelector('.error-actions [role=alert]')?.textContent).toBe('何に見えるか、まだ迷っているみたい。線を少し足してみても大丈夫。');
    expect(screen.queryByRole('button', { name: 'もう一度' })).toBeNull();
    const back = screen.getByRole('button', { name: /線を足す・描き直す/ });
    expect(back.className).toBe('primary');
    fireEvent.click(back);
    expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('player_drawing');
    expect(recognize).toHaveBeenCalledTimes(1);
  });

  it('still offers a retry when the model itself could not run', async () => {
    await failWith({ guess: null, source: 'ml', errorCode: 'unavailable', failureReason: 'model_unavailable', error: 'load' });
    expect(document.querySelector('.error-actions [role=alert]')?.textContent).toBe('今はうまく見られなかったみたい。絵は残っています。');
    expect(screen.getByRole('button', { name: 'もう一度' }).className).toBe('primary');
    expect(screen.getByRole('button', { name: /線を足す・描き直す/ }).className).toBe('text-button');
  });
});
