import { describe, expect, it } from 'vitest';
import { characterDrawingProgress, characterExpression, characterFrame, DRAWING_HESITATION } from './character';

describe('conversational character acting', () => {
  it('keeps the finger still briefly, preserves monotonic drawing, and finishes exactly', () => {
    expect(characterDrawingProgress(0)).toBe(0);
    expect(characterDrawingProgress(DRAWING_HESITATION)).toBe(0);
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const current = characterDrawingProgress(i / 100);
      expect(current).toBeGreaterThanOrEqual(last);
      last = current;
    }
    expect(characterDrawingProgress(1)).toBe(1);
  });

  it('acts on the conversation, with no praise or failure reaction on an API error', () => {
    expect(characterExpression('girl_breath')).toBe('breath');
    expect(characterFrame('girl_drawing', 0)).toBe('thinking');
    expect(characterFrame('girl_drawing', 0.5)).toBe('drawing');
    expect(characterExpression('girl_holding', false)).toBe('shy');
    expect(characterExpression('girl_holding', true)).toBe('smile');
    expect(characterExpression('player_drawing')).toBe('curious');
    expect(characterExpression('recognizing')).toBe('thinking');
    expect(characterExpression('recognition_error')).toBe('neutral');
    expect(characterExpression('results')).toBe('neutral');
  });
});
