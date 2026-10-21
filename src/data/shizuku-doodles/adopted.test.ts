import { expect, it } from 'vitest';
import source from './doodles.json';
import { adoptedShizukuSketches, adoptShizukuSketches } from './adopted';
import { doodleCandidates } from '../doodleLibrary';
import { girlSketches } from '../sketches';

it('adopts all 67 approved drawings and preserves every pen lift and endpoint', () => {
  expect(adoptedShizukuSketches).toHaveLength(67);
  source.doodles.forEach((doodle, i) => {
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
  const ja = adoptShizukuSketches([{ ...en[0], id: 'old-apple', word: 'りんご' }, { ...en[0], id: 'fallback', word: 'ごりら' }], 'ja');
  expect(ja.filter(s => s.word === 'りんご')).toHaveLength(1);
  expect(ja.some(s => s.id === 'fallback')).toBe(true);
  expect(ja.slice(0, 67).every(s => /^[ぁ-ゖー]+$/.test(s.word))).toBe(true);
  expect(ja.slice(0, 67).map(s => s.strokes)).toEqual(en.slice(0, 67).map(s => s.strokes));
  expect(ja.find(s => s.word === 'ぱん')).toBeTruthy();
});
