import { describe, expect, it } from 'vitest';
import { girlSketches } from './sketches';
import provenance from './sketch-provenance.json';

describe('girl sketch catalogue', () => {
  it('starts with a simple apple and has a deterministic A to Z first-letter fallback', () => {
    expect(girlSketches[0].word).toBe('apple');
    const initials = new Set(girlSketches.map(sketch => sketch.word[0]));
    expect(initials).toEqual(new Set('abcdefghijklmnopqrstuvwxyz'));
    expect(girlSketches.length).toBeGreaterThanOrEqual(52);
    expect(new Set(girlSketches.map(sketch => sketch.id)).size).toBe(girlSketches.length);
  });

  it('keeps every catalogue stroke normalized and animated within the expected duration', () => {
    for (const sketch of girlSketches) {
      expect(sketch.strokes.length).toBeGreaterThan(0);
      expect(sketch.durationMs).toBeGreaterThanOrEqual(500);
      expect(sketch.durationMs).toBeLessThanOrEqual(1500);
      for (const stroke of sketch.strokes) {
        expect(stroke.points.length).toBeGreaterThan(0);
        // Check every point without allocating four assertion objects per sample.
        // The catalogue is large enough for that overhead to exceed CI's 5s limit.
        expect(stroke.points.every(({x,y}) => x >= 0 && x <= 1 && y >= 0 && y <= 1), `${sketch.id}/${stroke.id}`).toBe(true);
      }
    }
  });

  it('retains CC BY attribution and raw keys for the selected Quick Draw vectors', () => {
    expect(provenance.license).toContain('CC BY 4.0');
    expect(provenance.samples).toHaveLength(23);
    for (const sample of provenance.samples) {
      expect(sample.key_id).toMatch(/^\d+$/);
      expect(sample.source_url).toMatch(/^https:\/\/storage\.googleapis\.com\/quickdraw_dataset\/full\/simplified\//);
    }
    expect(provenance.originals.map(item => item.word)).toEqual(['queen', 'xylophone', 'yarn']);
    expect(provenance.originals.every(item => item.key_id === null)).toBe(true);
  });
});
