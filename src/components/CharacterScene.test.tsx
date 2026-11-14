// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHIZUKU_POSES } from '../data/shizukuPoses';
import { SHIZUKU_EYE_TARGET } from '../data/shizukuPoses';
import { getShizukuReaction } from '../lib/character';
import { CharacterScene } from './CharacterScene';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(document, 'hidden'); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });

describe('character presentation lifecycle', () => {
  it('uses seven day sprites and seven pajama night sprites across day/night and keeps the character name out of play', () => {
    const { rerender } = render(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    const sprites = [...document.querySelectorAll<HTMLImageElement>('.character-scene__sprite')];
    const sources = sprites.map(img => img.getAttribute('src'));
    expect(sprites).toHaveLength(7);
    expect(sources.every(source => source?.includes('/art/shizuku/'))).toBe(true);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');
    rerender(<CharacterScene mode="day" phase="player_drawing" hasPlayerMarks reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('curious');
    rerender(<CharacterScene mode="night" phase="player_drawing" reducedMotion={false} />);
    expect([...document.querySelectorAll('.character-scene__sprite')].every(img => img.getAttribute('src')?.includes('/art/shizuku-night/'))).toBe(true);
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
    expect(document.querySelector('.character-scene__blink')).toBeNull();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('false');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByTestId('character-scene').getAttribute('data-running')).toBe('true');
    expect(document.querySelector('.character-scene__blink')).toBeNull();
  });

  it('begins drawing motion with ink, keeps nodes through fades and does not react again to stroke/UI renders', () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel, pause: vi.fn(), play: vi.fn(), playState: 'running' }));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const { rerender } = render(<CharacterScene mode="day" phase="girl_drawing" progress={0} reducedMotion={false} />);
    const sprite = document.querySelector('.character-scene__sprite');
    expect(animate).not.toHaveBeenCalled();
    rerender(<CharacterScene mode="day" phase="girl_drawing" progress={.14} reducedMotion={false} />);
    expect(animate).toHaveBeenCalledTimes(1);
    rerender(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    rerender(<CharacterScene mode="day" phase="player_drawing" hasPlayerMarks reducedMotion={false} />);
    expect(animate).toHaveBeenCalledTimes(2);
    rerender(<CharacterScene mode="day" phase="player_drawing" hasPlayerMarks progress={.8} reducedMotion={false} />);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.character-scene__sprite')).toBe(sprite);
    rerender(<CharacterScene mode="day" phase="player_drawing" reducedMotion={false} />);
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('pauses a hidden gesture and resumes its clock without replaying completed beats', () => {
    const animation = { playState: 'running', cancel: vi.fn(), pause: vi.fn(() => { animation.playState = 'paused'; }), play: vi.fn(() => { animation.playState = 'running'; }) };
    const animate = vi.fn(() => animation);
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    render(<CharacterScene mode="night" phase="player_drawing" hasPlayerMarks reducedMotion={false} />);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(animation.pause).toHaveBeenCalledTimes(1);
    expect(animation.cancel).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    expect(animation.play).toHaveBeenCalledTimes(1);
    animation.playState = 'finished';
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    expect(animation.play).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('pauses an offscreen portrait and disconnects its observer on unmount', () => {
    let visibilityChanged: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { visibilityChanged = callback; }
      observe() { /* Events are controlled below. */ }
      disconnect = disconnect;
    });
    const animation = { playState: 'running', cancel: vi.fn(), pause: vi.fn(() => { animation.playState = 'paused'; }), play: vi.fn(() => { animation.playState = 'running'; }) };
    const animate = vi.fn(() => animation);
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const { unmount } = render(<CharacterScene mode="day" phase="player_drawing" hasPlayerMarks reducedMotion={false} />);
    act(() => visibilityChanged([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(animation.pause).toHaveBeenCalledTimes(1);
    act(() => visibilityChanged([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(animation.play).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
    unmount();
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps one stable title portrait with reduced motion', () => {
    render(<CharacterScene mode="day" phase="title" reducedMotion />);
    expect(document.querySelector('.character-scene__blink')).toBeNull();
    expect(screen.getByTestId('character-scene').getAttribute('data-pose')).toBe('neutral');
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
    expect(document.querySelector('.character-scene__blink')).toBeNull();
    fireEvent.error(active);
    expect(active.getAttribute('src')).toBe(SHIZUKU_POSES.neutral.src);
    expect(active.hidden).toBe(false);
  });

  it.each(['day', 'night'] as const)('recovers a failed %s room when changing mode and returning', mode => {
    const { rerender } = render(<CharacterScene mode={mode} phase="title" reducedMotion />);
    const room = () => document.querySelector<HTMLImageElement>('.character-scene__room')!;
    fireEvent.error(room());
    expect(room().hidden).toBe(true);
    rerender(<CharacterScene mode={mode === 'day' ? 'night' : 'day'} phase="title" reducedMotion />);
    expect(room().hidden).toBe(false);
    rerender(<CharacterScene mode={mode} phase="title" reducedMotion />);
    expect(room().hidden).toBe(false);
    expect(room().src).toContain(`room-${mode}.webp`);
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

it('recovers a failed night pose to pajama neutral, including after changing mode', () => {
  const { rerender } = render(<CharacterScene mode="night" phase="girl_breath" reducedMotion />);
  const active = document.querySelector<HTMLImageElement>('.character-scene__sprite[data-active="true"]')!;
  fireEvent.error(active);
  expect(active.src).toContain('/art/shizuku-night/neutral.webp');
  fireEvent.error(active);
  expect(active.hidden).toBe(true);
  rerender(<CharacterScene mode="day" phase="girl_breath" reducedMotion />);
  expect(document.querySelector<HTMLImageElement>('.character-scene__sprite[data-active="true"]')!.hidden).toBe(false);
});
