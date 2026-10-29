// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { calculateScore } from '../core/score';
import { gameSketches } from '../data/gameSketches';
import { decodeSession, encodeSession } from '../lib/sessionStorage';
import { recoveryReducer } from './RecognitionRecoveryPage';
import { compareFreehand, freehandExport, freehandCsv, freehandSummary, type FreehandSample } from './freehandComparison';
import { imageOnlyQuickDrawResult } from '../services/quickDrawScores';
import { preprocessQuickDraw } from '../services/quickDrawPreprocess';
import type { GameState, Language, RecognitionFailureReason } from '../core/types';
import audit from '../../docs/quickdraw-unmapped-v013.json';
import { createRecognitionRunner } from '../services/recognizer';
import { quickDrawJapanese } from '../services/quickDrawJapanese';

const ink = [{ id: 'synthetic-only', points: [{ x: .1, y: .2, t: 0 }, { x: .7, y: .8, t: 30 }] }];
function drawing(state: GameState) {
  for (let i = 0; i < 8; i++) {
    if (state.phase === 'girl_breath') state = gameReducer(state, { type: 'BREATH_DONE' });
    else if (state.phase === 'girl_drawing') state = gameReducer(state, { type: 'PLAYBACK_DONE' });
    else if (state.phase === 'girl_notice' || state.phase === 'girl_flustered') state = gameReducer(state, { type: 'GIRL_OOPS_BEAT_DONE', sessionId: state.sessionId, round: state.round, phase: state.phase });
    else break;
  }
  return gameReducer(state, { type: 'YOUR_TURN' });
}
function fail(state: GameState, reason: RecognitionFailureReason) {
  state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: ink });
  state = gameReducer(state, { type: 'DONE' });
  return gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId,
    result: { source: 'ml', guess: null, errorCode: reason === 'model_unavailable' ? 'unavailable' : 'invalid_response', failureReason: reason } });
}
describe('v0.13 honest diagnosis and recovery', () => {
  it.each(['en', 'ja'] as const)('separates low score, unmapped and invalid output in %s', language => {
    expect(imageOnlyQuickDrawResult([{ label: 'cat', score: .0499 }], language)).toMatchObject({ guess: null, failureReason: 'low_score', errorCode: 'invalid_response' });
    for (const score of [NaN, Infinity, -1, 2]) expect(imageOnlyQuickDrawResult([{ label: 'cat', score }], language).failureReason).toBe('invalid_output');
    expect(imageOnlyQuickDrawResult([], language).failureReason).toBe('invalid_output');
    expect(imageOnlyQuickDrawResult([{ label: 'aircraft carrier', score: .9 }, { label: 'cat', score: .08 }], 'ja')).toMatchObject({ guess: null, failureReason: 'unmapped' });
    expect(imageOnlyQuickDrawResult([{ label: 'cat', score: .05 }], language).guess).toBe(language === 'ja' ? 'ねこ' : 'cat');
  });
  it.each(['en', 'ja'] as const)('preserves ten images, nine links, saves, final no-inference and explicit consent in %s', language => {
    for (const mode of ['day', 'night'] as const) {
      let state = gameReducer(createInitialState(mode, language), { type: 'START', sessionKind: 'ml', mode, sketches: gameSketches(language) });
      for (let round = 1; round <= 5; round++) {
        state = drawing(state);
        if (round === 5) {
          state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: ink });
          state = gameReducer(state, { type: 'DONE' }); break;
        }
        state = fail(state, round === 2 ? 'model_unavailable' : 'low_score');
        expect(state.activeStrokes).toEqual(ink);
        expect(gameReducer(state, { type: 'CONTINUE_UNRECOGNIZED' })).toBe(state); // Production cannot rescue.
        const restored = decodeSession(encodeSession(state, {}))!.state;
        expect(restored.entries.at(-1)?.recognition?.failureReason).toBe(round === 2 ? 'model_unavailable' : 'low_score');
        state = recoveryReducer(restored, { type: 'CONTINUE_UNRECOGNIZED' });
        expect(state.round).toBe(round + 1);
        expect(state.entries[state.entries.length - 2].strokes).toEqual(ink);
        state = decodeSession(encodeSession(state, {}))!.state;
        expect(state.entries[state.entries.length - 2].nonComparableReason).toBe('recognition_recovery');
        expect(recoveryReducer(state, { type: 'CONTINUE_UNRECOGNIZED' })).toBe(state);
      }
      expect(state.phase).toBe('review_intents'); expect(state.entries).toHaveLength(10);
      expect(state.entries.at(-1)?.recognition).toBeNull(); expect(state.recognitionRequest).toBeNull();
      // Even coincidentally matching post-review intentions cannot repair a rescued link.
      const named = state.entries.map(e => ({ ...e, intendedWord: language === 'ja' ? 'しし' : 'eye' }));
      const score = calculateScore(named, 'ml', language);
      expect(score.links).toHaveLength(9); expect(score.links.filter(e => e.status === 'unknown')).toHaveLength(4);
      expect(score.connectedCount).toBe(5); expect(score.perfect).toBe(false);
      expect(calculateScore(decodeSession(encodeSession({ ...state, entries: named }, {}))!.state.entries, 'ml', language).perfect).toBe(false);
    }
  });
  it('blocks unchanged local redraw retries, preserves undo/redo, and still retries unknown or transient causes', () => {
    const start = () => drawing(gameReducer(createInitialState(), { type: 'START', mode: 'day', sessionKind: 'ml', sketches: gameSketches('en') }));
    for (const reason of ['low_score', 'unmapped', 'invalid_input'] as const) {
      let state = fail(start(), reason); expect(state.error?.retryable).toBe(false);
      expect(gameReducer(state, { type: 'RETRY_RECOGNITION' })).toBe(state);
      state = gameReducer(state, { type: 'BACK_TO_DRAWING' });
      state = decodeSession(encodeSession(state, {}))!.state;
      expect(state.activeStrokes).toEqual(ink);
      state = gameReducer(state, { type: 'DONE' }); expect(state.phase).toBe('recognition_error');
      state = gameReducer(state, { type: 'BACK_TO_DRAWING' });
      state = gameReducer(state, { type: 'CLEAR' });
      state = gameReducer(state, { type: 'UNDO' }); expect(state.activeStrokes).toEqual(ink);
      state = gameReducer(state, { type: 'REDO' }); expect(state.activeStrokes).toEqual([]);
      state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: [...ink, { id: 'added', points: [{ x: .2, y: .8, t: 40 }] }] });
      expect(gameReducer(state, { type: 'DONE' }).phase).toBe('recognizing');
    }
    let state = fail(start(), 'model_unavailable'); expect(state.error?.retryable).toBe(true);
    state = gameReducer(state, { type: 'RETRY_RECOGNITION' }); expect(state.phase).toBe('recognizing');
  });
  it('audits exactly 168 formerly unsupported classes and adopts only reviewed direct nouns', () => {
    expect(audit.classes).toHaveLength(168); expect(new Set(audit.classes.map(c => c.label)).size).toBe(168);
    expect(audit.classes.filter(c => c.adopted)).toHaveLength(32);
    for (const row of audit.classes.filter(c => c.adopted)) {
      expect(row.category).toBe('A'); expect(quickDrawJapanese[row.label]).toBe(row.candidate);
    }
    expect(quickDrawJapanese.monkey).toBe('さる'); expect(quickDrawJapanese.bird).toBe('とり');
  });
  it('compares identical strokes without passing intent and excludes synthetic/unverified/unjudged accuracy', async () => {
    const inputs: unknown[] = [];
    const compared = await compareFreehand(ink, 'ja', (_preprocess, ranking) => ({ recognize: async input => {
      inputs.push(structuredClone(input)); ranking([{ label: 'cat', score: .7 }]); return { source: 'ml', guess: 'ねこ' };
    } }));
    expect(inputs).toHaveLength(6);
    for (const input of inputs) { expect(Object.keys(input as object).sort()).toEqual(['language', 'requestId', 'strokes']); expect((input as {strokes: unknown}).strokes).toEqual(ink); }
    const sample: FreehandSample = { id: 1, intent: '=secret intent', language: 'ja', provenance: 'synthetic', partition: 'development', inputTypes: ['mouse'], ...compared, strokes: ink };
    expect(freehandSummary([sample], 'development')[0].drawings).toBe(0);
    sample.provenance = 'human'; expect(freehandSummary([sample], 'development')[0].judged).toBe(0);
    expect(freehandSummary([sample], 'holdout')[0].drawings).toBe(0);
    expect(freehandExport([sample]).samples[0]).not.toHaveProperty('strokes');
    expect(freehandExport([sample], true).samples[0].strokes).toEqual(ink);
    expect(freehandCsv([sample])).toContain("'=secret intent");
  });
  it('rejects malformed points and leaves default preprocessing unchanged', () => {
    expect(preprocessQuickDraw([{ id: 'bad', points: [null] }] as never)).toBeNull();
    expect(preprocessQuickDraw(ink)).toEqual(preprocessQuickDraw(ink, { paddingPx: 2.5, strokeRadiusHiRes: 3, normalization: 'bounds' }));
    expect(preprocessQuickDraw(ink, { normalization: 'canvas' })).not.toEqual(preprocessQuickDraw(ink));
  });
});

it('preserves the local source for a runner execution failure instead of misclassifying it as an API answer', async () => {
  const runner = createRecognitionRunner({ recognize: async () => { throw Error('synthetic'); } }, { failureSource: 'ml' });
  expect(await runner.recognize({ requestId: 'ml-runner', strokes: ink })).toMatchObject({ source: 'ml', failureReason: 'model_unavailable' });
});
