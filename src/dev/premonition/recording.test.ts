import { describe, expect, it, vi } from 'vitest';
import { createInitialState, gameReducer } from '../../core/gameMachine';
import { calculateScore } from '../../core/score';
import type { GameEvent, GirlSketch, Stroke } from '../../core/types';
import { exportReplay, PremonitionRecorder, replayRecording } from './recording';

const strokes: Stroke[] = [{ id: 'a', points: [{ x: .2, y: .4, t: 0 }] }];
const sketches: GirlSketch[] = ['cat', 'tree', 'egg', 'goat', 'tent', 'tiger', 'rose', 'ear', 'rain', 'nest'].map(word => ({ id: word, word, strokes }));
function harness() {
  let clock = 0;
  let actual = createInitialState();
  const recorder = new PremonitionRecorder(() => clock++);
  recorder.observeInitial(actual);
  const send = (event: GameEvent) => { recorder.record(event); actual = gameReducer(actual, event); };
  const draw = () => { send({ type: 'BREATH_DONE' }); send({ type: 'PLAYBACK_DONE' }); send({ type: 'YOUR_TURN' }); };
  return { recorder, send, draw, get state() { return actual; } };
}

describe('actual-event recording and inference-free replay', () => {
  it('replays five exchanges with identical A/D recognition, progression, nine links and score', () => {
    const h = harness();
    h.send({ type: 'START', mode: 'night', sessionKind: 'ml', sketches });
    const guesses = ['tree', 'egg', 'goat', 'tree'];
    for (let round = 0; round < 5; round++) {
      h.draw();
      h.send({ type: 'STROKES_CHANGED', strokes });
      h.send({ type: 'STROKES_CHANGED', strokes: [{ ...strokes[0], points: [...strokes[0].points, { x: .7, y: .8, t: 20 }] }] });
      h.send({ type: 'STROKES_CHANGED', strokes: [...h.state.activeStrokes, { id: 'b', points: [{ x: .1, y: .3, t: 21 }] }] });
      h.send({ type: 'UNDO' }); h.send({ type: 'REDO' });
      h.send({ type: 'DONE' });
      if (round < 4) {
        if (round === 0) {
          h.send({ type: 'RECOGNITION_RESOLVED', requestId: h.state.recognitionRequest!.requestId, result: { source: 'ml', guess: null, errorCode: 'timeout', error: 'timeout' } });
          h.send({ type: 'RETRY_RECOGNITION' });
        }
        h.send({ type: 'RECOGNITION_RESOLVED', requestId: h.state.recognitionRequest!.requestId, result: { source: 'ml', guess: guesses[round] } });
      }
    }
    expect(h.state.phase).toBe('review_intents');
    expect(h.state.recognitionRequest).toBeNull();
    for (const entry of h.state.entries.filter(e => e.actor === 'player')) h.send({ type: 'SET_INTENT', entryId: entry.id, word: 'tree' });
    h.send({ type: 'SHOW_RESULTS' });
    const recording = h.recorder.recording!;
    const a = replayRecording(recording), d = replayRecording(recording);
    expect(a).toEqual(d);
    expect(a.at(-1)!.state).toEqual(h.state);
    expect(a).toEqual(h.recorder.frames);
    const scoreA = calculateScore(a.at(-1)!.state.entries, 'ml');
    const scoreD = calculateScore(d.at(-1)!.state.entries, 'ml');
    expect(scoreA.links).toHaveLength(9);
    expect(scoreD).toEqual(scoreA);
    expect(recording.events.filter(e => e.event.type === 'RECOGNITION_RESOLVED')).toHaveLength(5); // Four results plus the recorded failure, never a fifth drawing request.
    expect(a.filter(f => f.state.round === 5).every(f => f.state.recognitionRequest === null)).toBe(true);
    expect(recording.completeness).toBe('complete');
    expect(JSON.parse(exportReplay(recording)).recording).toEqual(recording);
  });

  it('coalesces samples only inside one gesture and preserves undo, clear and invalid-event semantics', () => {
    const h = harness(); h.send({ type: 'START', mode: 'day', sessionKind: 'ml', sketches }); h.draw();
    h.send({ type: 'STROKES_CHANGED', strokes });
    h.send({ type: 'STROKES_CHANGED', strokes: [{ ...strokes[0], points: [...strokes[0].points, { x: .3, y: .5, t: 2 }] }] });
    expect(h.recorder.recording!.events.filter(e => e.event.type === 'STROKES_CHANGED')).toHaveLength(1);
    h.send({ type: 'STROKES_CHANGED', strokes: [...h.state.activeStrokes, { id: 'b', points: [{ x: .4, y: .6, t: 4 }] }] });
    h.send({ type: 'STROKES_CHANGED', strokes: [{ id: 'b', points: [{ x: 6, y: .6, t: 4 }] }] });
    h.send({ type: 'CLEAR' }); h.send({ type: 'UNDO' }); h.send({ type: 'UNDO' }); h.send({ type: 'REDO' });
    expect(replayRecording(h.recorder.recording!).at(-1)!.state).toEqual(h.state);
    expect(h.state.activeStrokes.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('marks restored or mid-game traces partial without inventing earlier events', () => {
    const h = harness();
    const restored = gameReducer(createInitialState(), { type: 'START', mode: 'night', sessionKind: 'ml', sketches });
    h.send({ type: 'RESTORE_SESSION', state: restored });
    h.send({ type: 'BREATH_DONE' });
    expect(h.recorder.recording!.completeness).toBe('partial');
    expect(h.recorder.recording!.events.map(e => e.event.type)).toEqual(['RESTORE_SESSION', 'BREATH_DONE']);
    expect(replayRecording(h.recorder.recording!).at(-1)!.state).toEqual(h.state);
    const midGame = new PremonitionRecorder(); midGame.observeInitial(restored); midGame.observeInitial(createInitialState());
    expect(midGame.recording!.completeness).toBe('partial');
    expect(midGame.frames).toHaveLength(1);
  });

  it('starts a fresh trace on a new valid START and preserves the session epoch', () => {
    const h = harness(); h.send({ type: 'START', mode: 'day', sessionKind: 'ml', sketches }); h.draw();
    h.send({ type: 'STROKES_CHANGED', strokes: [{ id: 'previous-person-secret', points: strokes[0].points }] });
    h.send({ type: 'RETURN_TO_TITLE' });
    h.send({ type: 'SET_LANGUAGE', language: 'ja' });
    h.send({ type: 'START', mode: 'night', sessionKind: 'ml', sketches: [{ ...sketches[0], word: 'ねこ' }] });
    expect(h.recorder.recording!.events).toHaveLength(1);
    expect(h.recorder.recording!.initialState.language).toBe('ja');
    expect(h.recorder.recording!.initialState.sessionId).toBe(1);
    expect(JSON.stringify(h.recorder.recording)).not.toContain('previous-person-secret');
    expect(replayRecording(h.recorder.recording!).at(-1)!.state).toEqual(h.state);
  });

  it('does not serialize the catalogue or full state on pointer publications', () => {
    const h = harness(); h.send({ type: 'START', mode: 'day', sessionKind: 'ml', sketches }); h.draw();
    const stringify = vi.spyOn(JSON, 'stringify');
    h.send({ type: 'STROKES_CHANGED', strokes });
    h.send({ type: 'STROKES_CHANGED', strokes: [{ ...strokes[0], points: [...strokes[0].points, { x: .3, y: .5, t: 2 }] }] });
    expect(stringify).not.toHaveBeenCalled();
    const clone = vi.spyOn(globalThis, 'structuredClone');
    expect(h.recorder.recording?.events.length).toBeGreaterThan(0);
    expect(h.recorder.frames.length).toBeGreaterThan(0);
    expect(clone).not.toHaveBeenCalled();
    clone.mockRestore();
    stringify.mockRestore();
  });

  it('preserves an empty initial gesture sample when it changes the later undo snapshot', () => {
    const h = harness(); h.send({ type: 'START', mode: 'day', sessionKind: 'ml', sketches }); h.draw();
    h.send({ type: 'STROKES_CHANGED', strokes: [{ id: 'a', points: [] }] });
    h.send({ type: 'STROKES_CHANGED', strokes });
    h.send({ type: 'UNDO' });
    // The real reducer treats the existing empty ID as the same gesture, hence
    // no undo checkpoint. Collapsing it into its first nonempty sample would add one.
    expect(h.state.activeStrokes).toEqual(strokes);
    expect(h.state.drawingHistory.past).toHaveLength(0);
    expect(replayRecording(h.recorder.recording!).at(-1)!.state).toEqual(h.state);
  });
});
