import { describe, expect, it } from 'vitest';
import { doodleLibrary, doodleCandidates } from './doodleLibrary';
import { selectGirlSketch } from '../core/words';
import { girlSketches } from './sketches';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { calculateScore } from '../core/score';

describe('Shizuku Doodle Library v0.1', () => {
  it('covers every letter with at least two candidates and priority letters with at least three', () => {
    expect(Object.keys(doodleLibrary)).toEqual([... 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
    for (const [letter, candidates] of Object.entries(doodleLibrary)) {
      expect(candidates.length).toBeGreaterThanOrEqual('OQXYUVGKNPW'.includes(letter) ? 3 : 2);
      expect(candidates.every(candidate => candidate.letter === letter && candidate.word[0].toUpperCase() === letter)).toBe(true);
    }
    expect(doodleCandidates).toHaveLength(64);
    expect(new Set(doodleCandidates.map(candidate => candidate.id)).size).toBe(64);
  });

  it('retains source, judgement and normalized timed strokes for every candidate', () => {
    for (const candidate of doodleCandidates) {
      expect(['safe', 'soft', 'spicy', 'reject']).toContain(candidate.readability);
      expect(['original', 'quick-draw']).toContain(candidate.source.kind);
      expect(candidate.source.attribution.length).toBeGreaterThan(0);
      expect(candidate.reviewNote.length).toBeGreaterThan(0);
      expect(candidate.strokes.length).toBeGreaterThan(0);
      expect(candidate.durationMs).toBeGreaterThanOrEqual(500);
      expect(candidate.durationMs).toBeLessThanOrEqual(1500);
      let last = 0;
      for (const stroke of candidate.strokes) for (const point of stroke.points) {
        expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThanOrEqual(1);
        expect(point.t).toBeGreaterThanOrEqual(last); last = point.t;
      }
    }
  });

  it('keeps the existing owl and the exact v0.4 review geometry alongside distinct O words', () => {
    expect(doodleLibrary.O.map(candidate => candidate.id)).toContain('qd-owl-5322965052817408');
    expect(doodleLibrary.O.map(candidate => candidate.id)).toContain('girl-owl-review-v04-original');
    expect(doodleLibrary.O.filter(candidate => candidate.word === 'owl')).toHaveLength(2);
    expect(doodleLibrary.O.filter(candidate => candidate.readability === 'safe').every(candidate => candidate.word !== 'owl')).toBe(true);
  });

  it('prefers SAFE even over unused soft candidates and excludes spicy/reject from play', () => {
    const safe = doodleLibrary.O.find(candidate => candidate.readability === 'safe')!;
    expect(selectGirlSketch([...doodleLibrary.O].reverse(), 'o')?.readability).toBe('safe');
    const safeIds = doodleLibrary.O.filter(candidate => candidate.readability === 'safe').map(candidate => candidate.id);
    expect(selectGirlSketch(doodleLibrary.O, 'o', safeIds)?.readability).toBe('safe');
    expect(selectGirlSketch(doodleLibrary.O.filter(candidate => ['spicy', 'reject'].includes(candidate.readability)), 'o')).toBeNull();
    expect(selectGirlSketch([safe], 'o', [safe.id])?.id).toBe(safe.id);
  });

  it('has a playable fallback for every letter without falsely calling difficult Q/X drawings safe', () => {
    for (const letter of Object.keys(doodleLibrary)) {
      const selected = selectGirlSketch(girlSketches, letter);
      expect(selected?.word[0]).toBe(letter.toLowerCase());
      expect(['safe', 'soft']).toContain(selected?.readability);
    }
    expect(selectGirlSketch(girlSketches, 'x')?.readability).toBe('soft');
  });

  it('avoids the same word across variants and rotates least recently used words after exhaustion', () => {
    const a = doodleLibrary.O.find(candidate => candidate.readability === 'safe')!;
    const b = { ...a, id: 'same-word-variant' };
    const c = { ...a, id: 'other-word', word: 'orange' };
    expect(selectGirlSketch([a, b, c], 'o', [a.id])?.id).toBe(c.id);
    expect(selectGirlSketch([a, c], 'o', [c.id, a.id])?.id).toBe(c.id);
  });

  it('keeps the full library on the five-exchange protocol, rotates K words and scores nine links only', () => {
    let state = gameReducer(createInitialState(), { type: 'START', mode: 'day', sessionKind: 'api', sketches: girlSketches });
    let calls = 0;
    for (let round = 1; round <= 5; round++) {
      state = gameReducer(state, { type: 'BREATH_DONE' });
      state = gameReducer(state, { type: 'PLAYBACK_DONE' });
      state = gameReducer(state, { type: 'YOUR_TURN' });
      state = gameReducer(state, { type: 'STROKES_CHANGED', strokes: girlSketches[0].strokes });
      state = gameReducer(state, { type: 'DONE' });
      if (round < 5) {
        expect(Object.keys(state.recognitionRequest!).sort()).toEqual(['attempt', 'playerEntryId', 'requestId', 'round', 'sessionKind', 'strokes']);
        state = gameReducer(state, { type: 'RECOGNITION_RESOLVED', requestId: state.recognitionRequest!.requestId, result: { source: 'api', guess: 'rock' } });
        calls++;
      }
    }
    expect(calls).toBe(4);
    expect(state.phase).toBe('review_intents');
    expect(state.entries.filter(entry => entry.actor === 'girl').map(entry => entry.intendedWord)).toEqual(['apple', 'key', 'koala', 'kangaroo', 'kiwi']);
    expect(state.entries.filter(entry => entry.actor === 'player').every(entry => entry.intendedWord === null)).toBe(true);
    expect(state.entries.at(-1)?.recognition).toBeNull();
    expect(state.recognitionRequest).toBeNull();
    const score = calculateScore(state.entries, 'api');
    expect(score.links).toHaveLength(9);
    expect(score.knownPairCount).toBe(0);
    expect(score.linkScore).toBeNull();
  });
});
