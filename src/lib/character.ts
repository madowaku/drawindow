import type { GamePhase, GirlExpression } from '../core/types';

export const CHARACTER_FRAMES = ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing', 'blink'] as const;
export type CharacterFrame = typeof CHARACTER_FRAMES[number];
export const DRAWING_HESITATION = 0.14;

/** A short finger pause, then a slightly quicker final stroke. No game rules change. */
export function characterDrawingProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const moving = Math.max(0, (p - DRAWING_HESITATION) / (1 - DRAWING_HESITATION));
  return moving < 0.82 ? moving : Math.min(1, 0.82 + ((moving - 0.82) / 0.18) ** 0.8 * 0.18);
}

/** Acting depends only on conversational phase; recognition/score never enter here. */
export function characterExpression(phase: GamePhase, holdingSettled = true): GirlExpression {
  if (phase === 'girl_breath') return 'breath';
  if (phase === 'girl_drawing' || phase === 'recognizing') return 'thinking';
  if (phase === 'girl_holding') return holdingSettled ? 'smile' : 'shy';
  if (phase === 'player_drawing') return 'curious';
  return 'neutral';
}

export function characterFrame(phase: GamePhase, progress: number, holdingSettled = true): CharacterFrame {
  if (phase === 'girl_drawing' && progress >= DRAWING_HESITATION) return 'drawing';
  return characterExpression(phase, holdingSettled);
}

/** Shared portrait rectangle used by CSS and the separate breath mask. */
export function characterPortraitRect(width: number, height: number) {
  const portraitHeight = Math.min(height * 1.08, width * 1.25 / 0.75);
  return { left: (width - portraitHeight * 0.75) / 2, top: height * 1.07 - portraitHeight, width: portraitHeight * 0.75, height: portraitHeight };
}
