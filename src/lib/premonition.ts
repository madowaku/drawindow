import type { GameState, GirlExpression, Language, Mode, RecognitionResult } from '../core/types';
import { chainLettersMatch, firstLetter, lastLetter } from '../core/words';

export type PremonitionReason = 'match' | 'mismatch' | 'uncertain' | 'error' | 'mock' | 'unknown' | 'invalid_previous' | 'terminal_n' | 'round';
export interface PremonitionInput {
  previousWord: string | null;
  language: Language;
  result: RecognitionResult;
  /** Player round whose recognition was accepted, never the new girl round. */
  round: number;
  mode: Mode;
}
export interface PremonitionCandidate {
  expression?: GirlExpression;
  durationMs: number;
  reason: PremonitionReason;
}
export type PremonitionSuppression = 'girl_correction' | 'frequency' | 'disabled' | 'hidden' | 'reduced_motion';
/** Developer observation only. Do not render these fields in the playing UI. */
export interface PremonitionEvent {
  id: string;
  sessionId: number;
  requestId: string;
  round: number;
  mode: Mode;
  language: Language;
  candidate: PremonitionCandidate;
  suppressionReason?: PremonitionSuppression;
}

/** Only actual runtime names and A's accepted result enter this decision. */
export function selectPremonition(input: PremonitionInput): PremonitionCandidate {
  const { result, language, previousWord, round, mode } = input;
  const none = (reason: PremonitionReason): PremonitionCandidate => ({ reason, durationMs: 0 });
  if (result.error || result.errorCode) return none('error');
  if (result.source === 'mock') return none('mock');
  if (result.source !== 'ml' && result.source !== 'api') return none('unknown');
  if (!Number.isInteger(round) || round < 1 || round > 4) return none('round');
  const from = lastLetter(previousWord, language);
  if (!from) return none('invalid_previous');
  const to = firstLetter(result.guess, language);
  if (!to) return none('unknown');
  if (language === 'ja' && (from === 'ん' || lastLetter(result.guess, language) === 'ん')) return none('terminal_n');
  const reason = result.uncertain === true ? 'uncertain' : chainLettersMatch(from, to, language) ? 'match' : 'mismatch';
  return { reason, expression: reason === 'uncertain' ? 'thinking' : reason === 'match' ? 'smile' : 'curious', durationMs: mode === 'night' ? 160 : 240 };
}

/** Observe a reducer acceptance, not a pending promise or a restored snapshot.
 * Identity checks deliberately require the immutable entries/strokes preserved by
 * the actual reducer. A JSON-restored state cannot impersonate this transition.
 */
export function detectPremonitionTransition(previous: GameState | null, next: GameState | null): PremonitionEvent | null {
  if (!previous || !next || previous.phase !== 'recognizing' || next.phase !== 'girl_breath') return null;
  const request = previous.recognitionRequest;
  if (!request || previous.error || next.error || next.recognitionRequest ||
    previous.sessionId !== next.sessionId || previous.sessionKind !== next.sessionKind ||
    previous.language !== next.language || previous.mode !== next.mode ||
    request.sessionKind !== previous.sessionKind || request.round !== previous.round ||
    next.recognitionAttempt !== previous.recognitionAttempt || next.round !== previous.round + 1 ||
    next.entries.length !== previous.entries.length + 1) return null;
  const player = previous.entries.at(-1);
  const accepted = next.entries.at(-2);
  const priorGirl = previous.entries.at(-2);
  const girl = next.entries.at(-1);
  if (!player || player.actor !== 'player' || player.id !== request.playerEntryId || player.round !== request.round ||
    player.strokes !== request.strokes || !accepted || accepted.actor !== 'player' || accepted.id !== player.id ||
    accepted.round !== player.round || accepted.strokes !== player.strokes || !accepted.recognition || accepted.recognition === player.recognition ||
    !priorGirl || priorGirl.actor !== 'girl' || priorGirl.round !== previous.round ||
    !girl || girl.actor !== 'girl' || girl.round !== next.round ||
    previous.entries.slice(0, -1).some((entry, index) => next.entries[index] !== entry)) return null;
  const result = accepted.recognition;
  const expectedSource = previous.sessionKind === 'ml' ? 'ml' : previous.sessionKind === 'api' ? 'api' : 'mock';
  if (result.source !== expectedSource) return null;
  const candidate = selectPremonition({ previousWord: priorGirl.intendedWord, language: next.language, result, round: previous.round, mode: next.mode });
  return {
    id: `${next.sessionId}:${request.requestId}`, sessionId: next.sessionId,
    requestId: request.requestId, round: previous.round, mode: next.mode, language: next.language, candidate,
    ...(next.girlCorrection ? { suppressionReason: 'girl_correction' as const } :
      previous.round !== 1 && previous.round !== 3 ? { suppressionReason: 'frequency' as const } : {}),
  };
}
