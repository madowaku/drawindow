import type { Language, RecognitionResult } from '../core/types';
import { normalizeWord } from '../core/words';
import { quickDrawJapanese } from './quickDrawJapanese';

export interface ScoredLabel { label: string; score: number; }
export const QUICKDRAW_SCORE_FLOOR = .05;
/** Ranked descending, preserving model class order for ties. Same v0.9 decoder. */
export function imageOnlyQuickDrawResult(ranked: readonly ScoredLabel[], language: Language, minScore = QUICKDRAW_SCORE_FLOOR): RecognitionResult {
  const fail = (): RecognitionResult => ({ guess: null, source: 'ml', errorCode: 'invalid_response', error: 'The on-device sketch model could not recognize this drawing. No image was uploaded.' });
  const best = ranked[0];
  if (!best || best.score < minScore) return fail();
  const mapped = language === 'ja' ? quickDrawJapanese[best.label] : best.label;
  const guess = normalizeWord(mapped, language);
  if (!guess) return fail();
  return { guess, source: 'ml', alternatives: ranked.slice(1,4).map(({label}) => language === 'ja' ? quickDrawJapanese[label] ?? label : label) };
}
