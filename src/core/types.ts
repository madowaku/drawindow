/** Shared contract. Core state is deterministic; presentation must not reveal words in play. */
export type Mode = 'day' | 'night';
export type Language = 'en' | 'ja';
export type SessionKind = 'api' | 'demo';
export type GirlExpression = 'neutral' | 'thinking' | 'smile' | 'shy' | 'breath' | 'curious';

export type GamePhase =
  | 'title'
  | 'girl_breath'
  | 'girl_drawing'
  | 'girl_holding'
  | 'girl_notice'
  | 'girl_flustered'
  | 'player_drawing'
  | 'recognizing'
  | 'recognition_error'
  | 'review_intents'
  | 'results';

/** x/y are normalized to 0..1. t is milliseconds from the drawing's start. */
export interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number;
}

/** Each pointer-down/up gesture is one stroke. IDs are unique within a drawing. */
export interface Stroke {
  id: string;
  points: readonly StrokePoint[];
}

export interface GirlSketch {
  id: string;
  word: string;
  strokes: readonly Stroke[];
  durationMs?: number;
  /** Absent only on legacy/custom callers; treated as safe for compatibility. */
  readability?: DoodleReadability;
}

export type DoodleReadability = 'safe' | 'soft' | 'spicy' | 'reject';
export interface DoodleSource {
  kind: 'quick-draw' | 'original';
  attribution: string;
  /** Local provenance document, not a request sent to recognition. */
  reference: string;
}
export interface DoodleCandidate extends GirlSketch {
  letter: string;
  source: DoodleSource;
  readability: DoodleReadability;
  /** Maker judgement, never an empirical blind-recognition score. */
  reviewNote: string;
}

export interface WindowCanvasProps {
  /** Withdrawn girl drawing fades under the new breath, never player ink. */
  previousStrokes?: readonly Stroke[];
  mode: Mode;
  phase: GamePhase;
  /** Cosmetic acting variation only; never target words or recognition output. */
  round?: number;
  strokes: readonly Stroke[];
  onStrokesChange: (strokes: readonly Stroke[]) => void;
  onBreathDone: () => void;
  onPlaybackDone: () => void;
  reducedMotion: boolean;
  expression?: GirlExpression;
  /** Neutral developer canvas still uses the production stroke/pointer pipeline. */
  variant?: 'glass' | 'neutral';
  /** Cosmetic A/B selection. Does not affect recorded geometry or inference. */
  glassStyle?: 'tactile' | 'legacy';
  onInputTypeChange?: (type: 'mouse' | 'touch' | 'pen' | 'keyboard') => void;
}

export type RecognitionSource = 'api' | 'mock';
export type RecognitionErrorCode =
  | 'unavailable'
  | 'timeout'
  | 'rate_limit'
  | 'invalid_response'
  | 'invalid_input'
  | 'network'
  | 'uncovered_letter';

export interface RecognitionResult {
  guess: string | null;
  alternatives?: readonly string[];
  source: RecognitionSource;
  error?: string;
  errorCode?: RecognitionErrorCode;
}

export interface RecognitionInput {
  requestId: string;
  /** English by default for v0.4 compatible callers. */
  language?: Language;
  strokes: readonly Stroke[];
  /** Neutral black-on-white PNG; never a screenshot of the character/glass. */
  imageDataUrl?: string;
}

export interface DrawingRecognizer {
  recognize(
    input: RecognitionInput,
    options?: { signal?: AbortSignal },
  ): Promise<RecognitionResult>;
}

export interface RecognitionRequest extends RecognitionInput {
  playerEntryId: string;
  round: number;
  attempt: number;
  sessionKind: SessionKind;
}

export interface GameError {
  code: RecognitionErrorCode;
  /** Safe non-spoiler copy, not raw provider output. */
  message: string;
  retryable: boolean;
}

export type NonComparableReason = 'demo' | 'mock' | 'uncovered_letter';

export interface DrawingEntry {
  id: string;
  /** True if the Japanese chain had to restart after a final ん. */
  chainRestart?: boolean;
  actor: 'girl' | 'player';
  /** 1..5, with the girl preceding the player in each exchange. */
  round: number;
  strokes: readonly Stroke[];
  /** Girl's template word; player's own label only after review begins. */
  intendedWord: string | null;
  recognition: RecognitionResult | null;
  templateId?: string;
  /** Withdrawn before the player turn; retained for an honest local record. */
  falseStart?: GirlSketch;
  comparable: boolean;
  nonComparableReason?: NonComparableReason;
}

export interface GameState {
  language: Language;
  phase: GamePhase;
  mode: Mode;
  sessionKind: SessionKind;
  /** Monotonically increases on START, including after returning to title. */
  sessionId: number;
  round: number;
  sketches: readonly GirlSketch[];
  entries: readonly DrawingEntry[];
  activeStrokes: readonly Stroke[];
  recognitionRequest: RecognitionRequest | null;
  error: GameError | null;
  recognitionAttempt: number;
  girlCorrection?: GirlSketch | null;
  girlSlipUsed?: boolean;
}

export type GameEvent =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'START'; mode: Mode; sessionKind: SessionKind; sketches: readonly GirlSketch[] }
  | { type: 'BREATH_DONE' }
  | { type: 'PLAYBACK_DONE' }
  | { type: 'YOUR_TURN' }
  | { type: 'GIRL_OOPS_BEAT_DONE'; sessionId: number; round: number; phase: 'girl_notice' | 'girl_flustered' }
  | { type: 'STROKES_CHANGED'; strokes: readonly Stroke[] }
  | { type: 'CLEAR' }
  | { type: 'UNDO' }
  | { type: 'DONE' }
  | { type: 'RECOGNITION_RESOLVED'; requestId: string; result: RecognitionResult }
  | { type: 'RETRY_RECOGNITION' }
  | { type: 'USE_DEMO' }
  | { type: 'BACK_TO_DRAWING' }
  | { type: 'SET_INTENT'; entryId: string; word: string }
  | { type: 'SHOW_RESULTS' }
  | { type: 'RETURN_TO_TITLE' };

export type LinkStatus = 'connected' | 'broken' | 'unknown';

export interface ScoreLink {
  /** Zero-based index of one of the nine adjacency links. */
  index: number;
  fromEntryId: string | null;
  toEntryId: string | null;
  status: LinkStatus;
  fromLetter: string | null;
  toLetter: string | null;
  comparable: boolean;
}

export interface ScoreResult {
  links: readonly ScoreLink[];
  connectedCount: number;
  knownPairCount: number;
  possiblePairCount: 9;
  /** 0..1, or null when no intended-word pairs are known. */
  linkScore: number | null;
  /** Number of consecutive connected links, not number of pictures. */
  bestChain: number;
  comparable: boolean;
  perfect: boolean;
}
