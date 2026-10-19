import { describe, expect, it } from 'vitest';
import { getBilingualV08Doodles, bilingualV08Words } from './bilingualV08Doodles';
import { girlSketches } from './sketches';
import { localizeGirlSketches } from './japaneseSketches';
import { japaneseExtraSketches } from './japaneseExtraSketches';
import { japaneseDoodlePack } from './japaneseDoodlePack';
import { japaneseClassicDoodles } from './japaneseClassicDoodles';
import { japaneseEverydayDoodles } from './japaneseEverydayDoodles';
import { lastLetter, selectGirlSketch } from '../core/words';

describe('v0.8 bilingual sketch pack', () => {
  it('adds nine new nouns per language, each linked to identical strokes', () => {
    const ja = getBilingualV08Doodles('ja'), en = getBilingualV08Doodles('en');
    expect(ja).toHaveLength(9);
    expect(en).toHaveLength(9);
    expect(bilingualV08Words).toHaveLength(9);
    expect(new Set(ja.map(x => x.id)).size).toBe(9);
    expect(new Set(ja.map(x => x.word)).size).toBe(9);
    expect(new Set(en.map(x => x.word)).size).toBe(9);
    const existingJa = [...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches,
      ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles];
    for (let i=0; i<9; i++) {
      expect(existingJa.some(x => x.word === ja[i].word)).toBe(false);
      expect(girlSketches.some(x => x.word === en[i].word)).toBe(false);
      expect(ja[i].id).toBe(en[i].id);
      expect(ja[i].strokes).toEqual(en[i].strokes);
    }
  });
  it('keeps every candidate bounded, drawable and nonterminal in Japanese', () => {
    const catalogue = [...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches,
      ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles, ...getBilingualV08Doodles('ja')];
    for (const s of getBilingualV08Doodles('ja')) {
      expect(s.word).toMatch(/^[ぁ-ゖー]+$/);
      expect(s.strokes.length).toBeGreaterThanOrEqual(3);
      expect(s.strokes.length).toBeLessThanOrEqual(16);
      for (const stroke of s.strokes) for (const p of stroke.points) {
        expect(Number.isFinite(p.x) && p.x >= .02 && p.x <= .98).toBe(true);
        expect(Number.isFinite(p.y) && p.y >= .02 && p.y <= .98).toBe(true);
        expect(Number.isFinite(p.t) && p.t >= 0 && p.t <= 1200.001).toBe(true);
      }
      const tail = lastLetter(s.word, 'ja');
      expect(tail).not.toBe('ん');
      expect(selectGirlSketch(catalogue, tail!, [s.id], 'ja')).not.toBeNull();
    }
  });
});
