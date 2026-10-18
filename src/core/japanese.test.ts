import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from './gameMachine';
import { calculateScore } from './score';
import { firstLetter, lastLetter, normalizeWord, selectGirlSketch } from './words';
import { girlSketches } from '../data/sketches';
import { japaneseLabelByEnglish, localizeGirlSketches } from '../data/japaneseSketches';
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
    expect(firstLetter('ジャケット', 'ja')).toBe('し');
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
    expect(state.entries.at(-1)?.intendedWord).toBe('りんご');
  });
});
