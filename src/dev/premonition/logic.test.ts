import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../../core/gameMachine';
import type { GameState, GirlSketch, RecognitionResult } from '../../core/types';
import { detectPremonitionTransition, selectPremonition } from './logic';

const ink = [{ id: 'ink', points: [{ x: .2, y: .3, t: 0 }] }];
const sketches: GirlSketch[] = ['cat', 'egg', 'goat', 'tree'].map(word => ({ id: word, word, strokes: ink }));
function pending(state?: GameState): GameState {
  let next = state ?? gameReducer(createInitialState(), { type: 'START', mode: 'day', sessionKind: 'ml', sketches });
  next = gameReducer(next, { type: 'BREATH_DONE' });
  next = gameReducer(next, { type: 'PLAYBACK_DONE' });
  next = gameReducer(next, { type: 'YOUR_TURN' });
  next = gameReducer(next, { type: 'STROKES_CHANGED', strokes: ink });
  return gameReducer(next, { type: 'DONE' });
}
function resolve(state: GameState, result: RecognitionResult = { source: 'ml', guess: 'tree' }): GameState {
  return gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result });
}

describe('runtime-only premonition selection', () => {
  const select = (previousWord: string | null, guess: string | null, language: 'en' | 'ja' = 'en', extra: Partial<RecognitionResult> = {}) =>
    selectPremonition({ previousWord, language, result: { source: 'ml', guess, ...extra }, round: 1, mode: 'day' });
  it('uses matching sounds and no confidence/alternatives heuristics', () => {
    expect(select('cat', 'tree', 'en', { alternatives: ['dog', 'cup', 'bird'] })).toEqual({ expression: 'smile', reason: 'match', durationMs: 240 });
    expect(select('cat', 'dog')).toMatchObject({ expression: 'curious', reason: 'mismatch' });
    expect(select('cat', 'dog', 'en', { uncertain: true })).toMatchObject({ expression: 'thinking', reason: 'uncertain' });
    expect(select('cat', 'tree', 'en', { uncertain: false })).toMatchObject({ expression: 'smile' });
  });
  it.each([
    ['りんご', 'こま'], ['コーヒー', 'いす'], ['おもちゃ', 'やま'], ['らっぱ', 'ぱんだ'],
  ])('reuses Japanese normalization and house rules for %s → %s', (previousWord, guess) => {
    expect(select(previousWord, guess, 'ja').expression).toBe('smile');
  });
  it('prioritizes error/mock/unknown/invalid context and terminal ん over uncertainty', () => {
    expect(select('cat', 'tree', 'en', { uncertain: true, error: 'failed' })).toEqual({ reason: 'error', durationMs: 0 });
    expect(select('cat', 'tree', 'en', { errorCode: 'invalid_response' }).reason).toBe('error');
    expect(select('cat', 'tree', 'en', { source: 'mock', uncertain: true }).reason).toBe('mock');
    expect(select('cat', null, 'en', { uncertain: true }).expression).toBeUndefined();
    expect(select(null, 'tree').reason).toBe('invalid_previous');
    expect(select('???', 'tree').expression).toBeUndefined();
    expect(select('らいおん', 'ねこ', 'ja', { uncertain: true }).reason).toBe('terminal_n');
    expect(select('すいか', 'かばん', 'ja', { uncertain: true }).reason).toBe('terminal_n');
  });
  it.each(['day', 'night'] as const)('limits %s duration and never supplies a fifth inference candidate', mode => {
    const input = { previousWord: 'cat', language: 'en' as const, result: { source: 'api' as const, guess: 'tree' }, round: 1, mode };
    expect(selectPremonition(input).durationMs).toBe(mode === 'day' ? 240 : 160);
    for (const round of [0, 5, NaN, 1.5]) expect(selectPremonition({ ...input, round }).expression).toBeUndefined();
  });
});

describe('accepted reducer transitions', () => {
  it('selects only the accepted result and never mutates state or result', () => {
    const before = pending();
    const after = resolve(before);
    const snapshot = JSON.stringify({ before, after });
    const event = detectPremonitionTransition(before, after);
    expect(event).toMatchObject({ requestId: before.recognitionRequest!.requestId, round: 1, candidate: { expression: 'smile' } });
    expect(JSON.stringify({ before, after })).toBe(snapshot);
    expect(detectPremonitionTransition(null, after)).toBeNull();
    expect(detectPremonitionTransition(after, after)).toBeNull();
    expect(detectPremonitionTransition(before, JSON.parse(JSON.stringify(after)))).toBeNull();
  });
  it('rejects canceled/stale responses, cross-session replacement, and errors', () => {
    const before = pending();
    const after = resolve(before);
    expect(detectPremonitionTransition(before, gameReducer(before, { type: 'RECOGNITION_RESOLVED', requestId: 'old', result: { source: 'ml', guess: 'tree' } }))).toBeNull();
    expect(detectPremonitionTransition(before, { ...after, sessionId: 999 })).toBeNull();
    expect(detectPremonitionTransition(before, { ...after, recognitionAttempt: 999 })).toBeNull();
    expect(detectPremonitionTransition(before, resolve(before, { source: 'ml', guess: null, error: 'offline' }))).toBeNull();
    expect(detectPremonitionTransition(before, resolve(before, { source: 'mock', guess: 'tree' }))).toBeNull();
    expect(detectPremonitionTransition(before, { ...after, phase: 'player_drawing' })).toBeNull();
  });
  it('records a successful retry exactly by its new request', () => {
    const first = pending();
    const error = resolve(first, { source: 'ml', guess: null, error: 'offline', errorCode: 'network' });
    const retry = gameReducer(error, { type: 'RETRY_RECOGNITION' });
    const after = resolve(retry);
    expect(retry.recognitionRequest!.requestId).not.toBe(first.recognitionRequest!.requestId);
    expect(detectPremonitionTransition(retry, after)?.requestId).toBe(retry.recognitionRequest!.requestId);
    expect(detectPremonitionTransition(error, after)).toBeNull();
  });
  it('records all four candidates but restricts presentation to player rounds 1 and 3', () => {
    let before = pending();
    for (let round = 1; round <= 4; round++) {
      const after = resolve(before);
      expect(detectPremonitionTransition(before, after)).toMatchObject({ round, ...(round % 2 === 0 ? { suppressionReason: 'frequency' } : {}) });
      if (round % 2) expect(detectPremonitionTransition(before, after)?.suppressionReason).toBeUndefined();
      before = pending(after);
    }
    expect(before.phase).toBe('review_intents');
    expect(before.recognitionRequest).toBeNull();
  });
  it('gives existing girl correction presentation priority', () => {
    const before = pending();
    expect(detectPremonitionTransition(before, { ...resolve(before), girlCorrection: sketches[1] })).toMatchObject({ suppressionReason: 'girl_correction' });
  });
});
