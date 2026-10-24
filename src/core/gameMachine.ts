import type { DrawingEntry, GameError, GameEvent, GameState, GirlSketch, Language, RecognitionErrorCode, RecognitionRequest, RecognitionResult, Stroke, StrokePoint } from './types';
import { lastLetter, normalizeWord, selectGirlSketch, selectJapaneseFreshSketch, selectJapaneseSlip } from './words';
import { observeCanonicalName, recordIntention, recordRecognition, recognitionDetails } from './naming';
import { sameStrokes } from './drawingHistory';

const MAX_ATTEMPTS = 3; // Original request plus two deliberate retries.

export function createInitialState(mode: GameState['mode'] = 'day', language: Language = 'en'): GameState {
  return { phase: 'title', mode, language, sessionKind: 'demo', sessionId: 0, round: 0, sketches: [], entries: [], activeStrokes: [], drawingHistory: { past: [], future: [] }, recognitionRequest: null, error: null, recognitionAttempt: 0 };
}
export const initialState = createInitialState();

function copyStrokes(strokes: readonly Stroke[]): Stroke[] {
  return strokes.map(stroke => ({ id: stroke.id, points: stroke.points.map(point => ({ ...point })) }));
}

function validStrokes(strokes: readonly Stroke[]): boolean {
  if (!Array.isArray(strokes) || strokes.length > 256) return false;
  let count = 0;
  return strokes.every(stroke => typeof stroke.id === 'string' && Array.isArray(stroke.points) && stroke.points.every((point: StrokePoint) => {
    count++;
    return count <= 16000 && Number.isFinite(point.x) && point.x >= 0 && point.x <= 1 &&
      Number.isFinite(point.y) && point.y >= 0 && point.y <= 1 && Number.isFinite(point.t) && point.t >= 0 &&
      (point.pressure === undefined || (Number.isFinite(point.pressure) && point.pressure >= 0 && point.pressure <= 1));
  }));
}

function girlEntry(state: GameState, sketch: GirlSketch, round: number, chainRestart = false): DrawingEntry {
  return { chainRestart, id: `${state.sessionId}:girl:${round}`, actor: 'girl', round, strokes: copyStrokes(sketch.strokes), intendedWord: normalizeWord(sketch.word, state.language), recognition: null, templateId: sketch.id,
    comparable: state.sessionKind === 'api', ...(state.language === 'ja' ? { naming: { canonical: observeCanonicalName(sketch, 'ja') } } : {}), ...(state.sessionKind === 'demo' ? { nonComparableReason: 'demo' as const } : {}) };
}

function withRequest(state: GameState, entry: DrawingEntry, attempt = 1): GameState {
  const sequence = state.recognitionAttempt + 1;
  const recognitionRequest: RecognitionRequest = { requestId: `${state.sessionId}:${state.round}:${sequence}`, playerEntryId: entry.id, strokes: entry.strokes, round: state.round, attempt, sessionKind: state.sessionKind, ...(state.language === 'ja' ? { language: 'ja' as const } : {}) };
  return { ...state, phase: 'recognizing', recognitionRequest, recognitionAttempt: sequence, error: null };
}

function errorState(state: GameState, code: RecognitionErrorCode, result?: RecognitionResult): GameState {
  const retryable = code !== 'invalid_input' && (state.recognitionRequest?.attempt ?? MAX_ATTEMPTS) < MAX_ATTEMPTS;
  const error: GameError = { code, retryable, message: code === 'uncovered_letter' ? "She can't think of the next drawing. Try again, redraw, or continue as a demo." : code === 'rate_limit' ? 'Recognition limit or quota reached. Please wait at least a minute before trying again. Your drawing is safe.' : "She couldn't read the drawing this time. Your drawing is safe." };
  const entries = result ? state.entries.map(entry => entry.id === state.recognitionRequest?.playerEntryId ? { ...recordRecognition(entry, result, state.language), ...(code === 'uncovered_letter' ? { comparable: false, nonComparableReason: 'uncovered_letter' as const } : {}) } : entry) : state.entries;
  return { ...state, phase: 'recognition_error', error, entries };
}

export function selectPlayerEntries(state: GameState): DrawingEntry[] {
  return state.entries.filter(entry => entry.actor === 'player');
}

export function selectVisibleStrokes(state: GameState): readonly Stroke[] {
  if (['girl_drawing', 'girl_holding', 'girl_notice', 'girl_flustered'].includes(state.phase)) return state.entries.at(-1)?.strokes ?? [];
  if (['player_drawing', 'recognizing', 'recognition_error'].includes(state.phase)) return state.activeStrokes;
  return [];
}

export function selectCanFinishDrawing(state: GameState): boolean {
  return state.phase === 'player_drawing' && state.activeStrokes.some(stroke => stroke.points.length > 0);
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'RESTORE_SESSION': return state.phase === 'title' ? event.state : state;
    case 'SET_MODE': return state.phase === 'title' ? { ...state, mode: event.mode } : state;
    case 'SET_LANGUAGE': return state.phase === 'title' ? { ...state, language: event.language } : state;
    case 'START': {
      if (state.phase !== 'title' && state.phase !== 'results') return state;
      const first = event.sketches[0];
      if (!first || !normalizeWord(first.word, state.language) || !validStrokes(first.strokes)) return state;
      const next = { ...createInitialState(event.mode, state.language), sessionKind: event.sessionKind, sessionId: state.sessionId + 1, sketches: event.sketches, round: 1, phase: 'girl_breath' as const };
      return { ...next, entries: [girlEntry(next, first, 1)] };
    }
    case 'BREATH_DONE': return state.phase === 'girl_breath' ? { ...state, phase: 'girl_drawing' } : state;
    case 'PLAYBACK_DONE': return state.phase === 'girl_drawing'
      ? { ...state, phase: state.girlCorrection ? 'girl_notice' : 'girl_holding' } : state;
    case 'GIRL_OOPS_BEAT_DONE': {
      if (event.sessionId !== state.sessionId || event.round !== state.round || event.phase !== state.phase || !state.girlCorrection) return state;
      if (state.phase === 'girl_notice') return { ...state, phase: 'girl_flustered' };
      if (state.phase !== 'girl_flustered') return state;
      const previous = state.entries.at(-1)!;
      const correction = girlEntry(state, state.girlCorrection, state.round, previous.chainRestart);
      const falseStart = state.sketches.find(sketch => sketch.id === previous.templateId);
      return { ...state, phase: 'girl_breath', girlCorrection: null,
        entries: [...state.entries.slice(0, -1), { ...correction, falseStart }] };
    }
    case 'YOUR_TURN': return state.phase === 'girl_holding' ? { ...state, phase: 'player_drawing', activeStrokes: [], drawingHistory: { past: [], future: [] }, error: null } : state;
    case 'STROKES_CHANGED': {
      if (state.phase !== 'player_drawing' || !validStrokes(event.strokes) || sameStrokes(state.activeStrokes, event.strokes)) return state;
      // A gesture publishes repeatedly. Only its new ID creates an undo step.
      const newStroke = event.strokes.some(stroke => stroke.points.length > 0 && !state.activeStrokes.some(previous => previous.id === stroke.id));
      return { ...state, activeStrokes: copyStrokes(event.strokes), drawingHistory: {
        past: newStroke ? [...state.drawingHistory.past, state.activeStrokes].slice(-32) : state.drawingHistory.past,
        future: [],
      } };
    }
    case 'CLEAR': return state.phase === 'player_drawing' && state.activeStrokes.length > 0
      ? { ...state, activeStrokes: [], drawingHistory: { past: [...state.drawingHistory.past, state.activeStrokes].slice(-32), future: [] } } : state;
    case 'UNDO': {
      const previous = state.drawingHistory.past.at(-1);
      return state.phase === 'player_drawing' && previous ? { ...state, activeStrokes: previous, drawingHistory: {
        past: state.drawingHistory.past.slice(0, -1), future: [...state.drawingHistory.future, state.activeStrokes].slice(-32),
      } } : state;
    }
    case 'REDO': {
      const next = state.drawingHistory.future.at(-1);
      return state.phase === 'player_drawing' && next ? { ...state, activeStrokes: next, drawingHistory: {
        past: [...state.drawingHistory.past, state.activeStrokes].slice(-32), future: state.drawingHistory.future.slice(0, -1),
      } } : state;
    }
    case 'DONE': {
      if (!selectCanFinishDrawing(state)) return state;
      const entry: DrawingEntry = { id: `${state.sessionId}:player:${state.round}`, actor: 'player', round: state.round, strokes: copyStrokes(state.activeStrokes), intendedWord: null, recognition: null,
        comparable: state.sessionKind === 'api', ...(state.sessionKind === 'demo' ? { nonComparableReason: 'demo' } : {}) };
      const next = { ...state, entries: [...state.entries, entry] };
      return state.round === 5 ? { ...next, phase: 'review_intents', recognitionRequest: null, error: null } : withRequest(next, entry);
    }
    case 'RECOGNITION_RESOLVED': {
      if (state.phase !== 'recognizing' || state.recognitionRequest?.requestId !== event.requestId) return state;
      if (event.result.source !== (state.sessionKind === 'api' ? 'api' : state.sessionKind === 'ml' ? 'ml' : 'mock')) return errorState(state, 'invalid_response');
      const guess = normalizeWord(event.result.guess, state.language);
      if (event.result.error || !guess) return errorState(state, event.result.errorCode ?? 'invalid_response', { ...event.result, guess: null });
      const result: RecognitionResult = recognitionDetails(event.result, state.language);
      const usedIds = state.entries.flatMap(e => e.templateId ? [e.templateId] : []);
      const tail = lastLetter(guess, state.language)!;
      const chainRestart = state.language === 'ja' && tail === 'ん';
      // A terminal ん is a genuine broken link. Restart with a different,
      // easy-to-continue drawing, without claiming the broken link as connected.
      const sketch = chainRestart
        ? selectJapaneseFreshSketch(state.sketches, usedIds)
        : selectGirlSketch(state.language === 'ja' ? state.sketches.filter(candidate => lastLetter(candidate.word, 'ja') !== 'ん') : state.sketches, tail, usedIds, state.language, state.mode);
      if (!sketch) return errorState(state, 'uncovered_letter', result);
      const entries = state.entries.map(entry => entry.id === state.recognitionRequest?.playerEntryId ? recordRecognition(entry, result, state.language) : entry);
      const round = state.round + 1;
      // One eligible slip in a rotating three-round slot; never the starter or
      // a response to the player's terminal-ん restart. Require a safe redraw.
      const slip = state.language === 'ja' && !state.girlSlipUsed && !chainRestart &&
        (state.sessionId + round) % 3 === 0 && lastLetter(sketch.word, 'ja') !== 'ん' &&
        (!sketch.readability || sketch.readability === 'safe')
        ? selectJapaneseSlip(state.sketches, tail, usedIds) : null;
      return { ...state, entries: [...entries, girlEntry(state, slip ?? sketch, round, chainRestart)], girlCorrection: slip ? sketch : null, girlSlipUsed: state.girlSlipUsed || Boolean(slip), round, phase: 'girl_breath', activeStrokes: [], drawingHistory: { past: [], future: [] }, recognitionRequest: null, error: null };
    }
    case 'RETRY_RECOGNITION': {
      if (state.phase !== 'recognition_error' || !state.error?.retryable || !state.recognitionRequest) return state;
      const entry = state.entries.at(-1)!;
      return withRequest(state, entry, state.recognitionRequest.attempt + 1);
    }
    case 'USE_DEMO': {
      if (state.phase !== 'recognition_error') return state;
      const entries = state.entries.map(entry => ({ ...entry, comparable: false, nonComparableReason: 'demo' as const }));
      return withRequest({ ...state, sessionKind: 'demo', entries }, entries.at(-1)!);
    }
    case 'BACK_TO_DRAWING': {
      if (state.phase !== 'recognition_error') return state;
      return { ...state, phase: 'player_drawing', entries: state.entries.slice(0, -1), activeStrokes: copyStrokes(state.entries.at(-1)!.strokes), recognitionRequest: null, error: null };
    }
    case 'SET_INTENT': {
      if (state.phase !== 'review_intents' || !state.entries.some(e => e.id === event.entryId && e.actor === 'player')) return state;
      return { ...state, entries: state.entries.map(entry => entry.id === event.entryId && entry.actor === 'player' ? recordIntention(entry, event.word, state.language) : entry) };
    }
    case 'SHOW_RESULTS': return state.phase === 'review_intents' ? { ...state, phase: 'results' } : state;
    case 'RETURN_TO_TITLE': return { ...createInitialState(state.mode, state.language), sessionId: state.sessionId };
    default: return state;
  }
}
