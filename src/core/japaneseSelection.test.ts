import { describe, expect, it } from 'vitest';
import { firstLetter, normalizeWord, selectGirlSketch } from './words';
import { girlSketches } from '../data/sketches';
import type { GirlSketch } from './types';

const sketch = (word: string, readability: GirlSketch['readability'] = 'safe', id = word): GirlSketch =>
  ({ id, word, readability, durationMs: 1200, strokes: [] });

describe('Japanese continuation weighting', () => {
  it('prefers distinct readable exits without overcounting alternate art or repeating a seen word', () => {
    const pool = [sketch('かめ'), sketch('かさ'), sketch('めだか'),
      sketch('めだか', 'safe', 'alternate'), sketch('さる'), sketch('さかな')];
    expect(selectGirlSketch(pool, 'か', [], 'ja')?.word).toBe('かさ');
    expect(selectGirlSketch(pool, 'か', ['かさ'], 'ja')?.word).toBe('かめ');
    expect(selectGirlSketch(pool, 'か', ['かめ', 'かさ'], 'ja')?.word).toBe('かめ');
  });
  it('does not count SOFT, rejected or terminal replies as easy exits', () => {
    const pool = [sketch('かめ'), sketch('かさ'), sketch('めろん'), sketch('めだか', 'soft'),
      sketch('めがね', 'reject'), sketch('さる')];
    expect(selectGirlSketch(pool, 'か', [], 'ja')?.word).toBe('かさ');
  });
  it('keeps readability tiers, voiced links and terminal avoidance', () => {
    const pool = [sketch('かん'), sketch('かめ'), sketch('かさ', 'soft'), sketch('めだか'), sketch('さる'), sketch('さかな')];
    expect(selectGirlSketch(pool, 'か', [], 'ja')?.word).toBe('かめ');
    expect(selectGirlSketch([sketch('ごりら', 'soft'), sketch('こあら'), sketch('らっぱ')], 'ご', [], 'ja')?.word).toBe('こあら');
  });
  it('uses mood only as a small tie-break behind continuation and freshness', () => {
    const pool = [sketch('とり'), sketch('とけい'), sketch('りす'), sketch('いぬ')];
    expect(selectGirlSketch(pool, 'と', [], 'ja', 'day')?.word).toBe('とり');
    expect(selectGirlSketch(pool, 'と', [], 'ja', 'night')?.word).toBe('とけい');
    expect(selectGirlSketch([...pool, sketch('りんご')], 'と', [], 'ja', 'night')?.word).toBe('とり');
    expect(selectGirlSketch(pool, 'と', ['とけい'], 'ja', 'night')?.word).toBe('とり');
  });
  it('keeps old English selection when no themed mode is requested', () => {
    function previousEnglish(letter: string, used: string[]) {
      const playable = girlSketches.filter(s => !s.readability || s.readability === 'safe' || s.readability === 'soft');
      const exact = playable.filter(s => firstLetter(s.word) === letter);
      const safe = exact.filter(s => !s.readability || s.readability === 'safe');
      const pool = safe.length ? safe : exact;
      const byId = new Map(girlSketches.map(s => [s.id, normalizeWord(s.word)]));
      const recent = used.map(id => byId.get(id));
      return [...pool].sort((a,b) => recent.lastIndexOf(normalizeWord(a.word)) - recent.lastIndexOf(normalizeWord(b.word)) ||
        used.lastIndexOf(a.id) - used.lastIndexOf(b.id))[0] ?? null;
    }
    for (const letter of 'abcdefghijklmnopqrstuvwxyz' {
      for (const used of [[], girlSketches.slice(0, 10).map(s => s.id), girlSketches.map(s => s.id)]) {
        expect(selectGirlSketch(girlSketches, letter, used, 'en')).toBe(previousEnglish(letter, used));
      }
    }
  });
});
