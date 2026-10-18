import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameAudio } from './audio';
import type { MusicAsset, MusicTrack } from './music';

function fixture() {
  const gainNodes: Array<{ gain: { value: number; linearRampToValueAtTime: ReturnType<typeof vi.fn> } }> = [];
  const source = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null, frequency: { setValueAtTime: vi.fn() } });
  const oscillator = source();
  const context = {
    state: 'suspended', currentTime: 10, sampleRate: 44100, destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
    createGain: vi.fn(() => {
      const param = { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn((value: number) => { param.value = value; }), linearRampToValueAtTime: vi.fn((value: number) => { param.value = value; }), exponentialRampToValueAtTime: vi.fn() };
      const node = { gain: param, connect: vi.fn(), disconnect: vi.fn() }; gainNodes.push(node); return node;
    }),
    createMediaElementSource: vi.fn(source), createOscillator: vi.fn(() => oscillator),
  };
  const media = {
    paused: true, src: '', currentTime: 0, dataset: {} as Record<string, string>, loop: false,
    play: vi.fn(async () => { media.paused = false; }), pause: vi.fn(() => { media.paused = true; }),
    load: vi.fn(), removeAttribute: vi.fn(), remove: vi.fn(),
  };
  const loads: Array<{ track: MusicTrack; signal: AbortSignal; resolve: (asset: MusicAsset) => void; reject: (error: Error) => void }> = [];
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const createMedia = vi.fn(() => media as unknown as HTMLAudioElement);
  const audio = createGameAudio({ createContext, createMedia, load: (track, signal) => new Promise((resolve, reject) => { loads.push({ track, signal, resolve, reject }); }) });
  async function complete(index: number) {
    const asset = { url: `blob:fixture-${index}`, release: vi.fn() };
    loads[index].resolve(asset); await Promise.resolve(); await Promise.resolve();
    return asset;
  }
  return { audio, context, media, loads, complete, createContext, createMedia, gainNodes, oscillator };
}

afterEach(() => vi.useRealTimers());

describe('owned music lifecycle', () => {
  it('fades into the ending once, does not loop it or restart it at natural completion, and restores gameplay on restart', async () => {
    vi.useFakeTimers(); const f = fixture();
    f.audio.setTrack('day'); f.audio.setEnabled(true); const day = await f.complete(0);
    f.audio.setTrack('ending'); await f.complete(1);
    await vi.advanceTimersByTimeAsync(850);
    expect(day.release).toHaveBeenCalledTimes(1);
    expect(f.media.dataset.drawindowBgm).toBe('ending');
    expect(f.media.loop).toBe(false);
    f.media.currentTime = 45;
    f.audio.setTrack('ending');
    expect(f.media.currentTime).toBe(45); expect(f.loads).toHaveLength(2);
    Object.assign(f.media, { ended: true, paused: true });
    const plays = f.media.play.mock.calls.length;
    f.audio.retryFromGesture();
    expect(f.media.play).toHaveBeenCalledTimes(plays);
    Object.assign(f.media, { ended: false });
    f.audio.setTrack('day'); await f.complete(2);
    expect(f.media.dataset.drawindowBgm).toBe('day'); expect(f.media.loop).toBe(true);
    f.audio.dispose();
  });
  it('does not create or load audio while initially muted', () => {
    const f = fixture();
    f.audio.setTrack('day'); f.audio.setVisible(false); f.audio.setVisible(true); f.audio.playSound('turn'); f.audio.retryFromGesture();
    expect(f.createContext).not.toHaveBeenCalled(); expect(f.loads).toHaveLength(0); f.audio.dispose();
  });

  it('uses one looping player and keeps the current track across ordinary phase updates', async () => {
    const f = fixture(); f.audio.setEnabled(true); await f.complete(0);
    expect(f.media.dataset.drawindowBgm).toBe('title'); expect(f.media.loop).toBe(true);
    f.audio.setTrack('title'); f.audio.setTrack('title');
    expect(f.loads).toHaveLength(1); expect(f.createMedia).toHaveBeenCalledTimes(1);
    expect(f.gainNodes[0].gain.value).toBeGreaterThan(0); expect(f.gainNodes[0].gain.value).toBeLessThan(0.3); f.audio.dispose();
  });

  it('switches title to the chosen scene with a fade and releases the previous source', async () => {
    vi.useFakeTimers(); const f = fixture(); f.audio.setEnabled(true); const title = await f.complete(0);
    f.audio.setTrack('night'); const night = await f.complete(1);
    expect(f.media.dataset.drawindowBgm).toBe('title');
    await vi.advanceTimersByTimeAsync(200);
    expect(f.media.dataset.drawindowBgm).toBe('night'); expect(title.release).toHaveBeenCalledTimes(1);
    expect(f.createMedia).toHaveBeenCalledTimes(1); f.audio.dispose(); expect(night.release).toHaveBeenCalledTimes(1);
  });

  it('cannot start a late load after mute, even if its loader ignores abort', async () => {
    const f = fixture(); f.audio.setEnabled(true); f.audio.setEnabled(false);
    expect(f.loads[0].signal.aborted).toBe(true); const stale = await f.complete(0);
    expect(stale.release).toHaveBeenCalledTimes(1); expect(f.media.play).not.toHaveBeenCalled();
    f.audio.setEnabled(true); await f.complete(1); expect(f.media.play).toHaveBeenCalledTimes(1); f.audio.dispose();
  });

  it('ignores an older track that resolves after a newer selection', async () => {
    const f = fixture(); f.audio.setEnabled(true); f.audio.setTrack('day');
    await f.complete(1); const stale = await f.complete(0);
    expect(f.media.dataset.drawindowBgm).toBe('day'); expect(stale.release).toHaveBeenCalledTimes(1);
    expect(f.media.play).toHaveBeenCalledTimes(1); f.audio.dispose();
  });

  it('pauses when hidden and resumes the same position without another download', async () => {
    const f = fixture(); f.audio.setEnabled(true); await f.complete(0); f.media.currentTime = 42;
    f.audio.setVisible(false); expect(f.media.paused).toBe(true); expect(f.context.state).toBe('suspended');
    f.audio.retryFromGesture(); expect(f.media.paused).toBe(true);
    f.audio.setVisible(true); await Promise.resolve();
    expect(f.media.currentTime).toBe(42); expect(f.media.paused).toBe(false); expect(f.loads).toHaveLength(1); f.audio.dispose();
  });

  it('mute cancels a pending fade and stops current effects immediately', async () => {
    vi.useFakeTimers(); const f = fixture(); f.audio.setEnabled(true); await f.complete(0);
    f.audio.playSound('turn'); f.audio.setTrack('day'); const pending = await f.complete(1);
    f.audio.setEnabled(false); await vi.advanceTimersByTimeAsync(500);
    expect(f.media.paused).toBe(true); expect(f.media.dataset.drawindowBgm).toBe('title');
    expect(pending.release).toHaveBeenCalledTimes(1); expect(f.oscillator.stop).toHaveBeenCalledWith(); f.audio.dispose();
  });

  it('retries a blocked media play only after a later explicit gesture', async () => {
    const f = fixture(); f.media.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    f.audio.setEnabled(true); await f.complete(0); await Promise.resolve();
    expect(f.media.paused).toBe(true); f.audio.retryFromGesture(); await Promise.resolve();
    expect(f.media.paused).toBe(false); expect(f.loads).toHaveLength(1);
    // A browser may suspend the graph while the native media clock still runs.
    f.context.state = 'suspended'; const plays = f.media.play.mock.calls.length;
    f.audio.retryFromGesture(); await Promise.resolve();
    expect(f.context.state).toBe('running'); expect(f.media.play).toHaveBeenCalledTimes(plays); f.audio.dispose();
  });

  it('recovers from a failed asset request without a retry loop', async () => {
    const f = fixture(); f.audio.setEnabled(true); f.loads[0].reject(new Error('offline'));
    await Promise.resolve(); await Promise.resolve(); expect(f.loads).toHaveLength(1);
    f.audio.retryFromGesture(); await f.complete(1); expect(f.media.paused).toBe(false); f.audio.dispose();
  });

  it('dispose releases resources and rejects a late source even after re-enable calls', async () => {
    const f = fixture(); f.audio.setEnabled(true); f.audio.dispose(); const stale = await f.complete(0);
    f.audio.setEnabled(true); f.audio.setTrack('day'); f.audio.setVisible(true);
    expect(f.context.close).toHaveBeenCalledTimes(1); expect(f.media.remove).toHaveBeenCalledTimes(1);
    expect(stale.release).toHaveBeenCalledTimes(1); expect(f.loads).toHaveLength(1); expect(f.media.play).not.toHaveBeenCalled();
  });
});
