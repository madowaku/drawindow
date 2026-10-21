// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DrawingEntry } from '../core/types';
import { calculateScore } from '../core/score';
import { EndingScene } from './EndingScene';
import { closingLine } from '../lib/ending';

vi.mock('./SketchThumbnail', () => ({ SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));
vi.mock('./CharacterScene', () => ({ CharacterScene: ({ mode, frameOverride }: { mode: string; frameOverride?: string }) => <div data-testid="ending-character" data-mode={mode} data-override={frameOverride ?? 'none'} /> }));
const entries: DrawingEntry[] = Array.from({ length: 10 }, (_, i) => ({ id: `entry-${i}`, actor: i % 2 ? 'player' : 'girl', round: Math.floor(i / 2) + 1, strokes: [{ id: 's', points: [{ x: .2, y: .3, t: 0 }] }], intendedWord: ['apple', 'egg', 'goat', 'tree', 'ear', 'rat', 'tiger', 'rain', 'nest', 'tea'][i], recognition: i % 2 && i < 9 ? { guess: ['egg', 'tree', 'rat', 'rain'][Math.floor(i / 2)], source: 'api' } : null, comparable: true }));
const props = { entries, score: calculateScore(entries), mode: 'day' as const, language: 'en' as const, sessionKind: 'api' as const, reducedMotion: false, onRestart: vi.fn(), onTitle: vi.fn() };
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('ten little thoughts', () => {
  it('keeps every answer and score out of the diary until deliberate reveal, including accessible names', () => {
    render(<EndingScene {...props} reducedMotion />);
    expect(screen.getAllByRole('img')).toHaveLength(10);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('apple');
    expect([...document.querySelectorAll('[aria-label]')].some(e => e.getAttribute('aria-label')?.includes('apple'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'See what we meant' }));
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    expect(screen.getByText('Final drawing · not sent for recognition')).toBeTruthy();
    expect(document.body.textContent).not.toContain('perfect understanding');
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('reveals five pairs then nine links in order; skip retains exactly the same data and cancels timers', () => {
    vi.useFakeTimers();
    render(<EndingScene {...props} />);
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(2);
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(1000));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'See what we meant' }));
    expect(document.querySelectorAll('.chain-link')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(700));
    expect(document.querySelectorAll('.chain-link')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation · see results' }));
    const content = document.querySelector('.ending-diary')?.textContent;
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    act(() => vi.advanceTimersByTime(10000));
    expect(document.querySelector('.ending-diary')?.textContent).toBe(content);
  });

  it('instant skip is explicit reveal and goodbye never removes the browsable results', () => {
    render(<EndingScene {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation · see results' }));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'A little goodbye' }));
    expect(screen.getByText('Each picture held its own meaning. And we kept drawing.')).toBeTruthy();
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: 'Look at our drawings again' }));
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
  });

  it('uses the selected DAY/NIGHT farewell instead of forcing SMILE in the final act', () => {
    for (const mode of ['day', 'night'] as const) {
      const view = render(<EndingScene {...props} mode={mode} reducedMotion />);
      fireEvent.click(screen.getByRole('button', { name: 'See what we meant' }));
      fireEvent.click(screen.getByRole('button', { name: 'A little goodbye' }));
      const character = screen.getByTestId('ending-character');
      expect(character.getAttribute('data-mode')).toBe(mode);
      expect(character.getAttribute('data-override')).toBe('none');
      view.unmount();
    }
  });

  it('reports unknown and demo honestly, with Japanese restart details', () => {
    const unknown = entries.map(e => ({ ...e, intendedWord: e.actor === 'player' ? null : e.intendedWord, chainRestart: e.id === 'entry-2' }));
    render(<EndingScene {...props} entries={unknown} score={calculateScore(unknown, 'demo', 'ja')} sessionKind="demo" language="ja" reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: '答え合わせをする' }));
    expect(document.querySelectorAll('.chain-link.unknown')).toHaveLength(9);
    expect(screen.getByText(/デモ.*比較できません/)).toBeTruthy();
    expect(screen.getByText(/「ん」で途切れて/)).toBeTruthy();
  });

  it('never conceals already shown drawings or links when motion preferences change', () => {
    const { rerender } = render(<EndingScene {...props} reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: 'See what we meant' }));
    rerender(<EndingScene {...props} reducedMotion={false} />);
    expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
    expect(document.querySelectorAll('.result-drawing')).toHaveLength(10);
  });

  it('distinguishes perfect links from actual shared meaning and missing interpretations', () => {
    expect(closingLine(entries, calculateScore(entries), 'en')).toContain('Each picture');
    const different = entries.map(e => e.id === 'entry-1' ? { ...e, recognition: { guess: 'cat', source: 'api' as const } } : e);
    expect(closingLine(different, calculateScore(different), 'en')).toBe("We didn't see the same things. But we kept drawing.");
    expect(closingLine(different, calculateScore(different), 'ja', 'en')).toBe('同じものは見えなかった。それでも、描き続けた。');
    const japanese = entries.map(e => ({ ...e, intendedWord: 'ねこ', recognition: e.recognition ? { guess: 'いぬ', source: 'api' as const } : null }));
    expect(closingLine(japanese, calculateScore(japanese, 'api', 'ja'), 'en', 'ja')).toBe("We didn't see the same things. But we kept drawing.");
    const unknown = entries.map(e => e.id === 'entry-1' ? { ...e, recognition: null } : e);
    expect(closingLine(unknown, calculateScore(unknown), 'en')).toContain('unspoken');
  });
});
