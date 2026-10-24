import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { gameSketches } from '../data/gameSketches';
import { encodeSession, decodeSession } from './sessionStorage';

const stroke = [{ id: 'ink', points: [{ x: .2, y: .3, t: 0 }] }];
function drawing() {
  let state = gameReducer(createInitialState('night', 'en'), { type: 'START', mode: 'night', sessionKind: 'ml', sketches: gameSketches('en') });
  for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) state = gameReducer(state, { type });
  return gameReducer(state, { type: 'STROKES_CHANGED', strokes: stroke });
}
describe('versioned local session snapshots', () => {
  it('retains mode, language, selection order and undo/redo including CLEAR', () => {
    const state = gameReducer(drawing(), { type: 'CLEAR' });
    const restored = decodeSession(encodeSession(state, {}))!;
    expect(restored.state.mode).toBe('night');
    expect(restored.state.sketches.map(s => s.id)).toEqual(state.sketches.map(s => s.id));
    expect(gameReducer(restored.state, { type: 'UNDO' }).activeStrokes).toEqual(stroke);
    expect(gameReducer(gameReducer(restored.state, { type: 'UNDO' }), { type: 'REDO' }).activeStrokes).toEqual([]);
  });
  it('interrupts pending inference with a deliberate retry and rejects its old response', () => {
    const state = gameReducer(drawing(), { type: 'DONE' });
    const restored = decodeSession(encodeSession(state, {}))!.state;
    expect(restored.phase).toBe('recognition_error');
    expect(restored.activeStrokes).toEqual(stroke);
    expect(gameReducer(restored, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: 'cat', source: 'ml' } })).toBe(restored);
    const retry = gameReducer(restored, { type: 'RETRY_RECOGNITION' });
    expect(retry.recognitionRequest!.requestId).not.toBe(state.recognitionRequest!.requestId);
    expect(retry.entries).toHaveLength(2);
  });
  it('settles interrupted girl animation without replay or duplicate entries', () => {
    const state = gameReducer(createInitialState(), { type: 'START', mode: 'day', sessionKind: 'ml', sketches: gameSketches('en') });
    const restored = decodeSession(encodeSession(state, {}))!.state;
    expect(restored.phase).toBe('girl_holding');
    expect(restored.entries).toHaveLength(1);
  });
  it('rejects unknown versions, corrupt state, nonfinite points and missing catalogue ids', () => {
    expect(decodeSession(null)).toBeNull();
    const snapshot = encodeSession(drawing(), {});
    expect(decodeSession({ ...snapshot, version: 99 })).toBeNull();
    expect(decodeSession({ ...snapshot, state: { ...snapshot.state, round: 6 } })).toBeNull();
    expect(decodeSession({ ...snapshot, sketchIds: ['removed'] })).toBeNull();
    expect(decodeSession({ ...snapshot, state: { ...snapshot.state, phase: 'girl_notice' } })).toBeNull();
    expect(decodeSession({ ...snapshot, state: { ...snapshot.state, activeStrokes: [{ id: 'bad', points: [{ x: Infinity, y: .2, t: 0 }] }] } })).toBeNull();
  });
});


it('retains raw naming drafts and intended words, with fresh ids', () => {
  let state = drawing();
  // A completed fixture retains actual production girl pictures and valid records.
  const sketches = state.sketches;
  const entries = Array.from({ length: 10 }, (_, i) => ({
    id: `old:${i}`, actor: i % 2 ? 'player' as const : 'girl' as const, round: Math.floor(i / 2) + 1,
    strokes: stroke, intendedWord: i % 2 ? null : sketches[i].word,
    recognition: i % 2 && i < 9 ? { guess: 'cat', source: 'ml' as const } : null,
    comparable: false, ...(i % 2 ? {} : { templateId: sketches[i].id }),
  }));
  state = { ...state, phase: 'review_intents', round: 5, entries };
  state = gameReducer(state, { type: 'SET_INTENT', entryId: 'old:1', word: ' Ice cream  ' });
  const restored = decodeSession(encodeSession(state, { 'old:1': ' Ice cream  ', 'old:3': 'unfinished-' }))!;
  expect(restored.state.phase).toBe('review_intents');
  expect(restored.state.entries[1].intendedWord).toBe('ice cream');
  expect(restored.intentDrafts[restored.state.entries[1].id]).toBe(' Ice cream  ');
  expect(restored.intentDrafts[restored.state.entries[3].id]).toBe('unfinished-');
  expect(restored.state.entries[1].recognition?.guess).toBe('cat');
});

it('settles an interrupted correction exactly once while retaining the false start', () => {
  const pool = gameSketches('ja');
  const base = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'ml', sketches: pool });
  const state = { ...base, phase: 'girl_notice' as const, girlCorrection: pool[1], girlSlipUsed: true };
  const restored = decodeSession(encodeSession(state, {}))!.state;
  expect(restored.phase).toBe('girl_holding');
  expect(restored.entries).toHaveLength(1);
  expect(restored.entries[0].templateId).toBe(pool[1].id);
  expect(restored.entries[0].falseStart?.id).toBe(pool[0].id);
  expect(restored.girlCorrection).toBeNull();
});

it('preserves asymmetric Japanese intent spelling and meaning across resume', () => {
  const pool = gameSketches('ja');
  const base = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'ml', sketches: pool });
  const entries = Array.from({ length: 10 }, (_, i) => ({
    id: `old:${i}`, actor: i % 2 ? 'player' as const : 'girl' as const, round: Math.floor(i / 2) + 1,
    strokes: stroke, intendedWord: i % 2 ? null : pool[i].word, comparable: false,
    recognition: i % 2 && i < 9 ? { guess: 'はな', label: '花', source: 'ml' as const } : null,
    ...(i % 2 ? {} : { templateId: pool[i].id }),
  }));
  const state = gameReducer({ ...base, phase: 'review_intents', round: 5, entries }, { type: 'SET_INTENT', entryId: 'old:1', word: '鼻' });
  const restored = decodeSession(encodeSession(state, { 'old:1': '鼻' }))!.state;
  expect(restored.entries[1].naming?.intention).toEqual(state.entries[1].naming?.intention);
  expect(restored.entries[1].naming?.meaning).toEqual(state.entries[1].naming?.meaning);
});

it('does not revive exhausted retries or erase an invalid-input error on reload', () => {
  let state = gameReducer(drawing(), { type: 'DONE' });
  for (let i = 1; i <= 3; i++) {
    state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: null, source: 'ml', errorCode: 'rate_limit', error: 'limit' } });
    if (i < 3) state = gameReducer(state, { type: 'RETRY_RECOGNITION' });
  }
  const restored = decodeSession(encodeSession(state, {}))!.state;
  expect(restored.error).toMatchObject({ code: 'rate_limit', retryable: false });
  expect(gameReducer(restored, { type: 'RETRY_RECOGNITION' })).toBe(restored);
  const invalid = { ...state, error: { code: 'invalid_input' as const, retryable: false, message: 'Drawing unavailable' } };
  expect(decodeSession(encodeSession(invalid, {}))!.state.error).toMatchObject({ code: 'invalid_input', retryable: false });
});
