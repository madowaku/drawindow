// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import type { WindowCanvasProps } from '../core/types';
vi.mock('../lib/usePremonition', () => ({ usePremonition: () => ({ expression: 'curious', events: [] }) }));
vi.mock('../services/quickDrawRecognizer', () => ({ preloadQuickDrawModel: async () => {}, createQuickDrawRecognizer: () => ({ recognize: async () => ({ guess: 'cat', source: 'ml' }) }) }));
vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <div data-testid="expression-contract" data-expression={props.expression}/> }));
const storage = { read: async () => null, write: async () => {} };
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('drawindow-language', 'en');
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(cleanup);
it('passes adopted D reactions through the normal tempo canvas in the recovery study', () => {
  render(<App study={{ localOnly: true, preserveProductPresentation: true, storage }}/>);
  fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
  expect(screen.getByTestId('expression-contract').getAttribute('data-expression')).toBe('curious');
});
it('keeps explicit expression controls for the pre-existing presentation studies', () => {
  render(<App study={{ localOnly: true, expression: 'shy', storage }}/>);
  fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
  expect(screen.getByTestId('expression-contract').getAttribute('data-expression')).toBe('shy');
});
