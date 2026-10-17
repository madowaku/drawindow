// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { girlSketches } from './data/sketches';
import type { WindowCanvasProps } from './core/types';

vi.mock('./components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div>
  {props.phase === 'girl_breath' && <button onClick={props.onBreathDone}>Test complete breath</button>}
  {props.phase === 'girl_drawing' && <button onClick={props.onPlaybackDone}>Test complete playback</button>}
  {props.phase === 'player_drawing' && <button onClick={() => props.onStrokesChange([{ id: 'test', points: [{ x: .2, y: .2, t: 0 }, { x: .6, y: .6, t: 100 }] }])}>Test draw</button>}
</div> }));
vi.mock('./components/SketchThumbnail', () => ({ SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(cleanup);

async function finishFive() {
  fireEvent.click(screen.getByRole('button', { name: /PLAY DEMO/ }));
  for (let round = 0; round < 5; round++) {
    await waitFor(() => expect(document.querySelector('main')?.getAttribute('data-phase')).toBe('girl_breath'));
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
  it('finishes five exchanges without answer leaks, preserves raw label editing, reveals nine links and restarts', async () => {
    render(<App />);
    await finishFive();
    const labels = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(labels[0], { target: { value: 'ice ' } });
    expect(labels[0].value).toBe('ice ');
    fireEvent.change(labels[0], { target: { value: 'ice cream' } });
    expect(labels[0].value).toBe('ice cream');
    ['tree', 'egg', 'goat', 'rain'].forEach((word, i) => fireEvent.change(labels[i + 1], { target: { value: word } }));
    fireEvent.click(screen.getByRole('button', { name: /REVEAL OUR CHAIN/ }));
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
