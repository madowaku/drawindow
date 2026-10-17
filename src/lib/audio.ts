let context: AudioContext | undefined;

/** Quiet synthesized breath and glass note. Only invoked after a user enables sound. */
export function playSound(kind: 'breath' | 'turn' | 'finish') {
  try {
    context ??= new AudioContext();
    void context.resume();
    const gain = context.createGain();
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(kind === 'breath' ? 0.035 : 0.025, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    if (kind === 'breath') {
      const buffer = context.createBuffer(1, context.sampleRate * 0.6, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 900;
      source.buffer = buffer; source.connect(filter); filter.connect(gain); source.start();
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'finish' ? 659 : 440, now);
      oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + 0.6);
    }
  } catch { /* Sound is optional; drawing never depends on audio support. */ }
}
