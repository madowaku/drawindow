import { describe, expect, it } from 'vitest';
import { girlSketches } from './sketches';
import { japaneseDoodlePack } from './japaneseDoodlePack';
import { japaneseExtraSketches } from './japaneseExtraSketches';
import { localizeGirlSketches, withJapaneseStarter } from './japaneseSketches';
import { chainLettersMatch, firstLetter, lastLetter, selectGirlSketch } from '../core/words';
import { gameReducer, createInitialState } from '../core/gameMachine';
import type { GameState, Stroke } from '../core/types';

const japanese = [...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches, ...japaneseDoodlePack];
const basicKana = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ'];
const dummy: Stroke[] = [{ id: 'hand', points: [{ x: .2, y: .2, t: 0 }, { x: .7, y: .7, t: 120 }] }];

describe('Japanese drawable-word expansion', () => {
  it('ships 41 distinct new doodles, without changing any English asset', () => {
    expect(japaneseDoodlePack).toHaveLength(41);
    expect(new Set(japaneseDoodlePack.map(sketch => sketch.word)).size).toBe(41);
    expect(japanese).toHaveLength(girlSketches.length + japaneseExtraSketches.length + 41);
    expect(new Set(japanese.map(sketch => sketch.id)).size).toBe(japanese.length);
    expect(girlSketches[0].word).toBe('apple');
    expect(withJapaneseStarter(japanese, 'day', 0)[0].word).toBe('すいか');
  });

  it('covers all 44 standard base kana sounds with pronounceable object drawings', () => {
    expect(basicKana).toHaveLength(44);
    for (const syllable of basicKana) {
      const next = selectGirlSketch(japanese, syllable, [], 'ja');
      expect(next, `No playable illustration for ${syllable}`).not.toBeNull();
      expect(chainLettersMatch(syllable, firstLetter(next?.word, 'ja'), 'ja')).toBe(true);
    }
  });

  it('keeps all new stroke geometry bounded and at legible duration, with no text tricks', () => {
    for (const doodle of japaneseDoodlePack) {
      expect(doodle.word).toMatch(/^[ぁ-ゖー]+$/);
      expect(doodle.readability === 'safe' || doodle.readability === 'soft').toBe(true);
      expect(doodle.durationMs).toBeGreaterThanOrEqual(900);
      expect(doodle.durationMs).toBeLessThanOrEqual(1500);
      expect(doodle.strokes.length).toBeGreaterThanOrEqual(2);
      for (const stroke of doodle.strokes) {
        expect(stroke.points.length).toBeGreaterThan(0);
        for (const point of stroke.points) {
          expect(Number.isFinite(point.x) && point.x >= 0 && point.x <= 1).toBe(true);
          expect(Number.isFinite(point.y) && point.y >= 0 && point.y <= 1).toBe(true);
          expect(Number.isFinite(point.t) && point.t >= 0).toBe(true);
        }
      }
    }
  });

  it('prefers a continuing picture over an exact but terminal ん candidate', () => {
    const sketches = [
      { id: 'bad', word: 'らいおん', strokes: dummy, readability: 'safe' as const },
      { id: 'good', word: 'らっぱ', strokes: dummy, readability: 'safe' as const },
      { id: 'go', word: 'はな', strokes: dummy, readability: 'safe' as const },
      { id: 'nope', word: 'ねこ', strokes: dummy, readability: 'safe' as const },
    ];
    expect(selectGirlSketch(sketches, 'ら', [], 'ja')?.word).toBe('らっぱ');
    expect(selectGirlSketch(sketches, 'ら', ['good'], 'ja')?.word).toBe('らっぱ');
  });

  it('resolves troublesome kana to new illustrations instead of uncovered-letter failures', () => {
    for (const [tail, allowed] of [
      ['ご', 'こ'], ['ぎ', 'き'], ['ぜ', 'せ'], ['ぢ', 'ち'], ['で', 'て'],
      ['め', 'め'], ['る', 'る'], ['わ', 'わ'], ['ぬ', 'ぬ'],
    ] as const) {
      const next = selectGirlSketch(japanese, tail, [], 'ja');
      expect(next, `No successor for ${tail}`).not.toBeNull();
      expect(chainLettersMatch(tail, firstLetter(next?.word, 'ja'), 'ja')).toBe(true);
      expect(firstLetter(next?.word, 'ja')).toBe(allowed);
    }
  });

  it('runs five honest Japanese exchanges through varying phonetic guesses', () => {
    const sketches = withJapaneseStarter(japanese, 'day', 1);
    let state: GameState = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'api', sketches });
    expect(state.entries[0]?.intendedWord).toBe('かさ');
    for (const [round, guess] of ['ねぎ', 'てがみ', 'くじら', 'はな', 'さかな'].entries()) {
      for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) state = gameReducer(state, { type });
      state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: dummy });
      state = gameReducer(state, { type: 'DONE' });
      if (round < 4) {
        const requestId = state.recognitionRequest!.requestId;
        state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId, result: { source: 'api', guess } });
        expect(state.phase).toBe('girl_breath');
        const next = state.entries.at(-1);
        expect(chainLettersMatch(lastLetter(guess, 'ja'), firstLetter(next?.intendedWord, 'ja'), 'ja')).toBe(true);
      }
    }
    expect(state.phase).toBe('review_intents');
    expect(state.entries).toHaveLength(10);
  });
});
