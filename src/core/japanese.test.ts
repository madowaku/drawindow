import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from './gameMachine';
import { calculateScore } from './score';
import { chainLettersMatch, firstLetter, lastLetter, normalizeWord, selectGirlSketch } from './words';
import { girlSketches } from '../data/sketches';
import { japaneseExtraSketches } from '../data/japaneseExtraSketches';
import { easyJapaneseStarters, japaneseLabelByEnglish, localizeGirlSketches, withJapaneseStarter } from '../data/japaneseSketches';
import type { DrawingEntry, Stroke } from './types';

const strokes: Stroke[] = [{ id: 'a', points: [{ x: .1, y: .1, t: 0 }, { x: .8, y: .8, t: 100 }] }];

describe('Japanese word boundaries', () => {
  it('normalizes kana safely, rejects ambiguous kanji and arbitrary text', () => {
    expect(normalizeWord(' ネコ ', 'ja')).toBe('ねこ');
    expect(normalizeWord('「ｶﾀｶﾅ！」', 'ja')).toBe('かたかな');
    expect(normalizeWord('猫', 'ja')).toBeNull();
    expect(normalizeWord('ねこ123', 'ja')).toBeNull();
    expect(normalizeWord('ねこ いぬ', 'ja')).toBeNull();
    expect(normalizeWord('<script>', 'ja')).toBeNull();
    expect(normalizeWord('cat', 'ja')).toBeNull();
    expect(normalizeWord('りんご', 'en')).toBeNull();
  });
  it('applies small kana and long-vowel rules to the chain, not to labels', () => {
    expect(firstLetter('ジャケット', 'ja')).toBe('じ');
    expect(lastLetter('でんしゃ', 'ja')).toBe('や');
    expect(lastLetter('コーヒー', 'ja')).toBe('い');
    expect(lastLetter('ケーキ', 'ja')).toBe('き');
    expect(lastLetter('りんご', 'ja')).toBe('ご');
    expect(lastLetter('らいおん', 'ja')).toBe('ん');
    expect(lastLetter('ふぁ', 'ja')).toBe('あ');
    expect(lastLetter('ーー', 'ja')).toBeNull();
  });
  it('uses actual Japanese names without changing art or English catalogue metadata', () => {
    const localized = localizeGirlSketches(girlSketches, 'ja');
    expect(localized).toHaveLength(girlSketches.length);
    expect(localized[0].word).toBe('りんご');
    expect(localized[0].strokes).toBe(girlSketches[0].strokes);
    expect(girlSketches[0].word).toBe('apple');
    expect(Object.keys(japaneseLabelByEnglish).length).toBeGreaterThan(50);
    expect(selectGirlSketch(localized, 'ら', [], 'ja')?.word).toBe('らいおん');
    expect(localizeGirlSketches(girlSketches, 'en')[0].word).toBe('apple');
  });
  it('scores kana chain and keeps ん restarts marked as broken', () => {
    const words = ['りんご', 'ごりら', 'らっぱ', 'ぱんだ', 'だるま', 'まくら', 'らいおん', 'んま', 'まつり', 'りす'];
    const entries: DrawingEntry[] = words.map((intendedWord, index) => ({
      id: String(index), actor: index % 2 ? 'player' : 'girl',
      round: Math.floor(index / 2) + 1, strokes: [], intendedWord, recognition: null, comparable: true,
      ...(index === 7 ? { chainRestart: true } : {}),
    }));
    const result = calculateScore(entries, 'api', 'ja');
    expect(result).toMatchObject({ connectedCount: 8, knownPairCount: 9, bestChain: 6, perfect: false });
    expect(result.links[6].status).toBe('broken');
  });
  it('accepts voiced and semi-voiced kana without loosening English rules', () => {
    expect(chainLettersMatch('ご', 'こ', 'ja')).toBe(true);
    expect(chainLettersMatch('ぎ', 'き', 'ja')).toBe(true);
    expect(chainLettersMatch('ぱ', 'は', 'ja')).toBe(true);
    expect(chainLettersMatch('ぷ', 'ぶ', 'ja')).toBe(true);
    expect(chainLettersMatch('ご', 'か', 'ja')).toBe(false);
    expect(chainLettersMatch('g', 'k', 'en')).toBe(false);
    expect(chainLettersMatch('g', 'g', 'en')).toBe(true);
    const localized = [...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches];
    expect(firstLetter(selectGirlSketch(localized, 'ご', [], 'ja')?.word, 'ja')).toBe('こ');
    expect(firstLetter(selectGirlSketch(localized, 'ぎ', [], 'ja')?.word, 'ja')).toBe('き');
    expect(japaneseExtraSketches.every(sketch => sketch.readability === 'soft' && sketch.strokes.length > 0)).toBe(true);
  });
  it('rotates Japanese DAY and NIGHT starters through easy final sounds', () => {
    const localized = localizeGirlSketches(girlSketches, 'ja');
    expect(easyJapaneseStarters.day.length).toBeGreaterThan(3);
    expect(withJapaneseStarter(localized, 'day', 0)[0].word).toBe('すいか');
    expect(withJapaneseStarter(localized, 'day', 1)[0].word).toBe('かさ');
    expect(withJapaneseStarter(localized, 'night', 0)[0].word).toBe('つき');
    expect(withJapaneseStarter(localized, 'night', 1)[0].word).toBe('ほし');
    expect(withJapaneseStarter(localized, 'day', 2)[0].word).toBe('つき');
    expect(withJapaneseStarter(localized, 'day', 0)).toHaveLength(localized.length);
    expect(localized[0].word).toBe('りんご');
  });
  it('scores ご→こ and ぎ→き as connected in Japanese only', () => {
    const entries: DrawingEntry[] = ['りんご', 'こま', 'まくら', 'らいおん', 'ねぎ', 'きのこ', 'こあら', 'らっぱ', 'はな', 'なす']
      .map((intendedWord, index) => ({
        id: String(index), actor: index % 2 ? 'player' : 'girl',
        round: Math.floor(index / 2) + 1, strokes: [], intendedWord, recognition: null, comparable: true,
      }));
    const score = calculateScore(entries, 'api', 'ja');
    expect(score.links[0].status).toBe('connected');
    expect(score.links[4].status).toBe('connected');
    expect(score.links[3].status).toBe('broken');
    expect(score.links[7].status).toBe('connected');
  });
  it('continues after the recognized object ends in ん with a fresh honest link', () => {
    const sketches = localizeGirlSketches(girlSketches, 'ja');
    let state = gameReducer(createInitialState('day', 'ja'), { type: 'START', mode: 'day', sessionKind: 'api', sketches });
    for (const type of ['BREATH_DONE', 'PLAYBACK_DONE', 'YOUR_TURN'] as const) state = gameReducer(state, { type });
    state = gameReducer(state, { type: 'STROKES_CHANGED', strokes });
    state = gameReducer(state, { type: 'DONE' });
    const requestId = state.recognitionRequest!.requestId;
    state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId, result: { guess: 'らいおん', source: 'api' } });
    expect(state.phase).toBe('girl_breath');
    expect(state.round).toBe(2);
    expect(state.entries.at(-1)?.chainRestart).toBe(true);
    expect(state.entries.at(-1)?.intendedWord).not.toBe('りんご');
    expect(state.entries.at(-1)?.intendedWord).not.toBeNull();
  });
});
