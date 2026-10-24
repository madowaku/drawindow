import type { DrawingEntry, GamePhase, GameState, GirlSketch, RecognitionResult, Stroke } from '../core/types';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { gameSketches } from '../data/gameSketches';
import { recordIntention, recordRecognition, observeCanonicalName } from '../core/naming';

export const SESSION_SCHEMA = 1;
export interface SessionSnapshot {
  version: number;
  state: Omit<GameState, 'sketches' | 'recognitionRequest' | 'girlCorrection'>;
  sketchIds: string[];
  correctionId: string | null;
  requestAttempt: number | null;
  intentDrafts: Record<string, string>;
}
export interface RestoredSession { state: GameState; intentDrafts: Record<string, string>; }
export function encodeSession(state: GameState, intentDrafts: Record<string, string>): SessionSnapshot {
  const { sketches, recognitionRequest: _request, girlCorrection, ...saved } = state;
  return { version: SESSION_SCHEMA, state: saved, sketchIds: sketches.map(s => s.id), correctionId: girlCorrection?.id ?? null, requestAttempt: _request?.attempt ?? null, intentDrafts };
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 128): v is string => typeof v === 'string' && v.length <= max;
function strokes(v: unknown): v is readonly Stroke[] {
  if (!Array.isArray(v) || v.length > 256) return false;
  let points = 0;
  return v.every(s => object(s) && text(s.id) && Array.isArray(s.points) && s.points.every(p => {
    points++;
    return points <= 16000 && object(p) && typeof p.x === 'number' && Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 &&
      typeof p.y === 'number' && Number.isFinite(p.y) && p.y >= 0 && p.y <= 1 && typeof p.t === 'number' && Number.isFinite(p.t) && p.t >= 0 &&
      (p.pressure === undefined || typeof p.pressure === 'number' && Number.isFinite(p.pressure) && p.pressure >= 0 && p.pressure <= 1);
  }));
}
const phases: GamePhase[] = ['girl_breath', 'girl_drawing', 'girl_holding', 'girl_notice', 'girl_flustered', 'player_drawing', 'recognizing', 'recognition_error', 'review_intents', 'results'];
const codes = ['unavailable', 'timeout', 'rate_limit', 'invalid_response', 'invalid_input', 'network', 'uncovered_letter'];
function recognition(v: unknown): v is RecognitionResult | null {
  return v === null || object(v) && ['ml', 'api', 'mock'].includes(v.source as string) && (v.guess === null || text(v.guess, 64)) &&
    (v.label === undefined || text(v.label, 64)) && (v.uncertain === undefined || typeof v.uncertain === 'boolean') &&
    (v.alternatives === undefined || Array.isArray(v.alternatives) && v.alternatives.length <= 10 && v.alternatives.every(a => text(a, 64))) &&
    (v.error === undefined || text(v.error, 1024)) && (v.errorCode === undefined || codes.includes(v.errorCode as string));
}
/** Reject unknown schemas instead of guessing at a migration. v1 has no older game saves. */
export function decodeSession(value: unknown): RestoredSession | null {
  try {
    if (!object(value) || value.version !== SESSION_SCHEMA || !object(value.state)) return null;
    const raw = value.state;
    if (!['en', 'ja'].includes(raw.language as string) || !['day', 'night'].includes(raw.mode as string) || !['api', 'demo', 'ml'].includes(raw.sessionKind as string) ||
      !phases.includes(raw.phase as GamePhase) || !Number.isSafeInteger(raw.round) || Number(raw.round) < 1 || Number(raw.round) > 5 ||
      !Number.isSafeInteger(raw.sessionId) || Number(raw.sessionId) < 0 || !Number.isSafeInteger(raw.recognitionAttempt) || Number(raw.recognitionAttempt) < 0 || !strokes(raw.activeStrokes) ||
      !Array.isArray(raw.entries) || raw.entries.length < 1 || raw.entries.length > 10 || !Array.isArray(value.sketchIds) || value.sketchIds.length > 1000 || !value.sketchIds.every(id => text(id))) return null;
    const language = raw.language as GameState['language'];
    const catalogue = gameSketches(language);
    const byId = new Map(catalogue.map(s => [s.id, s]));
    const sketches = value.sketchIds.map(id => byId.get(id as string));
    if (!sketches.length || sketches.some(s => !s) || new Set(value.sketchIds).size !== sketches.length) return null;
    if (value.correctionId !== null && (!text(value.correctionId) || !byId.has(value.correctionId))) return null;
    if (['girl_notice', 'girl_flustered'].includes(raw.phase as string) && value.correctionId === null) return null;
    if (value.correctionId !== null && !['girl_breath', 'girl_drawing', 'girl_notice', 'girl_flustered'].includes(raw.phase as string)) return null;
    // A fresh epoch invalidates every pending request and presentation callback.
    const sessionId = Math.max(Date.now(), Number(raw.sessionId) + 1);
    const idMap = new Map<string, string>();
    const entries: DrawingEntry[] = [];
    for (const [index, e] of raw.entries.entries()) {
      const actor = index % 2 ? 'player' : 'girl', round = Math.floor(index / 2) + 1;
      if (!object(e) || e.actor !== actor || e.round !== round || !text(e.id) || idMap.has(e.id) || !strokes(e.strokes) || !recognition(e.recognition) ||
        !(e.intendedWord === null || text(e.intendedWord, 64)) || typeof e.comparable !== 'boolean' ||
        (e.chainRestart !== undefined && typeof e.chainRestart !== 'boolean') ||
        (e.nonComparableReason !== undefined && !['demo', 'mock', 'uncovered_letter'].includes(e.nonComparableReason as string))) return null;
      const template = actor === 'girl' ? byId.get(e.templateId as string) : undefined;
      if (actor === 'girl' && (!template || !value.sketchIds.includes(e.templateId as string))) return null;
      const id = `${sessionId}:${actor}:${round}`;
      idMap.set(e.id, id);
      let entry: DrawingEntry = { id, actor, round, strokes: e.strokes, intendedWord: e.intendedWord, recognition: null, comparable: e.comparable,
        ...(e.chainRestart ? { chainRestart: true } : {}), ...(e.nonComparableReason ? { nonComparableReason: e.nonComparableReason as DrawingEntry['nonComparableReason'] } : {}),
        ...(template ? { templateId: template.id, ...(language === 'ja' ? { naming: { canonical: observeCanonicalName(template, language) } } : {}) } : {}) };
      if (e.falseStart !== undefined) {
        if (!object(e.falseStart) || !text(e.falseStart.id) || !byId.has(e.falseStart.id)) return null;
        entry.falseStart = byId.get(e.falseStart.id);
      }
      if (actor === 'player' && e.intendedWord !== null) {
        const observation = object(e.naming) && object(e.naming.intention) ? e.naming.intention : null;
        if (observation && !text(observation.label, 64) && observation.label !== null) return null;
        entry = recordIntention(entry, observation && text(observation.label, 64) ? observation.label : e.intendedWord, language);
      }
      if (e.recognition) entry = recordRecognition(entry, e.recognition, language);
      entries.push(entry);
    }
    const phase = raw.phase as GamePhase, round = Number(raw.round);
    const expected = ['review_intents', 'results'].includes(phase) ? 10 : ['recognizing', 'recognition_error'].includes(phase) ? round * 2 : round * 2 - 1;
    if (entries.length !== expected || (expected === 10 && round !== 5)) return null;
    if (!object(raw.drawingHistory) || !Array.isArray(raw.drawingHistory.past) || !Array.isArray(raw.drawingHistory.future) ||
      raw.drawingHistory.past.length > 32 || raw.drawingHistory.future.length > 32 || !raw.drawingHistory.past.every(strokes) || !raw.drawingHistory.future.every(strokes)) return null;
    if (!object(value.intentDrafts) || Object.keys(value.intentDrafts).length > 5) return null;
    const intentDrafts: Record<string, string> = {};
    for (const [key, word] of Object.entries(value.intentDrafts)) {
      if (!text(word, 48) || !idMap.has(key) || !entries.some(e => e.id === idMap.get(key) && e.actor === 'player')) return null;
      intentDrafts[idMap.get(key)!] = word;
    }
    let state: GameState = { ...createInitialState(raw.mode as GameState['mode'], language), phase, sessionId, round, sessionKind: raw.sessionKind as GameState['sessionKind'],
      sketches: sketches as GirlSketch[], entries, activeStrokes: raw.activeStrokes, drawingHistory: raw.drawingHistory as unknown as GameState['drawingHistory'],
      recognitionAttempt: Number(raw.recognitionAttempt) + 1, girlSlipUsed: raw.girlSlipUsed === true, girlCorrection: value.correctionId ? byId.get(value.correctionId as string)! : null };
    if (['recognizing', 'recognition_error'].includes(phase)) {
      if (round === 5) return null;
      if (!Number.isSafeInteger(value.requestAttempt) || Number(value.requestAttempt) < 1 || Number(value.requestAttempt) > 3) return null;
      const attempt = Number(value.requestAttempt);
      const entry = entries.at(-1)!;
      if (phase === 'recognition_error' && (!object(raw.error) || !codes.includes(raw.error.code as string) || typeof raw.error.retryable !== 'boolean' || !text(raw.error.message, 1024))) return null;
      const error = phase === 'recognition_error' ? { ...(raw.error as unknown as GameState['error'])!, retryable: (raw.error as Record<string, unknown>).retryable === true && attempt < 3 && (raw.error as Record<string, unknown>).code !== 'invalid_input' }
        : { code: 'unavailable' as const, message: 'The interrupted interpretation was not repeated. Your drawing is safe; try again or return to drawing.', retryable: attempt < 3 };
      state = { ...state, phase: 'recognition_error', activeStrokes: entry.strokes, error,
        recognitionRequest: { requestId: `${sessionId}:${round}:${state.recognitionAttempt}`, playerEntryId: entry.id, round, attempt, sessionKind: state.sessionKind, language, strokes: entry.strokes } };
    }
    // Complete only pending cosmetic beats, without timers/audio or a new entry.
    for (let i = 0; i < 8; i++) {
      if (state.phase === 'girl_breath') state = gameReducer(state, { type: 'BREATH_DONE' });
      else if (state.phase === 'girl_drawing') state = gameReducer(state, { type: 'PLAYBACK_DONE' });
      else if (state.phase === 'girl_notice' || state.phase === 'girl_flustered') state = gameReducer(state, { type: 'GIRL_OOPS_BEAT_DONE', sessionId, round, phase: state.phase });
      else break;
    }
    return { state, intentDrafts };
  } catch { return null; }
}

let database: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('drawindow-session', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Local save database blocked'));
    request.onsuccess = () => {
      const connection = request.result;
      connection.onversionchange = () => { connection.close(); database = undefined; };
      resolve(connection);
    };
  }).catch(error => { database = undefined; throw error; });
  return database;
}
export async function readSession(): Promise<unknown> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('sessions', 'readonly').objectStore('sessions').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function writeSession(snapshot: SessionSnapshot | null): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    if (snapshot) store.put(snapshot, 'current'); else store.delete('current');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Local save aborted'));
    transaction.onerror = () => reject(transaction.error);
  });
}
