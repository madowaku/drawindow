import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../../core/gameMachine';
import { createBlindAssignment, createEvaluation, evaluationCsv, evaluationFields, exportMetadata } from './evaluation';
import { exportReplay, PremonitionRecorder } from './recording';

describe('blind optional evaluation and deliberate local exports', () => {
  it('supports deterministic assignment and order counterbalancing', () => {
    expect(createBlindAssignment(() => 0)).toEqual({ X: 'D', Y: 'A', order: ['X', 'Y'] });
    expect(createBlindAssignment(() => .9)).toEqual({ X: 'A', Y: 'D', order: ['Y', 'X'] });
  });
  it('defaults every judgement to unanswered', () => {
    expect(evaluationFields.every(field => createEvaluation()[field] === null)).toBe(true);
    expect(createEvaluation().freeText).toBe('');
  });
  it('exports whitelisted metadata without geometry or recognition/intention words; raw replay is separate', () => {
    const recorder = new PremonitionRecorder(() => 0); recorder.observeInitial(createInitialState());
    const strokes = [{ id: 'SECRET_GEOMETRY', points: [{ x: .12345678, y: .7, t: 42 }] }];
    recorder.record({ type: 'START', mode: 'day', sessionKind: 'ml', sketches: [{ id: 'cat', word: 'SECRET_WORD', strokes }] });
    const evaluation = { X: createEvaluation(), Y: createEvaluation() };
    const recording = recorder.recording!;
    const metadata = exportMetadata(recording, evaluation, createBlindAssignment(() => 0), [{ id: '1:1', round: 1, mode: 'day', atMs: 5, expression: 'smile', reason: 'match', ...{ strokes, guess: 'SECRET_WORD' } }]);
    expect(metadata).not.toContain('SECRET');
    expect(metadata).not.toContain('strokes');
    expect(JSON.parse(metadata).evaluation.X.naturalness).toBeNull();
    expect(JSON.parse(metadata).finished).toBe(false);
    const raw = exportReplay(recording);
    expect(raw).toContain('SECRET_GEOMETRY'); expect(raw).toContain('SECRET_WORD'); expect(raw).toContain('local-only');
  });
  it('marks a finished restored game partial rather than a complete comparison', () => {
    const recorder = new PremonitionRecorder();
    const restored = { ...gameReducer(createInitialState(), { type: 'SET_MODE', mode: 'night' }), phase: 'results' as const };
    recorder.observeInitial(restored);
    const out = JSON.parse(exportMetadata(recorder.recording!, { X: createEvaluation(), Y: createEvaluation() }, createBlindAssignment()));
    expect(out.completeness).toBe('partial');
  });
  it('escapes formulas, quotes, newlines and leaves unanswered CSV cells empty', () => {
    const evaluation = { X: { ...createEvaluation(), freeText: '=HYPERLINK("evil")\nnext' }, Y: { ...createEvaluation(), freeText: ' \t+SUM(1,1)' } };
    const csv = evaluationCsv(evaluation, createBlindAssignment(() => .9));
    expect(csv).toContain('"\'=HYPERLINK(""evil"")\nnext"');
    expect(csv).toContain('"\' \t+SUM(1,1)"');
    expect(csv).toContain('"X","A","2","",""');
    expect(csv).not.toContain('null');
  });
});
