// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { girlSketches } from './data/sketches';
import type { GameState, WindowCanvasProps } from './core/types';

vi.mock('./components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div data-testid="canvas-contract" data-round={props.round}>
  {props.phase === 'girl_breath' && <button onClick={props.onBreathDone}>Test complete breath</button>}
  {props.phase === 'girl_drawing' && <button onClick={props.onPlaybackDone}>Test complete playback</button>}
  {props.phase === 'player_drawing' && <button onClick={() => props.onStrokesChange([{ id: 'test', points: [{ x: .2, y: .2, t: 0 }, { x: .6, y: .6, t: 100 }] }])}>Test draw</button>}
</div> }));
vi.mock('./components/SketchThumbnail', () => ({ SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_RECOGNITION_URL', '');
  vi.stubEnv('VITE_ENABLE_LIVE_API', 'false');
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

async function finishFive() {
  fireEvent.click(screen.getByRole('button', { name: /PLAY DEMO/ }));
  for (let round = 0; round < 5; round++) {
    await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath'));
    expect(screen.getByTestId('canvas-contract').getAttribute('data-round')).toBe(String(round + 1));
    fireEvent.click(screen.getByRole('button', { name: 'Test complete breath' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test complete playback' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    for (const sketch of girlSketches) expect(document.body.textContent).not.toMatch(new RegExp(`\\b${sketch.word}\\b`, 'i'));
    fireEvent.click(screen.getByRole('button', { name: /YOUR TURN/ }));
    expect((screen.getByRole('button', { name: /^DONE/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Test draw' }));
    fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
  }
  await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(5));
}

describe('integrated UI journey with controlled presentation callbacks', () => {
  it('runs four distinct API fixture responses, conceals guesses through naming, then reveals with no fifth call', async () => {
    vi.stubEnv('VITE_ENABLE_LIVE_API', 'true');
    const guesses = ['dog', 'house', 'fish', 'cat'];
    const recognize = vi.fn(async () => ({ guess: guesses[recognize.mock.calls.length - 1], source: 'api' as const }));
    let observed: GameState | undefined;
    render(<App apiRecognizer={{ recognize }} onStateChange={state => { observed = state; }} />);
    fireEvent.click(screen.getByRole('button', { name: /Use live API/ }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/ }));
    for (let round = 1; round <= 5; round++) {
      await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath'));
      fireEvent.click(screen.getByRole('button', { name: 'Test complete breath' }));
      fireEvent.click(screen.getByRole('button', { name: 'Test complete playback' }));
      expect(screen.getByText('LIVE API')).toBeTruthy();
      const accessible = [...document.querySelectorAll('[aria-label],[title]')].map(element => element.getAttribute('aria-label') + ' ' + element.getAttribute('title')).join(' ');
      for (const guess of guesses) expect(`${document.body.textContent} ${accessible}`).not.toMatch(new RegExp(`\\b${guess}\\b`, 'i'));
      expect(document.querySelectorAll('.score-strip,.interpretation,input')).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: /YOUR TURN/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Test draw' }));
      fireEvent.click(screen.getByRole('button', { name: /^DONE/ }));
    }
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(5));
    expect(recognize).toHaveBeenCalledTimes(4);
    for (const guess of guesses) expect(document.body.textContent).not.toMatch(new RegExp(`\\b${guess}\\b`, 'i'));
    screen.getAllByRole('textbox').forEach((input, i) => fireEvent.change(input, { target: { value: ['dog', 'house', 'fish', 'cat', 'tree'][i] } }));
    fireEvent.click(screen.getByRole('button', { name: /REVEAL OUR CHAIN/ }));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    expect(screen.getByText('Final drawing · not sent for recognition')).toBeTruthy();
    expect(observed!.entries.at(-1)?.recognition).toBeNull();
    expect(observed!.entries.filter(entry => entry.actor === 'player').slice(0, 4).map(entry => entry.recognition?.guess)).toEqual(guesses);
  });
  it('offers the local demo alone until a real API endpoint is configured', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /PLAY DEMO/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use live API/ })).toBeNull();
    expect(screen.getByText(/Simulated interpretations/)).toBeTruthy();
  });

  it('preserves the optional recognizer integration after endpoint configuration', () => {
    vi.stubEnv('VITE_RECOGNITION_URL', 'https://recognizer.example/api/recognize');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Use live API/ }));
    expect(screen.getByRole('button', { name: /START GAME/ })).toBeTruthy();
    expect(screen.getByText(/LIVE API/)).toBeTruthy();
  });

  it('finishes five exchanges without answer leaks, preserves raw label editing, reveals nine links and restarts', async () => {
    render(<App />);
    await finishFive();
    expect(screen.getByTestId('review-character').querySelector('[data-pose]')?.getAttribute('data-pose')).toBe('neutral');
    const labels = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(labels[0], { target: { value: 'ice ' } });
    expect(labels[0].value).toBe('ice ');
    fireEvent.change(labels[0], { target: { value: 'ice cream' } });
    expect(labels[0].value).toBe('ice cream');
    ['tree', 'egg', 'goat', 'rain'].forEach((word, i) => fireEvent.change(labels[i + 1], { target: { value: word } }));
    fireEvent.click(screen.getByRole('button', { name: /REVEAL OUR CHAIN/ }));
    expect(['smile', 'shy']).toContain(screen.getByTestId('results-character').querySelector('[data-pose]')?.getAttribute('data-pose'));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    expect(screen.getByText('9 of 9 possible links known')).toBeTruthy();
    expect(screen.getByText(/This result is not score-comparable/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ANOTHER WINDOW/ }));
    expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath');
  });

  it('leaves unknown intentions out of the denominator and retains NIGHT across title/restart', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /NIGHT/ }));
    await finishFive();
    fireEvent.click(screen.getByRole('button', { name: /REVEAL OUR CHAIN/ }));
    expect(screen.getByText('0 of 9 possible links known')).toBeTruthy();
    expect(document.querySelectorAll('.chain-link.unknown')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: /Back to the beginning/ }));
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('night');
    expect(localStorage.getItem('drawindow-mode')).toBe('night');
  });
});

describe('Japanese UI playthrough', () => {
  it('switches language, persists it and completes five demo exchanges without revealing answers early', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(document.querySelector('main')?.getAttribute('data-language')).toBe('ja');
    expect(localStorage.getItem('drawindow-language')).toBe('ja');
    fireEvent.click(screen.getByRole('button', { name: /デモで遊ぶ/ }));
    for (let round = 1; round <= 5; round++) {
      await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath'));
      fireEvent.click(screen.getByRole('button', { name: 'Test complete breath' }));
      fireEvent.click(screen.getByRole('button', { name: 'Test complete playback' }));
      expect(screen.queryByRole('textbox')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /あなたの番/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Test draw' }));
      fireEvent.click(screen.getByRole('button', { name: /できた/ }));
    }
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(5));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'ゴリラ' } });
    fireEvent.click(screen.getByRole('button', { name: /答えあわせ/ }));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    expect(screen.getByText('ごりら')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /最初に戻る/ }));
    expect(document.querySelector('main')?.getAttribute('data-language')).toBe('ja');
  });
});

describe('Japanese starter variety', () => {
  it('does not begin with an apple, rotates openings, and persists across page reload', () => {
    let current: GameState | undefined;
    render(<App onStateChange={state => { current = state; }} />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    fireEvent.click(screen.getByRole('button', { name: /デモで遊ぶ/ }));
    expect(current?.entries[0].intendedWord).toBe('ねこ');
    fireEvent.click(screen.getByRole('button', { name: '最初の画面へ' }));
    fireEvent.click(screen.getByRole('button', { name: '最初に戻る' }));
    fireEvent.click(screen.getByRole('button', { name: /デモで遊ぶ/ }));
    expect(current?.entries[0].intendedWord).toBe('はな');
    expect(localStorage.getItem('drawindow-ja-starter-sequence')).toBe('2');
    cleanup();
    current = undefined;
    render(<App onStateChange={state => { current = state; }} />);
    fireEvent.click(screen.getByRole('button', { name: /デモで遊ぶ/ }));
    expect(current?.entries[0].intendedWord).toBe('すいか');
  });
});
