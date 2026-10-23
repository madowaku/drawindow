import { expansion300Doodles, expansion300Groups } from './expansion300';
import { expect, it } from 'vitest';
import source from './doodles.json';
import expansion from './expansion-20261022.json';
import expansionB from './expansion-20261022-b.json';
import expansionC from './expansion-20261022-c.json';
import expansionD from './expansion-20261022-d.json';
import expansionE from './expansion-20261022-e.json';
import { adoptedShizukuSketches, adoptShizukuSketches } from './adopted';
import { doodleCandidates } from '../doodleLibrary';
import { girlSketches } from '../sketches';
import { localizeGirlSketches } from '../japaneseSketches';
import { japaneseExtraSketches } from '../japaneseExtraSketches';
import { japaneseDoodlePack } from '../japaneseDoodlePack';
import { japaneseClassicDoodles } from '../japaneseClassicDoodles';
import { japaneseEverydayDoodles } from '../japaneseEverydayDoodles';
import { firstLetter, lastLetter, normalizeWord, selectJapaneseFreshSketch, selectGirlSketch } from '../../core/words';

it('adds unique bilingual nouns with a playable continuation in both actual catalogues', () => {
  const ja = adoptShizukuSketches([...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles], 'ja');
  const all = [...source.doodles, ...expansion.doodles, ...expansionB.doodles, ...expansionC.doodles, ...expansionD.doodles, ...expansionE.doodles, ...expansion300Doodles];
  for (const field of ['key', 'labelEn', 'labelJa'] as const) expect(new Set(all.map(d => d[field])).size).toBe(300);
  for (const language of ['en', 'ja'] as const) {
    const catalogue = language === 'en' ? girlSketches : ja;
    expect(new Set(catalogue.map(s => s.id)).size).toBe(catalogue.length);
    for (const item of [...expansion.doodles, ...expansionB.doodles, ...expansionC.doodles, ...expansionD.doodles, ...expansionE.doodles]) {
      const sketch = catalogue.find(s => s.id === `shizuku-style-v01-${item.key}`)!;
      expect(sketch).toBeTruthy();
      expect(catalogue.filter(s => s.word === sketch.word)).toHaveLength(1);
      expect(selectGirlSketch([sketch], firstLetter(sketch.word, language)!, [], language)?.id).toBe(sketch.id);
      expect(lastLetter(sketch.word, language)).not.toBe('ん');
      const next = selectGirlSketch(catalogue, lastLetter(sketch.word, language)!, [sketch.id], language);
      expect(next, `${language}: ${sketch.word}`).not.toBeNull();
      expect(next?.id).not.toBe(sketch.id);
    }
  }
});

it('retains the original 67 plus five 13-drawing and seven 24-drawing expansions with every pen lift and endpoint preserved', () => {
  for (const group of Object.values(expansion300Groups)) expect(group.doodles).toHaveLength(24);
  expect(source.doodles).toHaveLength(67);
  expect(expansion.doodles).toHaveLength(13);
  expect(expansionB.doodles).toHaveLength(13);
  expect(expansionC.doodles).toHaveLength(13);
  expect(expansionD.doodles).toHaveLength(13);
  expect(expansionE.doodles).toHaveLength(13);
  expect(adoptedShizukuSketches).toHaveLength(300);
  [...source.doodles, ...expansion.doodles, ...expansionB.doodles, ...expansionC.doodles, ...expansionD.doodles, ...expansionE.doodles, ...expansion300Doodles].forEach((doodle, i) => {
    const sketch = adoptedShizukuSketches[i];
    const paths = doodle.strokes.flatMap(s => s.path.match(/M[^M]+/g) ?? []);
    expect(sketch.strokes).toHaveLength(paths.length);
    let previous = -1;
    sketch.strokes.forEach((stroke, part) => {
      const coordinates = paths[part].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(stroke.points[0].x).toBeCloseTo(coordinates[0] / 120);
      expect(stroke.points[0].y).toBeCloseTo(coordinates[1] / 120);
      expect(stroke.points.at(-1)!.x).toBeCloseTo(coordinates.at(-2)! / 120);
      expect(stroke.points.at(-1)!.y).toBeCloseTo(coordinates.at(-1)! / 120);
      for (const point of stroke.points) {
        expect(point.t).toBeGreaterThanOrEqual(previous); previous = point.t;
        expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThanOrEqual(1);
      }
    });
    expect(previous).toBeCloseTo(1200);
    expect(girlSketches.filter(s => s.word === sketch.word).map(s => s.id)).toEqual([sketch.id]);
  });
  expect(new Set(girlSketches.map(s => s.word[0]))).toEqual(new Set('abcdefghijklmnopqrstuvwxyz'));
});

it('uses the same geometry in both languages and replaces Japanese duplicate variants', () => {
  const en = adoptShizukuSketches(doodleCandidates);
  const ja = adoptShizukuSketches([{ ...en[0], id: 'old-apple', word: 'りんご' }, { ...en[0], id: 'old-gorilla', word: 'ごりら' }, { ...en[0], id: 'fallback', word: 'ごぼう' }], 'ja');
  expect(ja.filter(s => s.word === 'りんご')).toHaveLength(1);
  expect(ja.some(s => s.id === 'fallback')).toBe(true);
  expect(ja.filter(s => s.word === 'ごりら').map(s => s.id)).toEqual(['shizuku-style-v01-gorilla']);
  expect(ja.slice(0, 300).every(s => /^[ぁ-ゖー]+$/.test(s.word))).toBe(true);
  expect(ja.slice(0, 300).map(s => s.strokes)).toEqual(en.slice(0, 300).map(s => s.strokes));
  expect(ja.find(s => s.word === 'ぱん')).toBeTruthy();
});

it('keeps all 168 new nouns valid, unique after Japanese normalization, and connected without hiding terminal n', () => {
  const ja = adoptShizukuSketches([...localizeGirlSketches(girlSketches, 'ja'), ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles], 'ja');
  expect(new Set(ja.slice(0, 300).map(s => normalizeWord(s.word, 'ja'))).size).toBe(300);
  for (const language of ['en', 'ja'] as const) {
    const catalogue = language === 'en' ? girlSketches : ja;
    for (const item of expansion300Doodles) {
      const sketch = catalogue.find(s => s.id === `shizuku-style-v01-${item.key}`)!;
      expect(normalizeWord(sketch.word, language)).toBe(sketch.word);
      expect(catalogue.filter(s => s.word === sketch.word)).toHaveLength(1);
      const end = lastLetter(sketch.word, language)!;
      if (language === 'ja' && end === 'ん') {
        const fresh = selectJapaneseFreshSketch(catalogue, [sketch.id]);
        expect(fresh).toBeTruthy();
        expect(lastLetter(fresh?.word, 'ja')).not.toBe('ん');
      } else {
        expect(selectGirlSketch(catalogue, end, [sketch.id], language), sketch.word).toBeTruthy();
      }
    }
  }
});
