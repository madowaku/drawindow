import { describe, expect, it } from 'vitest';
import { girlSketches } from './sketches';
import { localizeGirlSketches } from './japaneseSketches';
import { japaneseExtraSketches } from './japaneseExtraSketches';
import { japaneseDoodlePack } from './japaneseDoodlePack';
import { japaneseClassicDoodles } from './japaneseClassicDoodles';
import { chainLettersMatch, firstLetter, lastLetter, selectGirlSketch } from '../core/words';

const nouns = [
  'ごりら', 'ぱいなっぷる', 'かめ', 'うちわ',
  'とんぼ', 'こうもり', 'ちくわ', 'せみ',
  'かまきり', 'くわがた', 'さそり', 'ながぐつ',
  'ねぎ', 'すずめ', 'まつぼっくり', 'あさがお',
] as const;

const catalogue = [
  ...localizeGirlSketches(girlSketches, 'ja'),
  ...japaneseExtraSketches,
  ...japaneseDoodlePack,
  ...japaneseClassicDoodles,
];

describe('DRAWINDOW v0.6 classic picture-shiritori doodles', () => {
  it('adds all 16 expected nouns without changing existing drawings or English words', () => {
    expect(japaneseClassicDoodles).toHaveLength(16);
    expect(japaneseClassicDoodles.map(item => item.word)).toEqual(nouns);
    expect(new Set(japaneseClassicDoodles.map(item => item.id)).size).toBe(16);
    expect(new Set(catalogue.map(item => item.id)).size).toBe(catalogue.length);
    expect(catalogue.length).toBe(girlSketches.length + japaneseExtraSketches.length + japaneseDoodlePack.length + 16);
    expect(girlSketches[0].word).toBe('apple');
    expect(girlSketches.some(item => item.word === 'ごりら')).toBe(false);
  });

  it('keeps each illustration within the glass and preserves the naive monochrome strokes', () => {
    for (const item of japaneseClassicDoodles) {
      expect(item.id).toMatch(/^shizuku-ja-classic-[a-z-]+-v01$/);
      expect(item.word).toMatch(/^[ぁ-ゖー]+$/);
      expect(item.readability === 'safe' || item.readability === 'soft').toBe(true);
      expect(item.durationMs).toBe(1200);
      expect(item.strokes.length, item.word).toBeGreaterThanOrEqual(3);
      expect(item.strokes.length, item.word).toBeLessThanOrEqual(24);
      for (const stroke of item.strokes) {
        expect(stroke.points.length).toBeGreaterThanOrEqual(2);
        for (const point of stroke.points) {
          expect(Number.isFinite(point.x) && point.x >= 0 && point.x <= 1).toBe(true);
          expect(Number.isFinite(point.y) && point.y >= 0 && point.y <= 1).toBe(true);
          expect(Number.isFinite(point.t) && point.t >= 0 && point.t <= 1200 + 0.000001).toBe(true);
        }
      }
    }
  });

  it('covers tricky voiced starters and provides a usable exit for all 16 classics', () => {
    const sources = new Set(japaneseClassicDoodles.map(item => firstLetter(item.word, 'ja')));
    for (const kana of ['ご','ぱ','ち','せ','と','ま','な','あ']) {
      expect(sources.has(kana), kana).toBe(true);
    }
    for (const item of japaneseClassicDoodles) {
      const ending = lastLetter(item.word, 'ja');
      expect(ending, item.word).not.toBe('ん');
      const next = selectGirlSketch(catalogue, ending!, [], 'ja');
      expect(next, `Missing successor after ${item.word} → ${ending}`).not.toBeNull();
      expect(chainLettersMatch(ending, firstLetter(next!.word, 'ja'), 'ja')).toBe(true);
    }
  });

  it('makes ごりら available as a literal ご option but does not artificially force a SOFT sketch', () => {
    expect(japaneseClassicDoodles.some(item => item.word === 'ごりら' && item.readability === 'soft')).toBe(true);
    expect(catalogue.some(item => firstLetter(item.word,'ja') === 'ご')).toBe(true);
    expect(selectGirlSketch(catalogue, 'ご', [], 'ja')).not.toBeNull();
  });

  it('flags easily confused animal and flower silhouettes for blind human review', () => {
    for (const word of ['ごりら', 'ちくわ', 'せみ', 'ねぎ', 'すずめ', 'まつぼっくり', 'あさがお']) {
      const item = japaneseClassicDoodles.find(candidate => candidate.word === word);
      expect(item?.readability, word).toBe('soft');
    }
  });
});
