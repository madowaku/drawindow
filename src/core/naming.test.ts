import { describe, expect, it } from 'vitest';
import { gameReducer, createInitialState } from './gameMachine';
import { normalizeWord, lastLetter } from './words';
import { calculateScore } from './score';
import type { GameState, GirlSketch, RecognitionResult, Stroke } from './types';

const strokes: Stroke[] = [{ id: 's', points: [{ x: .2, y: .3, t: 0 }, { x: .6, y: .7, t: 100 }] }];
const sketches: GirlSketch[] = ['ようなし', 'すいか', 'しまうま'].map((word, i) => ({ id: `s${i}`, word, strokes }));
function recognized(result: RecognitionResult): GameState {
  let state = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'api', sketches });
  for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) state = gameReducer(state, { type });
  state = gameReducer(state, { type: 'STROKES_CHANGED', strokes });
  state = gameReducer(state, { type: 'DONE' });
  return gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result });
}
function intention(state: GameState, word: string) {
  return gameReducer({ ...state, phase: 'review_intents' }, { type: 'SET_INTENT', entryId: state.entries[1].id, word });
}

describe('asymmetric Japanese names', () => {
  it.each([
    ['ようなし', 'ようなし', 'し'], ['ラ・フランス', 'らふらんす', 'す'],
    ['ラフランス', 'らふらんす', 'す'], ['犬', 'いぬ', 'ぬ'],
    ['柴犬', 'しばいぬ', 'ぬ'], ['鳥', 'とり', 'り'], ['雀', 'すずめ', 'め'],
    ['花', 'はな', 'な'], ['向日葵', 'ひまわり', 'り'],
  ])('keeps the reading of %s rather than a picture canonical name', (label, reading, tail) => {
    expect(normalizeWord(label, 'ja')).toBe(reading);
    expect(lastLetter(label, 'ja')).toBe(tail);
  });

  it('keeps Shizuku canonical, player intention and recognition separately with their real readings', () => {
    const state = intention(recognized({ guess: 'ラ・フランス', source: 'api' }), 'ようなし');
    expect(state.entries[0].intendedWord).toBe('ようなし');
    expect(state.entries[0].naming?.canonical).toMatchObject({ label: 'ようなし', reading: 'ようなし' });
    expect(state.entries[1].intendedWord).toBe('ようなし');
    expect(state.entries[1].recognition?.guess).toBe('らふらんす');
    expect(state.entries[1].naming?.recognition).toMatchObject({ label: 'ラ・フランス', reading: 'らふらんす' });
    expect(state.entries[1].naming?.intention).toMatchObject({ label: 'ようなし', reading: 'ようなし' });
    expect(state.entries[1].naming?.meaning).toMatchObject({ relation: 'narrower', certainty: 'unverified' });
    expect(state.entries[2].intendedWord).toBe('すいか');
    const stripped = state.entries.map(({ naming: _, ...entry }) => entry);
    expect(calculateScore(state.entries, 'api', 'ja')).toEqual(calculateScore(stripped, 'api', 'ja'));
    expect(calculateScore(state.entries, 'api', 'ja').links[1]).toMatchObject({ fromLetter: 'し', toLetter: 'す', status: 'broken' });
  });

  it.each([
    ['わんこ', '犬', 'equivalent'], ['いぬ', '柴犬', 'narrower'],
    ['しばいぬ', '犬', 'broader'], ['とり', 'すずめ', 'narrower'],
    ['花', 'ひまわり', 'narrower'], ['いぬ', '花', 'different'],
    ['ねこ', 'すずめ', 'unknown'],
  ])('records %s / %s as %s without turning related concepts into synonyms', (intent, guess, relation) => {
    const state = intention(recognized({ guess, source: 'api' }), intent);
    expect(state.entries[1].naming?.meaning?.relation).toBe(relation);
  });

  it('never chooses a more convenient alternative or discards declared uncertainty', () => {
    const state = intention(recognized({ guess: 'ようなし', alternatives: ['ラ・フランス'], uncertain: true, source: 'api' }), 'ラ・フランス');
    expect(state.entries[1].recognition?.guess).toBe('ようなし');
    expect(state.entries[2].intendedWord).toBe('しまうま');
    expect(state.entries[1].naming?.meaning?.certainty).toBe('uncertain');
    expect(state.entries[1].naming?.intention?.reading).toBe('らふらんす');
  });

  it('does not accept unknown kanji or turn a phrase/unsafe string into a dictionary word', () => {
    for (const value of ['秘密', '犬と花', '<犬>', 'ラ・フランスかようなし']) expect(normalizeWord(value, 'ja')).toBeNull();
    expect(normalizeWord('らふらんす', 'ja')).not.toBe(normalizeWord('ようなし', 'ja'));
  });

  it('does not silently interpret the ambiguous reading はな as 花 instead of 鼻', () => {
    const state = intention(recognized({ guess: 'ひまわり', source: 'api' }), 'はな');
    expect(state.entries[1].naming?.intention?.ambiguous).toBe(true);
    expect(state.entries[1].naming?.meaning).toMatchObject({ relation: 'unknown', certainty: 'uncertain' });
    expect(intention(recognized({ guess: '花', source: 'api' }), '鼻').entries[1].naming?.meaning?.relation).toBe('different');
  });

  it('knows the concept of Shizuku own authored flower while leaving player はな ambiguous', () => {
    const state = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'api', sketches: [{ id: 'shizuku-style-v01-flower', word: 'はな', strokes }] });
    expect(state.entries[0].naming?.canonical).toMatchObject({ label: 'はな', reading: 'はな', conceptId: 'flower' });
    expect(state.entries[0].naming?.canonical?.ambiguous).not.toBe(true);
  });
});
