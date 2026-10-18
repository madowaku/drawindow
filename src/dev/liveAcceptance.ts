import type { DrawingEntry, GamePhase, GameState, Mode, RecognitionResult, SessionKind } from '../core/types';
import { calculateScore } from '../core/score';

type SafeEntry = Omit<DrawingEntry, 'strokes'>;
interface Attempt {
  requestId: string;
  httpStatus: number | null;
  latencyMs: number;
  retryAfterMs: number | null;
  result: RecognitionResult;
}
interface PhaseTime { phase: GamePhase; round: number; elapsedMs: number; durationMs: number }

/** Second implementation using already-normalized saved intentions, not score.ts or words.ts. */
export function independentScore(entries: readonly SafeEntry[], kind: SessionKind) {
  const eligible = (entry?: SafeEntry) => Boolean(entry?.comparable && entry.recognition?.source !== 'mock');
  const links = Array.from({ length: 9 }, (_, index) => {
    const from = entries[index], to = entries[index + 1];
    const fromLetter = from?.intendedWord?.at(-1) || null, toLetter = to?.intendedWord?.at(0) || null;
    return { index, fromEntryId: from?.id ?? null, toEntryId: to?.id ?? null, fromLetter, toLetter,
      status: !fromLetter || !toLetter ? 'unknown' : fromLetter === toLetter ? 'connected' : 'broken',
      comparable: kind === 'api' && eligible(from) && eligible(to) };
  });
  let connectedCount = 0, knownPairCount = 0, bestChain = 0, run = 0;
  for (const link of links) {
    if (link.status !== 'unknown') knownPairCount++;
    run = link.status === 'connected' ? run + 1 : 0;
    if (run) connectedCount++;
    bestChain = Math.max(bestChain, run);
  }
  const comparable = kind === 'api' && entries.length === 10 && entries.every((entry, i) => eligible(entry) && entry.actor === (i % 2 ? 'player' : 'girl') && entry.round === Math.floor(i / 2) + 1);
  return { links, connectedCount, knownPairCount, possiblePairCount: 9, linkScore: knownPairCount ? connectedCount / knownPairCount : null, bestChain, comparable, perfect: comparable && knownPairCount === 9 && connectedCount === 9 };
}

/** Opt-in developer evidence. No strokes, images, headers or raw provider bodies are retained. */
export class LiveAcceptanceRecorder {
  private sessionId = 0;
  private started = 0;
  private ended = 0;
  private startedAt = '';
  private phase: GamePhase = 'title';
  private mode: Mode = 'day';
  private kind: SessionKind = 'demo';
  private entries: SafeEntry[] = [];
  private catalogue: { id: string; word: string }[] = [];
  private attempts: Attempt[] = [];
  private timeline: PhaseTime[] = [];
  private actualScore: ReturnType<typeof calculateScore> | null = null;
  constructor(private readonly now = () => performance.now()) {}

  observe(state: GameState) {
    if (!state.sessionId) return;
    const time = this.now();
    if (state.sessionId !== this.sessionId) {
      this.sessionId = state.sessionId; this.started = time; this.ended = 0;
      this.startedAt = new Date().toISOString(); this.attempts = []; this.timeline = [];
      this.catalogue = state.sketches.map(({ id, word }) => ({ id, word }));
    }
    const last = this.timeline.at(-1);
    if (last && !this.ended) last.durationMs = Math.round(time - this.started - last.elapsedMs);
    if (!last || last.phase !== state.phase || last.round !== state.round) this.timeline.push({ phase: state.phase, round: state.round, elapsedMs: Math.round(time - this.started), durationMs: 0 });
    this.phase = state.phase; this.mode = state.mode; this.kind = state.sessionKind;
    this.entries = state.entries.map(({ id, actor, round, intendedWord, templateId, comparable, nonComparableReason, recognition }) => ({ id, actor, round, intendedWord, templateId, comparable, nonComparableReason,
      recognition: recognition ? this.safeResult(recognition) : null }));
    if (state.phase === 'results') {
      if (!this.ended) this.ended = time;
      this.actualScore = calculateScore(state.entries, state.sessionKind);
    } else this.actualScore = null;
  }

  private safeResult(result: RecognitionResult): RecognitionResult {
    return { guess: typeof result.guess === 'string' && /^[a-z]{1,32}$/.test(result.guess) ? result.guess : null, source: result.source, ...(result.errorCode ? { errorCode: result.errorCode } : {}) };
  }

  recordAttempt(attempt: Attempt) {
    if (Number(attempt.requestId.split(':')[0]) !== this.sessionId) return;
    this.attempts.push({ requestId: attempt.requestId, httpStatus: attempt.httpStatus, latencyMs: Math.round(attempt.latencyMs), retryAfterMs: attempt.retryAfterMs, result: this.safeResult(attempt.result) });
  }

  report() {
    if (this.phase !== 'results' || !this.actualScore) return null;
    const checked = independentScore(this.entries, this.kind);
    const selectionChecks = this.entries.filter(entry => entry.actor === 'player' && entry.round < 5).map(player => {
      const next = this.entries.find(entry => entry.actor === 'girl' && entry.round === player.round + 1);
      const lastLetter = player.recognition?.guess?.at(-1) ?? null;
      return { round: player.round, guess: player.recognition?.guess ?? null, source: player.recognition?.source ?? null, lastLetter, nextTemplateId: next?.templateId ?? null, nextWord: next?.intendedWord ?? null,
        matches: Boolean(lastLetter && lastLetter === next?.intendedWord?.at(0)), inCatalogue: this.catalogue.some(sketch => sketch.id === next?.templateId && sketch.word === next?.intendedWord) };
    });
    return { schema: 'DRAWINDOW LIVE 5-Exchange Acceptance v0.1', evidence: 'Local browser transport + game state. Human authorship must be confirmed separately; HTTP fixture tests are not provider evidence.', humanAttestation: false,
      configuredModel: 'See local Worker configuration; modelId not independently observed.', sessionId: this.sessionId, mode: this.mode, sessionKind: this.kind, startedAt: this.startedAt, elapsedMs: Math.round(this.ended - this.started),
      timeline: this.timeline.map(phase => ({ ...phase })), attempts: this.attempts.map(attempt => ({ ...attempt })), entries: this.entries.map(entry => ({ ...entry })), selectionChecks,
      actualScore: this.actualScore, independentScore: checked, scoreMatches: JSON.stringify(checked) === JSON.stringify(this.actualScore) };
  }
}

export type AcceptanceReport = NonNullable<ReturnType<LiveAcceptanceRecorder['report']>>;
