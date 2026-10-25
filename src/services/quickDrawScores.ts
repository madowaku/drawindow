import type { Language, RecognitionResult } from '../core/types';
import { normalizeWord } from '../core/words';
import { quickDrawJapanese } from './quickDrawJapanese';

export interface ScoredLabel { label: string; score: number; }
export const QUICKDRAW_SCORE_FLOOR = .05;
/** Ranked descending, preserving model class order for ties. Same v0.9 decoder. */
export function imageOnlyQuickDrawResult(ranked: readonly ScoredLabel[], language: Language, minScore = QUICKDRAW_SCORE_FLOOR): RecognitionResult {
  const fail = (failureReason: RecognitionResult['failureReason']): RecognitionResult => ({ guess: null, source: 'ml', errorCode: 'invalid_response', failureReason, error: 'The on-device sketch model could not recognize this drawing. No image was uploaded.' });
  const best = ranked[0];
  if (!best || !Number.isFinite(minScore) || ranked.some(value => !Number.isFinite(value.score) || value.score < 0 || value.score > 1 || !value.label)) return fail('invalid_output');
  if (best.score < minScore) return fail('low_score');
  const mapped = language === 'ja' ? quickDrawJapanese[best.label] : best.label;
  const guess = normalizeWord(mapped, language);
  if (!guess) return fail('unmapped');
  return { guess, source: 'ml', alternatives: ranked.slice(1,4).map(({label}) => language === 'ja' ? quickDrawJapanese[label] ?? label : label) };
}
