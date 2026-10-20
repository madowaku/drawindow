// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { JapaneseDoodlePreview } from './JapaneseDoodlePreview';

vi.mock('../components/SketchThumbnail', () => ({
  SketchThumbnail: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
}));
afterEach(cleanup);

describe('Japanese blind doodle comparison gallery', () => {
  it('hides intended words for both variants, revealing only when requested', () => {
    const { container } = render(<JapaneseDoodlePreview />);
    expect(container.querySelector('.ja-catalog-grid')?.getAttribute('data-comparing')).toBe('true');
    expect(screen.getAllByRole('img')).toHaveLength(32);
    expect(screen.getAllByText('修正前')).toHaveLength(16);
    expect(screen.getAllByText('修正後')).toHaveLength(16);
    expect(container.textContent).not.toContain('ごりら');
    expect(screen.getAllByRole('img').every(img => !img.getAttribute('aria-label')?.includes('ごりら'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '名前を表示' }));
    expect(screen.getByText('ごりら')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '名前を隠す' }));
    expect(container.textContent).not.toContain('ごりら');
  });

  it('exposes a nine-piece anonymous bilingual review scope without altering the classic baseline', () => {
    const { container } = render(<JapaneseDoodlePreview />);
    fireEvent.click(screen.getByRole('button', { name: '昼夜・日英9枚' }));
    expect(screen.getAllByRole('img')).toHaveLength(9);
    expect(container.textContent).not.toContain('てんとうむし');
    fireEvent.click(screen.getByRole('button', { name: '名前を表示' }));
    expect(screen.getByText('てんとうむし')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '定番16枚' }));
    expect(screen.getAllByRole('img')).toHaveLength(32);
  });

  it('allows blind review of the 14 new picture-shiritori candidates', () => {
    const { container } = render(<JapaneseDoodlePreview />);
    fireEvent.click(screen.getByRole('button', { name: '絵しりとり追加14枚' }));
    expect(screen.getAllByRole('img')).toHaveLength(14);
    expect(container.textContent).not.toContain('すべりだい');
    fireEvent.click(screen.getByRole('button', { name: '名前を表示' }));
    expect(screen.getByText('すべりだい')).toBeTruthy();
  });

  it('filters classics, switches daylight, and can hide/show comparison without losing the catalogue', () => {
    const { container } = render(<JapaneseDoodlePreview />);
    fireEvent.click(screen.getByRole('button', { name: '☾ 夜' }));
    expect(container.querySelector('main')?.getAttribute('data-mode')).toBe('night');
    fireEvent.click(screen.getByRole('button', { name: '比較を閉じる' }));
    expect(screen.getAllByRole('img')).toHaveLength(16);
    fireEvent.click(screen.getByRole('button', { name: '修正前後を比較' }));
    expect(screen.getAllByRole('img')).toHaveLength(32);
    fireEvent.click(screen.getByRole('button', { name: '追加分' }));
    expect(container.querySelector('.ja-catalog-grid')?.getAttribute('data-comparing')).toBe('false');
    expect(screen.getAllByRole('img')).toHaveLength(94);
    fireEvent.click(screen.getByRole('button', { name: '定番16枚' }));
    expect(screen.getAllByRole('img')).toHaveLength(32);
  });
});

it('reviews one anonymous pair at a time and persists version-specific marks', () => {
  localStorage.clear();
  const { container, unmount } = render(<JapaneseDoodlePreview />);
  fireEvent.click(screen.getByRole('button', { name: '1枚ずつ見る' }));
  expect(screen.getAllByRole('img')).toHaveLength(2);
  expect(screen.getByText('1 / 16')).toBeTruthy();
  expect((screen.getByRole('button', { name: '前の絵' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '採用' }));
  expect(screen.getByRole('button', { name: '採用' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '次の絵' }));
  expect(screen.getByText('2 / 16')).toBeTruthy();
  expect(screen.getByRole('button', { name: '採用' }).getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: '保留' }));
  fireEvent.click(screen.getByRole('button', { name: '前の絵' }));
  expect(screen.getByRole('button', { name: '採用' }).getAttribute('aria-pressed')).toBe('true');
  expect(container.innerHTML).not.toMatch(/ごりら|gorilla|ぱいなっぷる|pineapple/);
  unmount();
  render(<JapaneseDoodlePreview />);
  fireEvent.click(screen.getByRole('button', { name: '1枚ずつ見る' }));
  expect(screen.getByRole('button', { name: '採用' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '採用' }));
  expect(screen.getByRole('button', { name: '採用' }).getAttribute('aria-pressed')).toBe('false');
  localStorage.clear();
});

it('handles empty filters, catalogue changes and the last item', () => {
  render(<JapaneseDoodlePreview />);
  fireEvent.click(screen.getByRole('button', { name: '1枚ずつ見る' }));
  for (let i = 1; i < 16; i++) fireEvent.click(screen.getByRole('button', { name: '次の絵' }));
  expect(screen.getByText('16 / 16')).toBeTruthy();
  expect((screen.getByRole('button', { name: '次の絵' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText('表示設定・使い方'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'え' } });
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.getByText('0 / 0')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '全部' }));
  expect(screen.getAllByRole('img')).toHaveLength(1);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } });
  expect(screen.getByText('1 / 158')).toBeTruthy();
});

it('survives malformed and blocked storage with usable in-memory marks', () => {
  localStorage.setItem('drawindow-ja-doodle-review-v1', '{broken');
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<JapaneseDoodlePreview />);
  fireEvent.click(screen.getByRole('button', { name: '1枚ずつ見る' }));
  fireEvent.click(screen.getByRole('button', { name: '再修正' }));
  expect(screen.getByRole('status').textContent).toContain('保存できない');
  expect(screen.getByRole('button', { name: '再修正' }).getAttribute('aria-pressed')).toBe('true');
  blocked.mockRestore();
  localStorage.clear();
});
