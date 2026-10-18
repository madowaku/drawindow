import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { calculateScore } from '../core/score';
import { girlSketches } from '../data/sketches';
import type { GameState } from '../core/types';
import { LiveAcceptanceRecorder } from './liveAcceptance';

function journey(recorder: LiveAcceptanceRecorder) {
  let state = gameReducer(createInitialState(), { type: 'START', mode: 'day', sessionKind: 'api', sketches: girlSketches });
  const observe = (next: GameState) => { state = next; recorder.observe(state); };
  observe(state);
  for (let round = 1; round <= 5; round++) {
    for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) observe(gameReducer(state, { type }));
    observe(gameReducer(state, { type: 'STROKES_CHANGED', strokes: [{ id: 'private-stroke', points: [{ x: .2, y: .2, t: 0 }] }] }));
    observe(gameReducer(state, { type: 'DONE' }));
    if (round < 5) {
      recorder.recordAttempt({ requestId: state.recognitionRequest!.requestId, httpStatus: 200, latencyMs: 1234, retryAfterMs: null, result: { guess: ['dog', 'house', 'fish', 'cat'][round - 1], source: 'api' } });
      observe(gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { guess: ['dog', 'house', 'fish', 'cat'][round - 1], source: 'api' } }));
    }
  }
  return { get state() { return state; }, observe };
}

describe('private local LIVE acceptance evidence', () => {
  it('withholds the report until reveal and independently checks all nine links after four different API fixtures', () => {
    const recorder = new LiveAcceptanceRecorder(() => 100);
    const run = journey(recorder);
    expect(recorder.report()).toBeNull();
    for (const [i, entry] of run.state.entries.filter(e => e.actor === 'player').entries()) run.observe(gameReducer(run.state, { type: 'SET_INTENT', entryId: entry.id, word: ['dog', 'house', 'fish', '', 'tree'][i] }));
    expect(recorder.report()).toBeNull();
    run.observe(gameReducer(run.state, { type: 'SHOW_RESULTS' }));
    const report = recorder.report()!;
    expect(report.attempts).toHaveLength(4);
    expect(report.entries).toHaveLength(10);
    expect(report.selectionChecks).toHaveLength(4);
    expect(report.selectionChecks.every(check => check.matches && check.inCatalogue)).toBe(true);
    expect(report.entries[9].recognition).toBeNull();
    expect(report.independentScore.links.map(link => link.status)).toEqual(calculateScore(run.state.entries, 'api').links.map(link => link.status));
    expect(report.scoreMatches).toBe(true);
    expect(report.independentScore.knownPairCount).toBe(7);
    expect(report.humanAttestation).toBe(false);
    expect(JSON.stringify(report)).not.toMatch(/private-stroke|imageDataUrl|pressure|points|headers/);
  });

  it('keeps failed attempts separate and ignores late records from the previous session', () => {
    const recorder = new LiveAcceptanceRecorder();
    const run = journey(recorder);
    recorder.recordAttempt({ requestId: '1:1:5', httpStatus: 503, latencyMs: 5, retryAfterMs: null, result: { guess: null, source: 'api', errorCode: 'unavailable', error: 'do not retain raw provider text' } });
    run.observe(gameReducer(run.state, { type: 'SHOW_RESULTS' }));
    expect(recorder.report()!.attempts).toHaveLength(5);
    expect(JSON.stringify(recorder.report())).not.toContain('do not retain');
    run.observe(gameReducer(run.state, { type: 'START', mode: 'night', sessionKind: 'api', sketches: girlSketches }));
    recorder.recordAttempt({ requestId: '1:2:99', httpStatus: 200, latencyMs: 5, retryAfterMs: null, result: { guess: 'cat', source: 'api' } });
    expect(recorder.report()).toBeNull();
    run.observe({ ...run.state, phase: 'results' });
    expect(recorder.report()!.attempts).toEqual([]);
  });
});
