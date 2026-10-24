// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WindowCanvasProps } from '../core/types';
import { RecognitionBenchmark } from './RecognitionBenchmarkPage';
import { BenchmarkSession, exportJson } from './recognitionBenchmark';

vi.mock('../components/WindowCanvas', () => ({ WindowCanvas: (props: WindowCanvasProps) => <button disabled={props.phase !== 'player_drawing'} onClick={() => { props.onInputTypeChange?.('mouse'); props.onStrokesChange([{ id: 'test-only', points: [{ x: .2, y: .3, t: 0 }] }]); }}>Test mark</button> }));
vi.mock('../services/quickDrawRecognizer', () => ({ createQuickDrawRecognizer: (options: { onDiagnostic: (value: unknown) => void }) => ({ recognize: async () => {
  options.onDiagnostic({ top3: [{ label: 'apple', score: .7 }, { label: 'pear', score: .2 }, { label: 'circle', score: .05 }], outcome: 'accepted' });
  return { source: 'ml', guess: 'apple' };
} }) }));

afterEach(cleanup);

describe('developer benchmark workflow, no human evidence generated', () => {
  it('records local Top3 and independent human observations and feedback in explicit export', async () => {
    const session = new BenchmarkSession({ imageRenderer: () => 'data:image/png;base64,aGVsbG8=' });
    render(<RecognitionBenchmark session={session} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test mark' }));
    fireEvent.click(screen.getByRole('button', { name: 'SEND ONCE' }));
    await waitFor(() => expect(screen.getByTestId('guess-1').textContent).toBe('apple'));
    expect(session.attempts[0]).toMatchObject({ source: 'ml', modelOutcome: 'accepted', top3: [{ label: 'apple', score: .7 }, { label: 'pear', score: .2 }, { label: 'circle', score: .05 }], chainContinued: null, top3MatchesIntent: null });
    fireEvent.change(screen.getByLabelText('Top 3 · attempt 1'), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText('楽しさ'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('再遊意向'), { target: { value: 'false' } });
    expect(session.attempts[0]).toMatchObject({ top3MatchesIntent: true, chainContinued: null, judgement: null });
    expect(session.feedback).toMatchObject({ fun: 2, replay: false, completedGame: null });
    const exported = JSON.parse(exportJson(session));
    expect(exported.feedback).toMatchObject({ fun: 2, replay: false });
    expect(exported.summary).toMatchObject({ top3Matches: 1, exact: 0, chainObserved: 0, errorCount: 0 });
  });
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
