import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer, selectCanFinishDrawing, selectPlayerEntries, selectVisibleStrokes } from './gameMachine';
import type { GameState, GirlSketch, Stroke } from './types';

const strokes: Stroke[] = [{ id: 's', points: [{ x: .1, y: .2, t: 0 }, { x: .6, y: .7, t: 30 }] }];
const sketches: GirlSketch[] = ['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest'].map(word => ({ id: word, word, strokes }));
const start = (mode: 'day' | 'night' = 'day', sessionKind: 'api' | 'demo' = 'api') => gameReducer(createInitialState(), { type: 'START', mode, sessionKind, sketches });
const toDraw = (s: GameState) => ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'].reduce((state, type) => gameReducer(state, { type } as Parameters<typeof gameReducer>[1]), s);
const done = (s: GameState) => gameReducer(gameReducer(s, { type: 'STROKES_CHANGED', strokes }), { type: 'DONE' });
const succeed = (s: GameState, guess = 'cat') => gameReducer(s, { type: 'RECOGNITION_RESOLVED', requestId: s.recognitionRequest!.requestId, result: { guess, source: s.sessionKind === 'demo' ? 'mock' : 'api' } });

describe('five silent exchanges', () => {
  it('restores CLEAR and redoes edits without checkpointing pointer samples or unchanged publications', () => {
    let state = toDraw(start());
    const first: Stroke[] = [{ id: 'a', points: [{ x: .2, y: .3, t: 0 }] }];
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: first });
    const longer: Stroke[] = [{ id: 'a', points: [...first[0].points, { x: .4, y: .6, t: 10 }] }];
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: longer });
    expect(gameReducer(state, { type: 'STROKES_CHANGED', strokes: longer })).toBe(state);
    state = gameReducer(state, { type: 'CLEAR' });
    expect(state.activeStrokes).toEqual([]);
    state = gameReducer(state, { type: 'UNDO' });
    expect(state.activeStrokes).toEqual(longer);
    state = gameReducer(state, { type: 'UNDO' });
    expect(state.activeStrokes).toEqual([]);
    state = gameReducer(state, { type: 'REDO' });
    expect(state.activeStrokes).toEqual(longer);
    state = gameReducer(state, { type: 'REDO' });
    expect(state.activeStrokes).toEqual([]);
    expect(gameReducer(state, { type: 'REDO' })).toBe(state);
  });

  it('retains immutable per-stroke undo after recognition error and discards redo when drawing resumes', () => {
    let state = toDraw(start());
    const ink: Stroke[] = [{ id: 'a', points: [{ x: .1, y: .2, t: 0 }] }];
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: ink });
    ink[0].points = [{ x: .9, y: .9, t: 3 }];
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: [...state.activeStrokes, { id: 'b', points: [{ x: .4, y: .5, t: 10 }] }] });
    state = gameReducer(state, { type: 'DONE' });
    state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: null, source: 'api', error: 'timeout' } });
    expect(gameReducer(state, { type: 'UNDO' })).toBe(state);
    state = gameReducer(state, { type: 'BACK_TO_DRAWING' });
    state = gameReducer(state, { type: 'UNDO' });
    expect(state.activeStrokes).toEqual([{ id: 'a', points: [{ x: .1, y: .2, t: 0 }] }]);
    state = gameReducer(state, { type: 'REDO' });
    expect(state.activeStrokes.map(stroke => stroke.id)).toEqual(['a', 'b']);
    state = gameReducer(state, { type: 'UNDO' });
    const invalid = gameReducer(state, { type: 'STROKES_CHANGED', strokes: [{ id: 'bad', points: [{ x: 5, y: 0, t: 0 }] }] });
    expect(invalid).toBe(state);
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: [...state.activeStrokes, { id: 'c', points: [{ x: .3, y: .3, t: 20 }] }] });
    expect(gameReducer(state, { type: 'REDO' })).toBe(state);
    expect(state.activeStrokes.map(stroke => stroke.id)).toEqual(['a', 'c']);
  });

  it('bounds edit history to 32 checkpoints and clears it for the next round and title', () => {
    let state = toDraw(start());
    for (let i = 0; i < 40; i++) state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: [...state.activeStrokes, { id: String(i), points: [{ x: .2, y: .2, t: i }] }] });
    for (let i = 0; i < 40; i++) state = gameReducer(state, { type: 'UNDO' });
    expect(state.activeStrokes).toHaveLength(8);
    for (let i = 0; i < 40; i++) state = gameReducer(state, { type: 'REDO' });
    expect(state.activeStrokes).toHaveLength(40);
    state = toDraw(succeed(gameReducer(state, { type: 'DONE' })));
    expect(gameReducer(state, { type: 'UNDO' })).toBe(state);
    expect(gameReducer(state, { type: 'REDO' })).toBe(state);
    state = gameReducer(state, { type: 'RETURN_TO_TITLE' });
    state = toDraw(gameReducer(state, { type: 'START', mode: 'day', sessionKind: 'api', sketches }));
    expect(gameReducer(state, { type: 'REDO' })).toBe(state);
  });
  it('explains rate limiting without encouraging repeated immediate retries', () => {
    const state = done(toDraw(start()));
    const failed = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: null, source: 'api', errorCode: 'rate_limit', error: 'unsafe provider detail' } });
    expect(failed.error?.message).toMatch(/limit|quota/i);
    expect(failed.error?.message).toMatch(/wait/i);
    expect(failed.activeStrokes).toEqual(strokes);
    expect(failed.sessionKind).toBe('api');
  });
  it.each(['day', 'night'] as const)('produces exactly ten alternating entries in %s, without recognizing player five', mode => {
    let state = start(mode);
    let calls = 0;
    for (let round = 1; round <= 5; round++) {
      expect(state.phase).toBe('girl_breath');
      expect(selectVisibleStrokes(state)).toEqual([]);
      state = done(toDraw(state));
      const duplicate = gameReducer(state, { type: 'DONE' });
      expect(duplicate).toBe(state);
      if (round < 5) { expect(state.phase).toBe('recognizing'); calls++; state = succeed(state); }
    }
    expect(calls).toBe(4);
    expect(state.phase).toBe('review_intents');
    expect(state.mode).toBe(mode);
    expect(state.recognitionRequest).toBeNull();
    expect(state.entries.map(e => e.actor)).toEqual(['girl', 'player', 'girl', 'player', 'girl', 'player', 'girl', 'player', 'girl', 'player']);
    expect(selectPlayerEntries(state).every(e => e.intendedWord === null)).toBe(true);
    expect(gameReducer(state, { type: 'SET_INTENT', entryId: state.entries[0].id, word: 'leak' })).toBe(state);
    state = gameReducer(state, { type: 'SET_INTENT', entryId: state.entries[1].id, word: ' FOX! ' });
    expect(state.entries[1].intendedWord).toBe('fox');
    expect(gameReducer(state, { type: 'SHOW_RESULTS' }).phase).toBe('results');
  });
  it('accepts input only on the player turn and snapshots strokes before request', () => {
    let state = start();
    expect(gameReducer(state, { type: 'STROKES_CHANGED', strokes })).toBe(state);
    state = toDraw(state);
    expect(selectCanFinishDrawing(state)).toBe(false);
    expect(gameReducer(state, { type: 'DONE' })).toBe(state);
    state = done(state);
    expect(selectVisibleStrokes(state)).toEqual(strokes);
    expect(state.entries[1].strokes).not.toBe(strokes);
    expect(gameReducer(state, { type: 'CLEAR' })).toBe(state);
    expect(gameReducer(state, { type: 'SET_INTENT', entryId: state.entries[1].id, word: 'cat' })).toBe(state);
  });
  it('runs five daytime breaths and keeps every completed girl drawing until the player advances', () => {
    let state = start('day');
    let breaths = 0;
    for (let round = 1; round <= 5; round++) {
      expect(state).toMatchObject({ phase: 'girl_breath', round });
      breaths++;
      state = gameReducer(state, { type: 'BREATH_DONE' });
      expect(gameReducer(state, { type: 'BREATH_DONE' })).toBe(state);
      state = gameReducer(state, { type: 'PLAYBACK_DONE' });
      const held = selectVisibleStrokes(state);
      expect(held).toEqual(state.entries[state.entries.length - 1].strokes);
      expect(held.length).toBeGreaterThan(0);
      expect(gameReducer(state, { type: 'PLAYBACK_DONE' })).toBe(state);
      expect(gameReducer(state, { type: 'CLEAR' })).toBe(state);
      expect(selectVisibleStrokes(state)).toBe(held);
      state = done(gameReducer(state, { type: 'YOUR_TURN' }));
      if (round < 5) state = succeed(state);
    }
    expect(breaths).toBe(5);
    expect(state.phase).toBe('review_intents');
    expect(state.entries).toHaveLength(10);
  });
  it('rejects stale/double responses and never selects a falsely matched girl', () => {
    const state = done(toDraw(start()));
    expect(gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: 'stale', result: { guess: 'cat', source: 'api' } })).toBe(state);
    const next = succeed(state, ' FOX! ');
    expect(next.phase).toBe('recognition_error');
    expect(next.error?.code).toBe('uncovered_letter');
    expect(next.entries).toHaveLength(2);
    expect(next.entries[1].recognition?.guess).toBe('fox');
    const valid = succeed(state);
    expect(valid.entries[2].intendedWord).toBe('tree');
    expect(gameReducer(valid, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: 'egg', source: 'api' } })).toBe(valid);
  });
  it('bounds retries to two, restores drawings, and never reuses request ids after back or restart', () => {
    let state = done(toDraw(start()));
    const firstId = state.recognitionRequest!.requestId;
    const fail = () => { state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: null, source: 'api', error: 'secret provider detail', errorCode: 'timeout' } }); };
    for (let i = 0; i < 3; i++) {
      fail();
      expect(state.error?.message).not.toContain('secret');
      if (i < 2) state = gameReducer(state, { type: 'RETRY_RECOGNITION' });
    }
    expect(state.error?.retryable).toBe(false);
    expect(gameReducer(state, { type: 'RETRY_RECOGNITION' })).toBe(state);
    state = gameReducer(state, { type: 'BACK_TO_DRAWING' });
    expect(state.entries).toHaveLength(1);
    expect(selectVisibleStrokes(state)).toEqual(strokes);
    state = gameReducer(state, { type: 'DONE' });
    expect(state.recognitionRequest!.requestId).not.toBe(firstId);
    state = gameReducer(state, { type: 'RETURN_TO_TITLE' });
    state = done(toDraw(gameReducer(state, { type: 'START', mode: 'night', sessionKind: 'api', sketches })));
    expect(state.recognitionRequest!.requestId).not.toBe(firstId);
  });
  it('marks an explicit demo recovery non-comparable and rejects covert mock API output', () => {
    let state = done(toDraw(start()));
    state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: 'cat', source: 'mock' } });
    expect(state.phase).toBe('recognition_error');
    state = gameReducer(state, { type: 'USE_DEMO' });
    expect(state.sessionKind).toBe('demo');
    expect(state.entries.every(e => !e.comparable)).toBe(true);
    state = succeed(state);
    expect(state.phase).toBe('girl_breath');
    expect(state.entries[2].comparable).toBe(false);
  });
  it('offers two bounded retries for unavailable API while retaining the sealed ink', () => {
    let state = done(toDraw(start()));
    const requestIds: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      requestIds.push(state.recognitionRequest!.requestId);
      expect(state.recognitionRequest!.attempt).toBe(attempt);
      state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: null, source: 'api', error: 'unavailable', errorCode: 'unavailable' } });
      expect(state.phase).toBe('recognition_error');
      expect(state.entries).toHaveLength(2);
      expect(state.entries[1].strokes).toEqual(strokes);
      expect(selectVisibleStrokes(state)).toEqual(strokes);
      expect(state.error?.retryable).toBe(attempt < 3);
      const retried = gameReducer(state, { type: 'RETRY_RECOGNITION' });
      if (attempt < 3) state = retried;
      else expect(retried).toBe(state);
    }
    expect(new Set(requestIds).size).toBe(3);
    const restored = gameReducer(state, { type: 'BACK_TO_DRAWING' });
    expect(restored.phase).toBe('player_drawing');
    expect(restored.activeStrokes).toEqual(strokes);
    expect(gameReducer(state, { type: 'USE_DEMO' })).toMatchObject({ phase: 'recognizing', sessionKind: 'demo' });
  });
  it('does not accept invalid coordinates and supports clear and undo without advancing', () => {
    let state = toDraw(start());
    expect(gameReducer(state, { type: 'STROKES_CHANGED', strokes: [{ id: 'bad', points: [{ x: 2, y: 0, t: 0 }] }] })).toBe(state);
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes });
    expect(gameReducer(state, { type: 'UNDO' }).activeStrokes).toEqual([]);
    expect(gameReducer(state, { type: 'CLEAR' }).phase).toBe('player_drawing');
  });
});
