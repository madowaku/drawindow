import type { Language, RecognitionResult } from '../../core/types';
import type { ScoredLabel } from '../../services/quickDrawScores';

export type PolicyId = 'A' | 'B' | 'C';
export interface ContextInput {
  language: Language;
  previousWord: string;
  candidates: readonly ScoredLabel[];
  failure?: RecognitionResult;
}
export interface ContextConfig {
  variant: 'gap' | 'bonus';
  maxRank: number;
  maxGap: number;
  strength: number;
}
export interface CandidateLog extends ScoredLabel {
  rank: number;
  word: string | null;
  contextMatch: boolean;
}
export interface PolicySelection {
  policy: PolicyId;
  result: RecognitionResult;
  selectedRank: number | null;
  selectedLabel: string | null;
  reason: string;
  changed: boolean;
  unknown: boolean;
  correctionMs: number;
}
export interface ContextComparison {
  language: Language;
  previousWord: string;
  expectedFirst: string | null;
  config: ContextConfig;
  validFrame: boolean;
  candidates: CandidateLog[];
  selections: Record<PolicyId, PolicySelection>;
}
/** Collected after selection; never passed to compareContextRecognition. */
export interface EvaluationInput {
  intendedWord?: string;
  perceivedPreviousWord?: string;
  intendedModelLabel?: string;
  observedContinuation?: Partial<Record<PolicyId, boolean>>;
  enjoyment?: number;
  replayIntent?: number;
  shizukuFeeling?: number;
}
export interface PolicyEvaluation {
  exactClassMatch: boolean | null;
  outOfVocabularyAbstained: boolean | null;
  readingMatch: boolean | null;
  lexicalContinuation: boolean;
  templateExists: boolean;
  observedContinuation: boolean | null;
  relativeToA: 'benefit' | 'harm' | 'unchanged' | 'unevaluated';
}
export interface EvaluatedComparison {
  comparison: ContextComparison;
  evaluation: EvaluationInput;
  policies: Record<PolicyId, PolicyEvaluation>;
  perceivedPreviousMatches: boolean | null;
}
