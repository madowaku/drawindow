import { describe, expect, it } from 'vitest';
import { calculateScore } from './score';
import { firstLetter, lastLetter, normalizeWord, selectGirlSketch } from './words';
import type { DrawingEntry, GirlSketch } from './types';

const entries = (words: (string | null)[]): DrawingEntry[] => words.map((intendedWord, i) => ({
  id: `e${i}`, actor: i % 2 ? 'player' : 'girl', round: Math.floor(i / 2) + 1,
  strokes: [], intendedWord, recognition: null, comparable: true,
}));

describe('intended-word link scoring', () => {
  it('counts nine links and nine-link best chain for ten fully connected pictures', () => {
    const score = calculateScore(entries(['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest']));
    expect(score).toMatchObject({ connectedCount: 9, knownPairCount: 9, possiblePairCount: 9, bestChain: 9, linkScore: 1, perfect: true, comparable: true });
  });
  it('reports 0/9 for all broken links', () => {
    expect(calculateScore(entries(Array(10).fill('cat')))).toMatchObject({ connectedCount: 0, knownPairCount: 9, bestChain: 0, linkScore: 0, perfect: false });
  });
  it('counts the longest disjoint run in links, excludes unknown pairs, and breaks their streaks', () => {
    const score = calculateScore(entries(['cat', 'tree', 'egg', null, 'tent', 'tiger', 'rose', 'ear', 'cat', 'tree']));
    expect(score).toMatchObject({ connectedCount: 6, knownPairCount: 7, bestChain: 3 });
    expect(score.links.map(link => link.status)).toEqual(['connected', 'connected', 'unknown', 'unknown', 'connected', 'connected', 'connected', 'broken', 'connected']);
  });
  it('never makes demo, mock, incomplete or non-comparable results perfect', () => {
    const complete = entries(['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest']);
    expect(calculateScore(complete, 'demo')).toMatchObject({ perfect: false, comparable: false, connectedCount: 9 });
    complete[3].recognition = { guess: 'fish', source: 'mock' };
    expect(calculateScore(complete).perfect).toBe(false);
    complete[3].recognition = null;
    complete[4].comparable = false;
    expect(calculateScore(complete).perfect).toBe(false);
    expect(calculateScore([])).toMatchObject({ knownPairCount: 0, linkScore: null, bestChain: 0, comparable: false });
    expect(calculateScore([]).links).toHaveLength(9);
  });
  it('ignores AI agreement when scoring intended labels', () => {
    const drawings = entries(Array(10).fill('cat'));
    drawings[1].recognition = { guess: 'tree', source: 'api' };
    expect(calculateScore(drawings).connectedCount).toBe(0);
  });
});

describe('English chain boundaries', () => {
  it('normalizes case, whitespace and boundary punctuation while rejecting invalid labels', () => {
    expect(normalizeWord('  “FOX!”  ')).toBe('fox');
    expect(normalizeWord('Ice   Cream')).toBe('ice cream');
    expect(firstLetter(' (APPLE) ')).toBe('a');
    expect(lastLetter(' Fox! ')).toBe('x');
    for (const invalid of [null, undefined, '', '  ', '123', 'cat123', {}, 'a'.repeat(65)]) expect(normalizeWord(invalid)).toBeNull();
  });
  it('selects matching unused templates deterministically, reuses covered letters and returns null for no coverage', () => {
    const sketches = [{ id: '1', word: 'tree' }, { id: '2', word: 'tent' }] as GirlSketch[];
    expect(selectGirlSketch(sketches, 't', ['1'])?.id).toBe('2');
    expect(selectGirlSketch(sketches, 't', ['1', '2'])?.id).toBe('1');
    expect(selectGirlSketch(sketches, 'x')).toBeNull();
  });
});


describe('local achievement is separate from evaluation comparability', () => {
  it('celebrates nine local links without making ML results comparable', () => {
    const local = entries(['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest']).map(e => ({ ...e, comparable: false }));
    for (const e of local.filter(e => e.actor === 'player' && e.round < 5)) e.recognition = { guess: 'dog', source: 'ml' };
    expect(calculateScore(local, 'ml')).toMatchObject({ perfect: true, comparable: false, connectedCount: 9 });
    local[1].recognition = { guess: 'tree', source: 'mock' };
    expect(calculateScore(local, 'ml').perfect).toBe(false);
  });
  it('does not celebrate incomplete or restarted local chains', () => {
    const local = entries(['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest']);
    local[4].chainRestart = true;
    expect(calculateScore(local, 'ml').perfect).toBe(false);
    expect(calculateScore(local.slice(0, 8), 'ml').perfect).toBe(false);
    local[2].intendedWord = null;
    expect(calculateScore(local, 'ml').perfect).toBe(false);
  });
});
