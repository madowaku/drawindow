import type { DrawingEntry, GameError, GameEvent, GameState, GirlSketch, Language, RecognitionErrorCode, RecognitionRequest, RecognitionResult, Stroke, StrokePoint } from './types';
import { lastLetter, normalizeWord, selectGirlSketch, selectJapaneseFreshSketch } from './words';

const MAX_ATTEMPTS = 3; // Original request plus two deliberate retries.

export function createInitialState(mode: GameState['mode'] = 'day', language: Language = 'en'): GameState {
  return { phase: 'title', mode, language, sessionKind: 'demo', sessionId: 0, round: 0, sketches: [], entries: [], activeStrokes: [], recognitionRequest: null, error: null, recognitionAttempt: 0 };
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
    comparable: state.sessionKind === 'api', ...(state.sessionKind === 'demo' ? { nonComparableReason: 'demo' as const } : {}) };
}

function withRequest(state: GameState, entry: DrawingEntry, attempt = 1): GameState {
  const sequence = state.recognitionAttempt + 1;
  const recognitionRequest: RecognitionRequest = { requestId: `${state.sessionId}:${state.round}:${sequence}`, playerEntryId: entry.id, strokes: entry.strokes, round: state.round, attempt, sessionKind: state.sessionKind, ...(state.language === 'ja' ? { language: 'ja' as const } : {}) };
  return { ...state, phase: 'recognizing', recognitionRequest, recognitionAttempt: sequence, error: null };
}

function errorState(state: GameState, code: RecognitionErrorCode, result?: RecognitionResult): GameState {
  const retryable = code !== 'invalid_input' && (state.recognitionRequest?.attempt ?? MAX_ATTEMPTS) < MAX_ATTEMPTS;
  const error: GameError = { code, retryable, message: code === 'uncovered_letter' ? "She can't think of the next drawing. Try again, redraw, or continue as a demo." : code === 'rate_limit' ? 'Recognition limit or quota reached. Please wait at least a minute before trying again. Your drawing is safe.' : "She couldn't read the drawing this time. Your drawing is safe." };
  const entries = result ? state.entries.map(entry => entry.id === state.recognitionRequest?.playerEntryId ? { ...entry, recognition: result, ...(code === 'uncovered_letter' ? { comparable: false, nonComparableReason: 'uncovered_letter' as const } : {}) } : entry) : state.entries;
  return { ...state, phase: 'recognition_error', error, entries };
}

export function selectPlayerEntries(state: GameState): DrawingEntry[] {
  return state.entries.filter(entry => entry.actor === 'player');
}

export function selectVisibleStrokes(state: GameState): readonly Stroke[] {
  if (state.phase === 'girl_drawing' || state.phase === 'girl_holding') return state.entries.at(-1)?.strokes ?? [];
  if (['player_drawing', 'recognizing', 'recognition_error'].includes(state.phase)) return state.activeStrokes;
  return [];
}

export function selectCanFinishDrawing(state: GameState): boolean {
  return state.phase === 'player_drawing' && state.activeStrokes.some(stroke => stroke.points.length > 0);
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
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
    case 'PLAYBACK_DONE': return state.phase === 'girl_drawing' ? { ...state, phase: 'girl_holding' } : state;
    case 'YOUR_TURN': return state.phase === 'girl_holding' ? { ...state, phase: 'player_drawing', activeStrokes: [], error: null } : state;
    case 'STROKES_CHANGED': return state.phase === 'player_drawing' && validStrokes(event.strokes) ? { ...state, activeStrokes: copyStrokes(event.strokes) } : state;
    case 'CLEAR': return state.phase === 'player_drawing' ? { ...state, activeStrokes: [] } : state;
    case 'UNDO': return state.phase === 'player_drawing' ? { ...state, activeStrokes: state.activeStrokes.slice(0, -1) } : state;
    case 'DONE': {
      if (!selectCanFinishDrawing(state)) return state;
      const entry: DrawingEntry = { id: `${state.sessionId}:player:${state.round}`, actor: 'player', round: state.round, strokes: copyStrokes(state.activeStrokes), intendedWord: null, recognition: null,
        comparable: state.sessionKind === 'api', ...(state.sessionKind === 'demo' ? { nonComparableReason: 'demo' } : {}) };
      const next = { ...state, entries: [...state.entries, entry] };
      return state.round === 5 ? { ...next, phase: 'review_intents', recognitionRequest: null, error: null } : withRequest(next, entry);
    }
    case 'RECOGNITION_RESOLVED': {
      if (state.phase !== 'recognizing' || state.recognitionRequest?.requestId !== event.requestId) return state;
      if (event.result.source !== (state.sessionKind === 'api' ? 'api' : 'mock')) return errorState(state, 'invalid_response');
      const guess = normalizeWord(event.result.guess, state.language);
      if (event.result.error || !guess) return errorState(state, event.result.errorCode ?? 'invalid_response', { ...event.result, guess: null });
      const result: RecognitionResult = { guess, source: event.result.source };
      const usedIds = state.entries.flatMap(e => e.templateId ? [e.templateId] : []);
      const tail = lastLetter(guess, state.language)!;
      const chainRestart = state.language === 'ja' && tail === 'ん';
      // A terminal ん is a genuine broken link. Restart with a different,
      // easy-to-continue drawing, without claiming the broken link as connected.
      const sketch = chainRestart
        ? selectJapaneseFreshSketch(state.sketches, usedIds)
        : selectGirlSketch(state.sketches, tail, usedIds, state.language);
      if (!sketch) return errorState(state, 'uncovered_letter', result);
      const entries = state.entries.map(entry => entry.id === state.recognitionRequest?.playerEntryId ? { ...entry, recognition: result } : entry);
      const round = state.round + 1;
      return { ...state, entries: [...entries, girlEntry(state, sketch, round, chainRestart)], round, phase: 'girl_breath', activeStrokes: [], recognitionRequest: null, error: null };
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
      return { ...state, entries: state.entries.map(entry => entry.id === event.entryId && entry.actor === 'player' ? { ...entry, intendedWord: normalizeWord(event.word, state.language) } : entry) };
    }
    case 'SHOW_RESULTS': return state.phase === 'review_intents' ? { ...state, phase: 'results' } : state;
    case 'RETURN_TO_TITLE': return { ...createInitialState(state.mode, state.language), sessionId: state.sessionId };
    default: return state;
  }
}
