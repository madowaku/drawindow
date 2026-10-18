// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHIZUKU_POSES } from '../data/shizukuPoses';
import { SHIZUKU_EYE_TARGET } from '../data/shizukuPoses';
import { getShizukuReaction } from '../lib/character';
import { CharacterScene } from './CharacterScene';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(document, 'hidden'); });

describe('character presentation lifecycle', () => {
  it('uses the seven alpha sprites across day/night and keeps the character name out of play', () => {
    const { rerender } = render(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    const sprites = [...document.querySelectorAll<HTMLImageElement>('.character-scene__sprite')];
    const sources = sprites.map(img => img.getAttribute('src'));
    expect(sprites).toHaveLength(7);
    expect(sources.every(source => source?.includes('/art/shizuku/'))).toBe(true);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');
    rerender(<CharacterScene mode="night" phase="player_drawing" reducedMotion={false} />);
    expect([...document.querySelectorAll('.character-scene__sprite')].map(img => img.getAttribute('src'))).toEqual(sources);
    expect(document.body.textContent).not.toMatch(/Shizuku|しずく/);
  });

  it('selects holding poses from round context without a separate timer and preserves preview override', () => {
    vi.useFakeTimers();
    const { rerender } = render(<CharacterScene mode="day" phase="girl_holding" round={1} reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');
    expect(vi.getTimerCount()).toBe(0);
    rerender(<CharacterScene mode="day" phase="girl_holding" round={2} reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('smile');
    rerender(<CharacterScene mode="day" phase="girl_holding" frameOverride="shy" reducedMotion />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('shy');
    expect(getShizukuReaction({ phase: 'girl_holding', mode: 'day', round: 1, reducedMotion: false }))
      .toMatchObject({ pose: 'neutral' });
  });

  it('leans 11px through the full day breath beat and uses a short subdued night beat', () => {
    const cancel = vi.fn();
    const animate = vi.fn((..._args: unknown[]) => ({ cancel }));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const { rerender, unmount } = render(<CharacterScene mode="day" phase="girl_breath" reducedMotion={false} />);
    const dayFrames = animate.mock.calls[0]?.[0] as Keyframe[];
    expect((dayFrames[1]?.transform as string)).toContain('translateY(-11px)');
    expect((animate.mock.calls[0]?.[1] as KeyframeAnimationOptions).duration).toBe(650);

    rerender(<CharacterScene mode="night" phase="girl_breath" reducedMotion={false} />);
    const nightFrames = animate.mock.calls[1]?.[0] as Keyframe[];
    expect((nightFrames[1]?.transform as string)).toContain('translateY(-3px)');
    expect((animate.mock.calls[1]?.[1] as KeyframeAnimationOptions).duration).toBe(280);

    rerender(<CharacterScene mode="night" phase="girl_breath" reducedMotion />);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');
    expect(animate).toHaveBeenCalledTimes(2);
    unmount();
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });

  it('stops idle motion when a hidden document is reported', () => {
    render(<CharacterScene mode="day" phase="title" reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-blink-enabled')).toBe('true');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('true');
    expect(screen.getByTestId('character-scene').getAttribute('data-blink-enabled')).toBe('true');
  });

  it('disables the title blink with reduced motion', () => {
    render(<CharacterScene mode="day" phase="title" reducedMotion />);
    expect(screen.getByTestId('character-scene').getAttribute('data-blink-enabled')).toBe('false');
    expect(document.querySelector('.character-scene__blink')).toBeTruthy();
  });

  it('falls back once to the neutral pose and hides a repeatedly failed image', () => {
    render(<CharacterScene mode="day" phase="girl_breath" reducedMotion />);
    const active = document.querySelector<HTMLImageElement>('.character-scene__sprite[data-active="true"]')!;
    expect(active.getAttribute('src')).toBe(SHIZUKU_POSES.breath.src);
    fireEvent.error(active);
    expect(active.getAttribute('src')).toBe(SHIZUKU_POSES.neutral.src);
    expect(active.dataset.fallbackApplied).toBe('true');
    fireEvent.error(active);
    expect(active.hidden).toBe(true);

    const room = document.querySelector<HTMLImageElement>('.character-scene__room')!;
    fireEvent.error(room);
    expect(room.hidden).toBe(true);
  });
  it('recovers a missing review candidate to the original neutral without enabling the old blink',()=>{
    render(<CharacterScene mode="day" phase="title" reducedMotion={false} artSet="candidate" />);
    const active=document.querySelector<HTMLImageElement>('.character-scene__sprite[data-active="true"]')!;
    expect(active.src).toContain('/art/shizuku-v04/neutral.webp');
    expect(screen.getByTestId('character-scene').getAttribute('data-blink-enabled')).toBe('false');
    fireEvent.error(active);
    expect(active.getAttribute('src')).toBe(SHIZUKU_POSES.neutral.src);
    expect(active.hidden).toBe(false);
  });

  it('registers source eye anchors against one common eye target at rendered CSS scale', () => {
    render(<CharacterScene mode="day" phase="title" reducedMotion />);
    for (const sprite of document.querySelectorAll<HTMLImageElement>('.character-scene__sprite')) {
      const id = sprite.getAttribute('src')?.split('/').at(-1)?.replace('.webp', '') as keyof typeof SHIZUKU_POSES;
      expect(sprite.style.getPropertyValue('--pose-eye-x')).toBe(`${SHIZUKU_POSES[id].anchor.x * 100}%`);
      expect(sprite.style.getPropertyValue('--pose-eye-y')).toBe(`${SHIZUKU_POSES[id].anchor.y * 100}%`);
    }
    expect(SHIZUKU_EYE_TARGET).toEqual({ x: 0.5, y: 0.392 });
  });
});
