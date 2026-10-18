// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CataloguePreview } from './CataloguePreview';
vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: { mode: string; variant: string }) => <div data-testid="window" data-mode={props.mode} data-variant={props.variant} /> }));
vi.mock('./DoodleThumbnail', () => ({ DoodleThumbnail: () => <span>Picture</span> }));
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

it('shows the complete library with words hidden and toggles labels and readability independently', () => {
  render(<CataloguePreview />);
  expect(screen.getAllByTestId('doodle-card')).toHaveLength(64);
  expect(document.body.textContent).not.toMatch(/\bapple\b|\bowl\b|qd-/);
  fireEvent.click(screen.getByRole('button', { name: 'word表示' }));
  expect(screen.getAllByText('apple').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'readability表示' }));
  expect(screen.queryAllByTestId('readability-badge')).toHaveLength(0);
  expect(screen.getAllByText('apple').length).toBeGreaterThan(0);
});

it('filters SAFE candidates and letters, keeping selection valid including an empty X filter', () => {
  render(<CataloguePreview />);
  fireEvent.change(screen.getByLabelText('文字で絞る'), { target: { value: 'O' } });
  expect(screen.getAllByTestId('doodle-card')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'SAFEのみ表示' }));
  expect(screen.getAllByTestId('doodle-card').every(card => card.getAttribute('data-readability') === 'safe')).toBe(true);
  fireEvent.change(screen.getByLabelText('文字で絞る'), { target: { value: 'X' } });
  expect(screen.queryAllByTestId('doodle-card')).toHaveLength(0);
  expect(screen.getByText('この条件の候補はありません。')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'SAFEのみ表示' }));
  expect(screen.getAllByTestId('doodle-card')).toHaveLength(3);
  expect(screen.getByLabelText('制作サンプル')).toBeTruthy();
});

it('switches DAY/NIGHT, uses the actual glass preview, and opens selected review geometry', () => {
  render(<CataloguePreview />);
  fireEvent.click(screen.getByRole('button', { name: /^NIGHT$/ }));
  expect(screen.getByTestId('window').getAttribute('data-mode')).toBe('night');
  fireEvent.click(screen.getByRole('button', { name: '曇りガラス越し' }));
  expect(screen.getByTestId('window').getAttribute('data-variant')).toBe('neutral');
  fireEvent.change(screen.getByLabelText('文字で絞る'), { target: { value: 'O' } });
  fireEvent.change(screen.getByLabelText('制作サンプル'), { target: { value: 'girl-owl-review-v04-original' } });
  expect(screen.getAllByTestId('doodle-card').filter(card => card.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'word表示' }));
  expect(screen.getByText(/初見の3〜5人/)).toBeTruthy();
});
