import { loadMusic, MUSIC_GAIN, type MusicAsset, type MusicTrack } from './music';

export type SoundKind = 'breath' | 'turn' | 'finish';
interface AudioOptions {
  createContext?: () => AudioContext;
  createMedia?: () => HTMLAudioElement;
  load?: (track: MusicTrack, signal: AbortSignal) => Promise<MusicAsset>;
}

/** One owned player; async loads cannot resurrect muted, hidden or disposed audio. */
export function createGameAudio(options: AudioOptions = {}) {
  let context: AudioContext | undefined;
  let media: HTMLAudioElement | undefined;
  let musicGain: GainNode | undefined;
  let effectsGain: GainNode | undefined;
  let mediaSource: MediaElementAudioSourceNode | undefined;
  let enabled = false, visible = true, disposed = false;
  let desired: MusicTrack = 'title', loaded: MusicTrack | undefined;
  let currentAsset: MusicAsset | undefined, pendingAsset: MusicAsset | undefined;
  let pending: AbortController | undefined;
  let generation = 0;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const effects = new Set<AudioScheduledSourceNode>();
  const load = options.load ?? loadMusic;
  const audible = () => enabled && visible && !disposed;

  function ramp(value: number, seconds = 0) {
    if (!context || !musicGain) return;
    const gain = musicGain.gain, now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(value, now + seconds);
  }

  function ensureContext() {
    if (context) return;
    context = (options.createContext ?? (() => new AudioContext()))();
    musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(context.destination);
    effectsGain = context.createGain(); effectsGain.connect(context.destination);
    media = (options.createMedia ?? (() => {
      const element = new Audio();
      element.hidden = true; element.setAttribute('aria-hidden', 'true');
      element.dataset.drawindowBgm = '';
      document.body.appendChild(element);
      return element;
    }))();
    media.preload = 'none'; media.loop = true;
    mediaSource = context.createMediaElementSource(media); mediaSource.connect(musicGain);
  }

  function invalidate() {
    generation++;
    pending?.abort(); pending = undefined;
    clearTimeout(fadeTimer); fadeTimer = undefined;
    pendingAsset?.release(); pendingAsset = undefined;
  }

  function stopEffects() {
    for (const source of effects) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    effects.clear();
  }

  function pause() {
    invalidate();
    ramp(0);
    media?.pause();
    stopEffects();
    if (context?.state === 'running') void context.suspend().catch(() => {});
  }

  function playMusic() {
    if (!audible() || !media || !currentAsset || loaded !== desired) return;
    const token = generation;
    try {
      void context?.resume().catch(() => {});
      void media.play().then(() => {
        if (token === generation && audible()) ramp(MUSIC_GAIN[desired], 0.45);
      }).catch(() => { /* A later user gesture can retry a browser-blocked play. */ });
    } catch { /* Optional audio never blocks drawing. */ }
  }

  function requestMusic() {
    if (!audible()) return;
    try {
      ensureContext();
      void context!.resume().catch(() => {});
      if (loaded === desired) { playMusic(); return; }
      if (pending) return;
      invalidate();
      const token = generation, track = desired;
      const controller = new AbortController(); pending = controller;
      const fading = media && !media.paused;
      ramp(0, fading ? 0.18 : 0);
      void load(track, controller.signal).then(asset => {
        if (token !== generation || !audible()) { asset.release(); return; }
        pendingAsset = asset;
        const commit = () => {
          fadeTimer = undefined; pending = undefined; pendingAsset = undefined;
          if (token !== generation || !audible()) { asset.release(); return; }
          media!.pause();
          currentAsset?.release(); currentAsset = asset;
          loaded = track;
          media!.dataset.drawindowBgm = track;
          media!.src = asset.url;
          media!.load();
          playMusic();
        };
        if (fading) fadeTimer = setTimeout(commit, 200); else commit();
      }).catch(() => { if (token === generation) { pending = undefined; media?.pause(); } });
    } catch { pause(); }
  }

  function playSound(kind: SoundKind) {
    if (!audible()) return;
    try {
      ensureContext();
      const ctx = context!;
      void ctx.resume().catch(() => {});
      const gain = ctx.createGain(); gain.connect(effectsGain!);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(kind === 'breath' ? 0.035 : 0.025, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      let source: AudioScheduledSourceNode;
      let filter: BiquadFilterNode | undefined;
      if (kind === 'breath') {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = buffer;
        filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
        noise.connect(filter); filter.connect(gain); source = noise;
      } else {
        const oscillator = ctx.createOscillator(); oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(kind === 'finish' ? 659 : 440, now);
        oscillator.connect(gain); source = oscillator;
      }
      effects.add(source);
      source.onended = () => { effects.delete(source); source.disconnect(); filter?.disconnect(); gain.disconnect(); };
      source.start(now); source.stop(now + 0.6);
    } catch { /* Sound support is optional. */ }
  }

  return {
    setTrack(track: MusicTrack) { if (desired !== track) { desired = track; invalidate(); requestMusic(); } },
    setEnabled(value: boolean) { enabled = value; if (audible()) requestMusic(); else pause(); },
    setVisible(value: boolean) { visible = value; if (audible()) requestMusic(); else pause(); },
    retryFromGesture() {
      if (!audible()) return;
      if (context && context.state !== 'running') void context.resume().catch(() => {});
      if (!media || media.paused) requestMusic();
    },
    playSound,
    dispose() {
      disposed = true; pause();
      mediaSource?.disconnect(); musicGain?.disconnect(); effectsGain?.disconnect();
      media?.removeAttribute('src'); media?.load(); media?.remove();
      currentAsset?.release(); currentAsset = undefined;
      if (context) void context.close().catch(() => {});
    },
  };
}
