import { describe, expect, it } from 'vitest';
import type { GirlSketch } from '../core/types';
import { selectGirlSketch } from '../core/words';
import { prefersThemeWord, withEnglishStarter } from './themeVocabulary';
import { girlSketches } from './sketches';
import { getBilingualV08Doodles } from './bilingualV08Doodles';

const dummy = (word: string): GirlSketch => ({
  id: word, word, readability: 'safe', strokes: [{ id: word, points: [{ x: .2, y: .2, t: 0 }] }],
});

describe('mode-weighted vocabulary', () => {
  it('uses different opening words for English daytime and nighttime', () => {
    const list = [...girlSketches, ...getBilingualV08Doodles('en')];
    expect(withEnglishStarter(list, 'day', 0)[0].word).toBe('apple');
    expect(withEnglishStarter(list, 'night', 0)[0].word).toBe('moon');
    const night = withEnglishStarter(list, 'night', 1);
    expect(night[0].word).not.toBe('moon');
    expect(night).toHaveLength(list.length);
    expect(new Set(night.map(x => x.id)).size).toBe(list.length);
    expect(withEnglishStarter([dummy('cat')], 'night', 0)[0].word).toBe('cat');
  });
  it('chooses theme only among fresh, chainable English alternatives', () => {
    const pool = [dummy('moon'), dummy('mushroom'), dummy('nest')];
    expect(selectGirlSketch(pool, 'm', [], 'en', 'day')?.word).toBe('mushroom');
    expect(selectGirlSketch(pool, 'm', [], 'en', 'night')?.word).toBe('moon');
    expect(selectGirlSketch(pool, 'm', ['moon'], 'en', 'night')?.word).toBe('mushroom');
    expect(selectGirlSketch(pool, 'm', [], 'en')?.word).toBe('moon');
  });
  it('does not promote a dead-end themed English noun', () => {
    const pool = [dummy('sun'), dummy('star'), dummy('nest')];
    expect(selectGirlSketch(pool, 's', [], 'en', 'night')?.word).toBe('sun');
  });
  it('keeps the palettes distinct but optional', () => {
    expect(prefersThemeWord('たんぽぽ', 'ja', 'day')).toBe(true);
    expect(prefersThemeWord('たんぽぽ', 'ja', 'night')).toBe(false);
    expect(prefersThemeWord('ghost', 'en', 'night')).toBe(true);
    expect(prefersThemeWord('ghost', 'en', 'day')).toBe(false);
  });
});
