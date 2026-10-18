// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WindowCanvasProps } from '../core/types';
import { RecognitionBenchmark } from './RecognitionBenchmarkPage';
import { BenchmarkSession } from './recognitionBenchmark';

vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <button disabled={props.phase !== 'player_drawing'} onClick={() => { props.onInputTypeChange?.('mouse'); props.onStrokesChange([{ id: 'test-only', points: [{ x: .2, y: .3, t: 0 }] }]); }}>Test mark</button> }));
afterEach(cleanup);

describe('developer benchmark workflow, no human evidence generated', () => {
  it('checks zero-stroke locally and requires a mark, human judgement and rationale before NEXT', async () => {
    const recognize = vi.fn(async () => ({ source: 'api' as const, guess: 'apple' }));
    const session = new BenchmarkSession({ recognizer: { recognize }, imageRenderer: () => 'data:image/png;base64,aGVsbG8=' });
    render(<RecognitionBenchmark session={session} />);
    expect((screen.getByRole('button', { name: 'SEND ONCE' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /ZERO-STROKE CHECK/ }));
    expect(screen.getByText(/invalid_input · API calls: 0/)).toBeTruthy();
    expect(recognize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Test mark' }));
    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }));
    expect((screen.getByRole('button', { name: 'SEND ONCE' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Test mark' }));
    fireEvent.click(screen.getByRole('button', { name: 'SEND ONCE' }));
    await waitFor(() => expect(screen.getByTestId('guess-1').textContent).toBe('apple'));
    expect(recognize).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'NEXT' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('納得度 · attempt 1'), { target: { value: 'exact' } });
    fireEvent.change(screen.getByLabelText('理由 · attempt 1'), { target: { value: 'りんごに見える' } });
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));
    expect(screen.getByRole('heading', { name: 'ねこ / cat' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'SEND ONCE' }) as HTMLButtonElement).disabled).toBe(true);
    expect(session.attempts[0]).toMatchObject({ judgement: 'exact', inputTypes: ['mouse'] });
  });
  it('shows honest rate limit failure, disables retry while paused and never substitutes DEMO', async () => {
    const recognize = vi.fn(async () => ({ source: 'api' as const, guess: null, errorCode: 'rate_limit' as const }));
    const session = new BenchmarkSession({ recognizer: { recognize }, imageRenderer: () => 'data:image/png;base64,aGVsbG8=' });
    render(<RecognitionBenchmark session={session} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test mark' }));
    fireEvent.click(screen.getByRole('button', { name: 'SEND ONCE' }));
    await waitFor(() => expect(screen.getByTestId('guess-1').textContent).toBe('rate_limit'));
    expect(screen.getByRole('alert').textContent).toContain('429');
    expect((screen.getByRole('button', { name: /MANUAL RETRY/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /DEMO/ })).toBeNull();
    expect(screen.getByLabelText('納得度 · attempt 1').querySelectorAll('option')).toHaveLength(2);
  });
});
