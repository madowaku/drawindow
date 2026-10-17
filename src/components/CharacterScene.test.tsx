// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharacterScene } from './CharacterScene';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(document, 'hidden'); });

describe('character presentation lifecycle', () => {
  it('uses identical portraits across day/night and keeps her name out of play', () => {
    const { rerender } = render(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    const sources = [...document.querySelectorAll('.character-scene__sprite')].map(img => img.getAttribute('src'));
    rerender(<CharacterScene mode="night" phase="player_drawing" reducedMotion={false} />);
    expect([...document.querySelectorAll('.character-scene__sprite')].map(img => img.getAttribute('src'))).toEqual(sources);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');
    expect(document.body.textContent).not.toMatch(/Shizuku|しずく/);
  });

  it('looks down briefly after drawing, then looks back, with a cleaned-up timer', () => {
    vi.useFakeTimers();
    const { rerender, unmount } = render(<CharacterScene mode="day" phase="girl_holding" reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('shy');
    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('smile');
    rerender(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels browser gestures on reduced motion and unmount', () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const { rerender, unmount } = render(<CharacterScene mode="day" phase="girl_breath" reducedMotion={false} />);
    expect(animate).toHaveBeenCalledTimes(1);
    rerender(<CharacterScene mode="day" phase="girl_breath" reducedMotion />);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');
    expect(animate).toHaveBeenCalledTimes(1);
    unmount();
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });

  it('stops movement in a hidden document and resumes when visible', () => {
    render(<CharacterScene mode="day" phase="title" reducedMotion={false} />);
    Object.defineProperty(document, 'hidden', { configurable:true, value:true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');
    Object.defineProperty(document, 'hidden', { configurable:true, value:false });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('true');
  });
});
