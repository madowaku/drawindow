import type { DrawingRecognizer, Language, RecognitionResult, Stroke } from '../core/types';
import { createQuickDrawRecognizer, preloadQuickDrawModel } from '../services/quickDrawRecognizer';
import { quickDrawJapanese } from '../services/quickDrawJapanese';
import type { QuickDrawPreprocessOptions } from '../services/quickDrawPreprocess';
import type { ScoredLabel } from '../services/quickDrawScores';
import { gameSketches } from '../data/gameSketches';
import { lastLetter, selectGirlSketch, selectJapaneseFreshSketch } from '../core/words';

export const PREPROCESS_VARIANTS: readonly { id: string; options: QuickDrawPreprocessOptions }[] = [
  { id: 'current', options: {} }, { id: 'padding-1', options: { paddingPx: 1 } },
  { id: 'padding-4', options: { paddingPx: 4 } }, { id: 'thin', options: { strokeRadiusHiRes: 2 } },
  { id: 'thick', options: { strokeRadiusHiRes: 4 } }, { id: 'canvas-position', options: { normalization: 'canvas' } },
];
export type FreehandJudgement = 'exact' | 'plausible_alternative' | 'unrelated' | 'abstain_or_error';
export interface FreehandVariant {
  id: string;
  result: RecognitionResult;
  top3: (ScoredLabel & { japanese: string | null })[];
  elapsedMs: number;
  nextDrawingAvailable: boolean | null;
  judgement: FreehandJudgement | null;
  top3MatchesIntent: boolean | null;
}
export interface FreehandSample {
  id: number; intent: string; language: Language;
  provenance: 'human' | 'synthetic' | 'unverified';
  partition: 'development' | 'holdout';
  inputTypes: string[]; loadMs: number;
  variants: FreehandVariant[];
  strokes?: readonly Stroke[];
}
type Factory = (preprocess: QuickDrawPreprocessOptions, onRanking: (ranked: readonly ScoredLabel[]) => void) => DrawingRecognizer;
/** Intent and human judgements stay outside the inference boundary. Same immutable input for all variants. */
export async function compareFreehand(strokes: readonly Stroke[], language: Language, factory?: Factory): Promise<{ loadMs: number; variants: FreehandVariant[] }> {
  const frozen = structuredClone(strokes);
  const loadStart = performance.now();
  if (!factory) await preloadQuickDrawModel().catch(() => {}); // Individual attempts retain the actual failure.
  const loadMs = Math.max(0, performance.now() - loadStart);
  const variants: FreehandVariant[] = [];
  for (const variant of PREPROCESS_VARIANTS) {
    let ranking: readonly ScoredLabel[] = [];
    const recognizer = factory ? factory(variant.options, value => { ranking = value; })
      : createQuickDrawRecognizer({ preprocess: variant.options, onRanking: value => { ranking = value; } });
    const started = performance.now();
    const result = await recognizer.recognize({ requestId: `freehand:${variant.id}`, language, strokes: frozen });
    const elapsedMs = Math.max(0, performance.now() - started);
    const pool = gameSketches(language), tail = lastLetter(result.guess, language);
    const next = tail ? language === 'ja' && tail === 'ん' ? selectJapaneseFreshSketch(pool, [])
      : selectGirlSketch(language === 'ja' ? pool.filter(s => lastLetter(s.word, language) !== 'ん') : pool, tail, [], language) : null;
    variants.push({ id: variant.id, result, top3: ranking.slice(0, 3).map(candidate => ({ ...candidate, japanese: quickDrawJapanese[candidate.label] ?? null })),
      elapsedMs, nextDrawingAvailable: result.guess ? Boolean(next) : null, judgement: null, top3MatchesIntent: null });
  }
  return { loadMs, variants };
}

export function freehandSummary(samples: readonly FreehandSample[], partition: FreehandSample['partition']) {
  const human = samples.filter(s => s.provenance === 'human' && s.partition === partition);
  return PREPROCESS_VARIANTS.map(({ id }) => {
    const attempts = human.flatMap(s => s.variants.filter(v => v.id === id));
    const judged = attempts.filter(v => v.judgement !== null);
    const failureCounts = Object.fromEntries(['invalid_input', 'low_score', 'unmapped', 'model_unavailable', 'invalid_output', 'uncovered_letter', 'wrong_guess'].map(reason => [reason,
      attempts.filter(v => reason === 'wrong_guess' ? v.judgement === 'unrelated' || v.judgement === 'plausible_alternative' : reason === 'uncovered_letter' ? v.nextDrawingAvailable === false : v.result.failureReason === reason).length]));
    return { id, drawings: human.length, judged: judged.length, exact: judged.filter(v => v.judgement === 'exact').length,
      plausible: judged.filter(v => v.judgement === 'plausible_alternative').length,
      top3Reviewed: attempts.filter(v => v.top3MatchesIntent !== null).length, top3Matches: attempts.filter(v => v.top3MatchesIntent === true).length, failureCounts };
  });
}
const clean = (value: string) => value.slice(0, 120).replace(/[\u0000-\u001f]/g, '').replace(/(?:AIza[\w-]+|sk-[\w-]+|Bearer\s+\S+)/gi, '[redacted]');
export function freehandExport(samples: readonly FreehandSample[], includeStrokes = false) {
  return { schema: 'DRAWINDOW-freehand-v013', model: 'quickdraw-345-tflite@b02fde8d8732aed32bc9d8176c3dc4efda0333fb',
    scoring: 'Raw model scores are not probabilities of correctness. Human judgement only; synthetic and unverified drawings excluded.',
    preprocessing: PREPROCESS_VARIANTS, summary: { development: freehandSummary(samples, 'development'), holdout: freehandSummary(samples, 'holdout') },
    samples: samples.map(s => ({ id: s.id, intent: clean(s.intent), language: s.language, provenance: s.provenance, partition: s.partition,
      inputTypes: [...s.inputTypes], loadMs: s.loadMs,
      variants: s.variants.map(v => ({ id: v.id, guess: v.result.guess, errorCode: v.result.errorCode ?? null, failureReason: v.result.failureReason ?? null,
        wrongGuess: !v.result.guess || v.judgement === null ? null : ['plausible_alternative', 'unrelated'].includes(v.judgement),
        top3: v.top3.map(c => ({ label: c.label, score: c.score, japanese: c.japanese })), elapsedMs: v.elapsedMs,
        nextDrawingAvailable: v.nextDrawingAvailable, judgement: v.judgement, top3MatchesIntent: v.top3MatchesIntent })),
      ...(includeStrokes && s.strokes ? { strokes: s.strokes } : {}) })) };
}
export function freehandCsv(samples: readonly FreehandSample[]) {
  const rows = freehandExport(samples).samples.flatMap(s => s.variants.map(v => [s.id, s.intent, s.language, s.provenance, s.partition, s.inputTypes.join('|'), s.loadMs, v.id, v.guess, v.errorCode, v.failureReason, v.elapsedMs, v.nextDrawingAvailable, v.judgement, v.top3MatchesIntent, v.wrongGuess, JSON.stringify(v.top3)]));
  const cell = (value: unknown) => { const text = value == null ? '' : String(value); return '"' + (/^\s*[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"'; };
  return '\ufeff' + [['drawing', 'intent', 'language', 'provenance', 'partition', 'input', 'loadMs', 'preprocess', 'guess', 'errorCode', 'failureReason', 'elapsedMs', 'nextDrawing', 'judgement', 'top3Matches', 'wrongGuess', 'top3'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
