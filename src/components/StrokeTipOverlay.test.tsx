// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StrokeTipOverlay } from './StrokeTipOverlay';

afterEach(cleanup);

describe('StrokeTipOverlay', () => {
  const layout = { left: 100, top: 80, size: 400 };
  const tip = { x: 0.25, y: 0.75, penDown: true };

  it('maps the normalized playback tip through the drawing square transform', () => {
    render(<StrokeTipOverlay tip={tip} layout={layout} reducedMotion={false} />);
    const overlay = screen.getByTestId('stroke-tip-overlay');
    expect(overlay.style.left).toBe('200px');
    expect(overlay.style.top).toBe('380px');
    expect(overlay.style.pointerEvents).toBe('none');
    expect(getComputedStyle(overlay).pointerEvents).toBe('none');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('stays hidden during lifts, completion, hidden phases, and reduced motion', () => {
    const { rerender } = render(<StrokeTipOverlay tip={null} layout={layout} reducedMotion={false} />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    rerender(<StrokeTipOverlay tip={{ ...tip, penDown: false }} layout={layout} reducedMotion={false} />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    rerender(<StrokeTipOverlay tip={tip} layout={layout} reducedMotion={false} visible={false} />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    rerender(<StrokeTipOverlay tip={tip} layout={layout} reducedMotion />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
    rerender(<StrokeTipOverlay tip={tip} layout={{ ...layout, size: 0 }} reducedMotion={false} />);
    expect(screen.queryByTestId('stroke-tip-overlay')).toBeNull();
  });
});
