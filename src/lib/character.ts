import type { GamePhase, Mode } from '../core/types';
import type { ShizukuPoseId } from '../data/shizukuPoses';

export const CHARACTER_FRAMES = ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing', 'blink'] as const;
export type CharacterFrame = ShizukuPoseId | 'blink';
export const DRAWING_HESITATION = 0.14;

export type CharacterMotion = 'idle' | 'breath' | 'draw' | 'watch' | 'think' | 'hold' | 'concern' | 'review' | 'result';

export interface ShizukuReactionInput {
  phase: GamePhase;
  mode: Mode;
  round?: number;
  reducedMotion: boolean;
  progress?: number;
}

export interface ShizukuReaction {
  pose: CharacterFrame;
  motion: CharacterMotion;
  /** Small vertical gesture in CSS pixels. Zero when motion is reduced. */
  leanPx: number;
  /** One phase-triggered gesture duration; zero when motion is reduced. */
  durationMs: number;
}

/**
 * Selects a conversational reaction from game phase and presentation context.
 * No result, recognition, score, or player-intent data enters this selector.
 */
export function getShizukuReaction({
  phase,
  mode,
  round = 1,
  reducedMotion,
  progress = 1,
}: ShizukuReactionInput): ShizukuReaction {
  const safeRound = Number.isFinite(round) ? Math.max(1, Math.floor(round)) : 1;
  let pose: CharacterFrame = 'neutral';
  let motion: CharacterMotion = 'idle';
  let leanPx = 0;
  let durationMs = 0;

  switch (phase) {
    case 'title':
      break;
    case 'girl_breath':
      pose = mode === 'day' ? 'breath' : 'neutral';
      motion = 'breath';
      leanPx = mode === 'day' ? 11 : 3;
      durationMs = mode === 'day' ? 650 : 280;
      break;
    case 'girl_drawing':
      pose = progress < DRAWING_HESITATION ? 'thinking' : 'drawing';
      motion = 'draw';
      leanPx = 2;
      durationMs = 600;
      break;
    case 'girl_holding':
      // This varies by exchange only; it never reads whether the guess was right.
      pose = safeRound % 2 === 0 ? 'smile' : 'neutral';
      motion = 'hold';
      break;
    case 'player_drawing':
      pose = safeRound % 2 === 1 ? 'curious' : 'neutral';
      motion = 'watch';
      leanPx = 2;
      durationMs = 600;
      break;
    case 'recognizing':
      pose = 'thinking';
      motion = 'think';
      break;
    case 'recognition_error':
      pose = 'neutral';
      motion = 'concern';
      break;
    case 'review_intents':
      pose = 'neutral';
      motion = 'review';
      break;
    case 'results':
      // General closing tone, selected by exchange number rather than score.
      pose = safeRound % 2 === 0 ? 'shy' : 'smile';
      motion = 'result';
      break;
  }

  return {
    pose,
    motion,
    leanPx: reducedMotion ? 0 : leanPx,
    durationMs: reducedMotion ? 0 : durationMs,
  };
}

/** Short hold before her first stroke, followed by a slightly quicker finish. */
export function characterDrawingProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const moving = Math.max(0, (p - DRAWING_HESITATION) / (1 - DRAWING_HESITATION));
  return moving < 0.82 ? moving : Math.min(1, 0.82 + ((moving - 0.82) / 0.18) ** 0.8 * 0.18);
}

/** Shared portrait rectangle used by CSS and the separate breath mask. */
export function characterPortraitRect(width: number, height: number) {
  const portraitHeight = Math.min(height * 1.08, width * 1.25 / 0.75);
  return { left: (width - portraitHeight * 0.75) / 2, top: height * 1.07 - portraitHeight, width: portraitHeight * 0.75, height: portraitHeight };
}
