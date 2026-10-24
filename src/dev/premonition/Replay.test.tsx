// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInitialState, gameReducer } from '../../core/gameMachine';
import type { GameEvent, Stroke } from '../../core/types';
import { PremonitionRecorder } from './recording';
import { PremonitionReplay } from './Replay';
import type { BlindAssignment } from './evaluation';

vi.mock('../../components/CharacterScene', () => ({ CharacterScene: (p: { frameOverride?: string }) => <div data-testid="face" data-pose={p.frameOverride ?? 'default'}/> }));
vi.mock('../../components/SketchThumbnail', () => ({ SketchThumbnail: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
function trace() {
  let now = 0;
  let state = createInitialState();
  const recorder = new PremonitionRecorder(() => now += 1000);
  recorder.observeInitial(state);
  const send = (event: GameEvent) => { recorder.record(event); state = gameReducer(state, event); };
  const strokes: Stroke[] = [{ id: 'synthetic', points: [{ x: .2, y: .3, t: 0 }] }];
  send({ type: 'START', mode: 'day', sessionKind: 'ml', sketches: ['cat', 'tree', 'egg'].map(word => ({ id: word, word, strokes })) });
  send({ type: 'BREATH_DONE' }); send({ type: 'PLAYBACK_DONE' }); send({ type: 'YOUR_TURN' });
  send({ type: 'STROKES_CHANGED', strokes }); send({ type: 'DONE' });
  send({ type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { source: 'ml', guess: 'tree' } });
  send({ type: 'BREATH_DONE' });
  return recorder.recording!;
}
const assignment: BlindAssignment = { X: 'D', Y: 'A', order: ['X', 'Y'] };
it('advances its shared clock and stops when reduced motion becomes active', () => {
  let pending: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = undefined; });
  const recording = trace();
  const view = render(<PremonitionReplay recording={recording} assignment={assignment} label="X" reducedMotion={false}/>);
  fireEvent.click(screen.getByRole('button', { name: '記録を再生' }));
  act(() => pending?.(100)); act(() => pending?.(150));
  expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(50);
  view.rerender(<PremonitionReplay recording={recording} assignment={assignment} label="X" reducedMotion/>);
  expect((screen.getByRole('button', { name: '記録を再生' }) as HTMLButtonElement).disabled).toBe(true);
  expect(pending).toBeUndefined();
});
it('suppresses a hidden beat on return until an explicit manual comparison', () => {
  render(<PremonitionReplay recording={trace()} assignment={assignment} label="X" reducedMotion={false}/>);
  fireEvent.click(screen.getByRole('button', { name: '次の認識直後' }));
  expect(screen.getByTestId('face').getAttribute('data-pose')).toBe('smile');
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByTestId('face').getAttribute('data-pose')).toBe('default');
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByTestId('face').getAttribute('data-pose')).toBe('default');
  fireEvent.change(screen.getByRole('slider'), { target: { value: (screen.getByRole('slider') as HTMLInputElement).value } });
  // A deliberate seek starts a fresh static comparison, rather than a tab-return animation.
  fireEvent.click(screen.getByRole('button', { name: '最初へ' }));
  fireEvent.click(screen.getByRole('button', { name: '次の認識直後' }));
  expect(screen.getByTestId('face').getAttribute('data-pose')).toBe('smile');
});
