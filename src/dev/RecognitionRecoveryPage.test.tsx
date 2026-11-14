// @vitest-environment jsdom
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppProps } from '../App';
import { createInitialState } from '../core/gameMachine';
import { RecognitionRecoveryPage } from './RecognitionRecoveryPage';
vi.mock('../App', () => ({ default: ({ study, onStateChange }: AppProps) => {
  useEffect(() => { onStateChange?.({ ...createInitialState(), phase: 'results', sessionKind: 'ml' }); }, []);
  return <>{study?.header}<button onClick={() => study?.onEvent?.({ type: 'START', mode: 'day', sessionKind: 'ml', sketches: [] })}>New test session</button>{study?.footer}</>;
} }));
afterEach(() => { cleanup(); localStorage.clear(); });
it('does not carry feedback into the next session or A/B condition', () => {
  render(<RecognitionRecoveryPage />);
  const fields = () => screen.getAllByRole('textbox') as HTMLInputElement[];
  expect(fields()).toHaveLength(6);
  for (const input of fields()) fireEvent.change(input, { target: { value: 'prior session only' } });
  fireEvent.click(screen.getByRole('button', { name: 'New test session' }));
  expect(fields().every(input => input.value === '')).toBe(true);
  for (const input of fields()) fireEvent.change(input, { target: { value: 'B only' } });
  fireEvent.change(screen.getByRole('combobox', { name: '比較条件' }), { target: { value: 'A' } });
  expect(fields().every(input => input.value === '')).toBe(true);
});
