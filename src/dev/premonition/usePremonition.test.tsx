// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, gameReducer } from '../../core/gameMachine';
import type { GameState, GirlSketch, Language, Mode } from '../../core/types';
import { usePremonition } from './usePremonition';

const ink = [{ id: 'ink', points: [{ x: .2, y: .3, t: 0 }] }];
function pending(mode: Mode = 'day', language: Language = 'en', state?: GameState) {
  const words = language === 'en' ? ['cat', 'egg'] : ['すいか', 'さくら'];
  const sketches: GirlSketch[] = words.map(word => ({ id: word, word, strokes: ink }));
  let next = state ?? gameReducer(createInitialState(mode, language), { type: 'START', mode, sessionKind: 'ml', sketches });
  for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) next = gameReducer(next, { type });
  next = gameReducer(next, { type: 'STROKES_CHANGED', strokes: ink });
  return gameReducer(next, { type: 'DONE' });
}
function resolve(state: GameState) {
  return gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { source: 'ml', guess: state.language === 'en' ? 'tree' : 'かさ' } });
}
type Props = { state: GameState | null; enabled: boolean; reduced: boolean };
function observe(state: GameState | null, enabled = true, reduced = false) {
  return renderHook((props: Props) => usePremonition(props.state, props.enabled, props.reduced), { initialProps: { state, enabled, reduced } });
}
function visibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('cosmetic premonition lifetime', () => {
  it.each([['day', 'en', 240], ['night', 'en', 160], ['day', 'ja', 240], ['night', 'ja', 160]] as const)('overlaps actual %s/%s breath for %sms', (mode, language, duration) => {
    const before = pending(mode, language), after = resolve(before);
    const { result, rerender } = observe(before);
    rerender({ state: after, enabled: true, reduced: false });
    expect(result.current.expression).toBe('smile');
    expect(result.current.events).toHaveLength(1);
    expect(after.phase).toBe('girl_breath');
    act(() => vi.advanceTimersByTime(duration - 1));
    expect(result.current.active).toBeDefined();
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.expression).toBeUndefined();
    expect(after.phase).toBe('girl_breath');
    rerender({ state: { ...after }, enabled: true, reduced: false });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.active).toBeUndefined();
  });
  it('does not retrospectively animate mounted/restored states', () => {
    const after = resolve(pending());
    const { result, rerender } = observe(after);
    expect(result.current.events).toHaveLength(0);
    rerender({ state: createInitialState(), enabled: true, reduced: false });
    rerender({ state: JSON.parse(JSON.stringify(after)), enabled: true, reduced: false });
    expect(result.current.events).toHaveLength(0);
    expect(result.current.active).toBeUndefined();
  });
  it.each([['disabled', false, false], ['reduced_motion', true, true]] as const)('consumes %s acceptance and never replays when toggled', (reason, enabled, reduced) => {
    const before = pending(), after = resolve(before);
    const { result, rerender } = observe(before, enabled, reduced);
    rerender({ state: after, enabled, reduced });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].suppressionReason).toBe(reason);
    expect(result.current.expression).toBeUndefined();
    rerender({ state: after, enabled: true, reduced: false });
    expect(result.current.expression).toBeUndefined();
    // Even replaying the same old recognizing -> acceptance cannot retrigger.
    rerender({ state: before, enabled: true, reduced: false });
    rerender({ state: after, enabled: true, reduced: false });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.active).toBeUndefined();
  });
  it('consumes hidden acceptance and clears a running timer on hide without replay', () => {
    const before = pending(), after = resolve(before);
    const { result, rerender } = observe(before);
    visibility('hidden');
    rerender({ state: after, enabled: true, reduced: false });
    expect(result.current.events[0].suppressionReason).toBe('hidden');
    expect(vi.getTimerCount()).toBe(0);
    visibility('visible');
    expect(result.current.active).toBeUndefined();
    const middleBefore = pending('day', 'en', after);
    const middleAfter = resolve(middleBefore);
    rerender({ state: middleBefore, enabled: true, reduced: false });
    rerender({ state: middleAfter, enabled: true, reduced: false });
    const nextBefore = pending('day', 'en', middleAfter);
    const nextAfter = resolve(nextBefore);
    rerender({ state: nextBefore, enabled: true, reduced: false });
    rerender({ state: nextAfter, enabled: true, reduced: false });
    expect(result.current.active).toBeDefined();
    visibility('hidden');
    expect(result.current.active).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    visibility('visible');
    expect(result.current.active).toBeUndefined();
  });
  it.each(['phase', 'reset', 'disabled', 'reduced', 'unmount'] as const)('clears active expression and timer on %s', cause => {
    const before = pending(), after = resolve(before);
    const { result, rerender, unmount } = observe(before);
    rerender({ state: after, enabled: true, reduced: false });
    expect(result.current.active).toBeDefined();
    if (cause === 'unmount') unmount();
    else rerender({ state: cause === 'reset' ? null : cause === 'phase' ? gameReducer(after, { type: 'BREATH_DONE' }) : after, enabled: cause !== 'disabled', reduced: cause === 'reduced' });
    if (cause !== 'unmount') expect(result.current.expression).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps all four observations while displaying at most two, with no model/reducer activity', () => {
    let before = pending();
    const { result, rerender } = observe(before);
    let shown = 0;
    for (let round = 1; round <= 4; round++) {
      const after = resolve(before);
      const snapshot = JSON.stringify(after);
      rerender({ state: after, enabled: true, reduced: false });
      if (result.current.active) shown++;
      expect(JSON.stringify(after)).toBe(snapshot);
      before = pending('day', 'en', after);
      rerender({ state: before, enabled: true, reduced: false });
    }
    expect(result.current.events).toHaveLength(4);
    expect(shown).toBe(2);
    expect(before.phase).toBe('review_intents');
    expect(result.current.active).toBeUndefined();
  });
});
