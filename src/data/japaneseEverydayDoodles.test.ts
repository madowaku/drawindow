import { describe, expect, it } from 'vitest';
import { japaneseEverydayDoodles } from './japaneseEverydayDoodles';
import { japaneseClassicDoodles } from './japaneseClassicDoodles';
import { japaneseDoodlePack } from './japaneseDoodlePack';
import { japaneseExtraSketches } from './japaneseExtraSketches';
import { girlSketches } from './sketches';
import { localizeGirlSketches } from './japaneseSketches';
import { chainLettersMatch, firstLetter, lastLetter, selectGirlSketch } from '../core/words';

const existing = [...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles];
const catalogue = [...existing, ...japaneseEverydayDoodles];
describe('Japanese everyday vocabulary', () => {
  it('adds 12 new nouns and IDs rather than duplicate drawings of existing nouns', () => {
    expect(japaneseEverydayDoodles.map(s => s.word)).toEqual([
      'いちご','ごぼう','きゅうり','なす','だるま','くし','すいとう','うでわ','けしごむ','むぎ','くつした','たけのこ',
    ]);
    expect(new Set(catalogue.map(s => s.id)).size).toBe(catalogue.length);
    expect(new Set(japaneseEverydayDoodles.map(s => s.word)).size).toBe(12);
    for (const item of japaneseEverydayDoodles) expect(existing.some(s => s.word === item.word)).toBe(false);
    expect(localizeGirlSketches(girlSketches, 'en')).toEqual(girlSketches);
  });
  it('keeps bounded sparse timed strokes and a nonterminal playable exit for every noun', () => {
    for (const item of japaneseEverydayDoodles) {
      expect(item.strokes.length).toBeGreaterThanOrEqual(3);
      expect(item.strokes.length).toBeLessThanOrEqual(12);
      const times = item.strokes.flatMap(s => s.points.map(p => p.t));
      expect(times.every((t,i) => Number.isFinite(t) && t >= 0 && t <= 1200.000001 && (!i || t >= times[i-1]))).toBe(true);
      for (const stroke of item.strokes) for (const p of stroke.points) {
        expect(Number.isFinite(p.x) && p.x >= .03 && p.x <= .97).toBe(true);
        expect(Number.isFinite(p.y) && p.y >= .03 && p.y <= .97).toBe(true);
      }
      const tail = lastLetter(item.word, 'ja');
      expect(tail).not.toBe('ん');
      const next = selectGirlSketch(catalogue, tail!, [item.id], 'ja');
      expect(next).not.toBeNull();
      expect(chainLettersMatch(tail, firstLetter(next!.word, 'ja'), 'ja')).toBe(true);
      expect(lastLetter(next!.word, 'ja')).not.toBe('ん');
    }
  });
  it('retains ambiguity warnings instead of silently certifying uncertain shapes', () => {
    for (const word of ['ごぼう', 'すいとう', 'うでわ', 'むぎ', 'けしごむ']) {
      expect(japaneseEverydayDoodles.find(s => s.word === word)?.readability).toBe('soft');
    }
  });
});
