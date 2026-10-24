import { createInitialState, gameReducer } from '../../core/gameMachine';
import type { GameEvent, GameState } from '../../core/types';

export interface RecordedEvent { atMs: number; event: GameEvent; }
export interface StudyRecording {
  version: 1;
  initialState: GameState;
  events: RecordedEvent[];
  /** Complete means observed from title; it does not mean five exchanges finished. */
  completeness: 'complete' | 'partial';
}
export interface ReplayFrame { atMs: number; state: GameState; event?: GameEvent; }

/** Pure replay. Recognition results are recorded inputs; no recognizer is constructed. */
export function replayRecording(recording: StudyRecording): ReplayFrame[] {
  let state = structuredClone(recording.initialState);
  return [{ atMs: 0, state }, ...recording.events.map(({ atMs, event }) => {
    state = gameReducer(state, event);
    return { atMs, state, event };
  })];
}

function sameGesture(a: GameEvent, b: GameEvent): boolean {
  return a.type === 'STROKES_CHANGED' && b.type === 'STROKES_CHANGED' &&
    a.strokes.length === b.strokes.length && a.strokes.every((stroke, i) => stroke.id === b.strokes[i].id);
}

function equivalentStrokeReplacement(base: GameState, state: GameState, event: GameEvent): boolean {
  const replacement = gameReducer(base, event);
  if (replacement === base || replacement.phase !== 'player_drawing' || state.phase !== 'player_drawing') return false;
  const sameHistory = (a: GameState['drawingHistory']['past'], b: GameState['drawingHistory']['past']) =>
    a.length === b.length && a.every((snapshot, index) => snapshot === b[index]);
  // A stroke publication changes only activeStrokes and drawingHistory. Accepted
  // replacements copy the same incoming geometry, so only undo snapshots need comparison.
  return sameHistory(replacement.drawingHistory.past, state.drawingHistory.past) &&
    sameHistory(replacement.drawingHistory.future, state.drawingHistory.future);
}

/** Observe before dispatching events. Initial observation is intentionally idempotent. */
export class PremonitionRecorder {
  private value: StudyRecording | null = null;
  private timeline: ReplayFrame[] = [];
  private origin = 0;
  constructor(private readonly now: () => number = () => performance.now()) {}

  observeInitial(state: GameState): void {
    if (this.value) return;
    this.origin = this.now();
    const initialState = structuredClone(state);
    this.value = { version: 1, initialState, events: [], completeness: state.phase === 'title' ? 'complete' : 'partial' };
    this.timeline = [{ atMs: 0, state: initialState }];
  }

  record(input: GameEvent): void {
    if (!this.value) throw new Error('Observe the initial game state before recording events');
    const event = structuredClone(input);
    let previous = this.timeline.at(-1)!.state;
    let state = gameReducer(previous, event);
    if (event.type === 'START' && state !== previous && state.phase === 'girl_breath') {
      // One trace per playthrough; do not carry a previous participant's drawings.
      previous = { ...createInitialState(previous.mode, previous.language), sessionId: previous.sessionId };
      this.origin = this.now();
      this.value = { version: 1, initialState: previous, events: [], completeness: 'complete' };
      this.timeline = [{ atMs: 0, state: previous }];
      state = gameReducer(previous, event);
    }
    const atMs = Math.max(this.timeline.at(-1)!.atMs, this.now() - this.origin);
    if (event.type === 'RESTORE_SESSION' && previous.phase === 'title' && state !== previous) this.value.completeness = 'partial';
    const last = this.value.events.at(-1);
    // Preserve gesture starts, undo/redo/clear boundaries, and ignored invalid publications.
    // Equality also handles an empty first sample or a changed ID being rejected by the reducer.
    const canReplace = last && sameGesture(last.event, event) &&
      equivalentStrokeReplacement(this.timeline.at(-2)!.state, state, event);
    if (canReplace) {
      this.value.events[this.value.events.length - 1] = { atMs, event };
      this.timeline[this.timeline.length - 1] = { atMs, state, event };
    } else {
      this.value.events.push({ atMs, event });
      this.timeline.push({ atMs, state, event });
    }
  }

  /** Immutable reducer state/event objects are shared; callers must treat snapshots as read-only. */
  get recording(): StudyRecording | null { return this.value ? { ...this.value, events: this.value.events.slice() } : null; }
  get frames(): ReplayFrame[] { return this.timeline.slice(); }
}

/** Separate explicit action: this file includes drawings, words, and actual game events. */
export function exportReplay(recording: StudyRecording): string {
  return JSON.stringify({ format: 'drawindow-premonition-local-replay', privacy: 'local-only; includes drawing geometry and recorded game events', recording }, null, 2);
}
