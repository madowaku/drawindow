import { selectVisibleStrokes } from '../../core/gameMachine';
import { createFogTimeline, isTimedCanvasPhase } from '../../lib/fog';
import { getPlaybackDuration } from '../../lib/playback';
import { detectPremonitionTransition } from './logic';
import { replayRecording, type StudyRecording } from './recording';

/** Keep recorded gaps and every event. Timed phases must never be shortened
 * below the same breath/hesitation/stroke duration used by WindowCanvas.
 * Hidden/offscreen pauses were not recorded separately: excess wall time is
 * retained as a hold, rather than inventing a different stroke speed.
 */
export function createReplayTimeline(recording: StudyRecording) {
  const raw = replayRecording(recording);
  let at = 0;
  return raw.map((frame, index) => {
    if (index) {
      const previous = raw[index - 1];
      const timed = isTimedCanvasPhase(previous.state.phase);
      const duration = timed ? createFogTimeline(previous.state.mode, previous.state.phase, 0, {
        playbackDurationMs: getPlaybackDuration(selectVisibleStrokes(previous.state)),
      }).durationMs : 0;
      at += Math.max(0, frame.atMs - previous.atMs, duration);
    }
    const durationMs = createFogTimeline(frame.state.mode, frame.state.phase, 0, {
      playbackDurationMs: getPlaybackDuration(selectVisibleStrokes(frame.state)),
    }).durationMs;
    return { ...frame, playAt: at, durationMs, beat: detectPremonitionTransition(raw[index - 1]?.state ?? null, frame.state) };
  });
}
