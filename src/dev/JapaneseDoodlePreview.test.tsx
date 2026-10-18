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

  it('filters classics, switches daylight, and can hide/show comparison without losing the catalogue', () => {
    const { container } = render(<JapaneseDoodlePreview />);
    fireEvent.click(screen.getByRole('button', { name: /夜/ }));
    expect(container.querySelector('main')?.getAttribute('data-mode')).toBe('night');
    fireEvent.click(screen.getByRole('button', { name: '比較を閉じる' }));
    expect(screen.getAllByRole('img')).toHaveLength(16);
    fireEvent.click(screen.getByRole('button', { name: '修正前後を比較' }));
    expect(screen.getAllByRole('img')).toHaveLength(32);
    fireEvent.click(screen.getByRole('button', { name: '追加分' }));
    expect(container.querySelector('.ja-catalog-grid')?.getAttribute('data-comparing')).toBe('false');
    expect(screen.getAllByRole('img')).toHaveLength(59);
    fireEvent.click(screen.getByRole('button', { name: '定番16枚' }));
    expect(screen.getAllByRole('img')).toHaveLength(32);
  });
});
