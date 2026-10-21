// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EndingScene } from './EndingScene';
import { calculateScore } from '../core/score';
import type { DrawingEntry } from '../core/types';

vi.mock('./SketchThumbnail', () => ({ SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));
vi.mock('./CharacterScene', () => ({ CharacterScene: () => <div /> }));
afterEach(cleanup);
const entries: DrawingEntry[] = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, actor: i % 2 ? 'player' : 'girl', round: Math.floor(i / 2) + 1, strokes: [], intendedWord: i % 2 ? 'ようなし' : 'すいか', recognition: i % 2 && i < 9 ? { guess: 'らふらんす', source: 'api' } : null, comparable: true }));
const props = { entries, score: calculateScore(entries, 'api', 'ja'), language: 'ja' as const, mode: 'day' as const, sessionKind: 'api' as const, reducedMotion: true, onRestart: vi.fn(), onTitle: vi.fn() };

it('adds warm, qualified meaning notes only after reveal without hiding broken links or adding a meaning score', () => {
  render(<EndingScene {...props} />);
  expect(document.body.textContent).not.toMatch(/近いイメージ|らふらんす/);
  fireEvent.click(screen.getByRole('button', { name: '答え合わせをする' }));
  expect(screen.getAllByText(/近いイメージ.*かもしれません/)).toHaveLength(4);
  expect(document.querySelectorAll('.chain-link')).toHaveLength(9);
  expect(document.querySelectorAll('.chain-link.broken')).toHaveLength(9);
  expect(document.body.textContent).not.toMatch(/意味一致率|意味スコア|理解度/);
  expect(screen.getByText('最後の絵は認識していません')).toBeTruthy();
});

it('does not assert shared meaning for an uncertain guess', () => {
  const uncertain = entries.map(e => ({ ...e, recognition: e.recognition ? { ...e.recognition, uncertain: true } : null }));
  render(<EndingScene {...props} entries={uncertain} />);
  fireEvent.click(screen.getByRole('button', { name: '答え合わせをする' }));
  expect(screen.getAllByText(/推測はまだ確かではありません/)).toHaveLength(4);
  expect(document.body.textContent).not.toMatch(/同じものとして受け取れた|意味が通じた/);
});

it.each(['unknown', 'demo'] as const)('adds no shared-meaning claim for %s recognition', kind => {
  const disclosed = entries.map(e => ({ ...e, recognition: kind === 'unknown' ? null : e.recognition ? { ...e.recognition, source: 'mock' as const } : null }));
  render(<EndingScene {...props} entries={disclosed} />);
  fireEvent.click(screen.getByRole('button', { name: '答え合わせをする' }));
  expect(document.querySelectorAll('.meaning-note')).toHaveLength(0);
});
