import { useEffect, useRef, useState } from 'react';
import type { GamePhase, Mode } from '../core/types';
import { CHARACTER_FRAMES, characterFrame, type CharacterFrame } from '../lib/character';
import './CharacterScene.css';

export const characterArt = (name: string) => `${import.meta.env.BASE_URL}art/shizuku/${name}.webp`;

interface Props { mode: Mode; phase: GamePhase; progress?: number; reducedMotion: boolean; frameOverride?: CharacterFrame }

/** Pose sprites + native browser animation. Glass and ink live outside this component. */
export function CharacterScene({ mode, phase, progress = 1, reducedMotion, frameOverride }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const [running, setRunning] = useState(true);
  const frame = frameOverride ?? characterFrame(phase, progress, settled || reducedMotion);

  useEffect(() => {
    setSettled(false);
    if (phase !== 'girl_holding' || reducedMotion) return;
    const timer = window.setTimeout(() => setSettled(true), 760);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    let onScreen = true;
    const update = () => setRunning(onScreen && !document.hidden);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      update();
    });
    if (rootRef.current) observer?.observe(rootRef.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  useEffect(() => {
    const target = gestureRef.current;
    if (reducedMotion || !target?.animate || !running) return;
    // One finite gesture per phase, independent of the game clock and callbacks.
    const leaning = phase === 'girl_breath' || phase === 'player_drawing';
    const animation = target.animate([
      { transform: 'translateY(2px) rotate(-0.25deg) scale(1)' },
      { transform: `translateY(${leaning ? '-3px' : '0px'}) rotate(${phase === 'recognizing' ? '-0.6' : '0.2'}deg) scale(${leaning ? '1.018' : '1'})` },
    ], { duration: mode === 'night' ? 1000 : 760, easing: 'ease-out', fill: 'both' });
    return () => animation.cancel();
  }, [phase, mode, reducedMotion, running]);

  return <div className="character-scene" ref={rootRef} aria-hidden="true" data-mode={mode} data-pose={frame} data-running={running && !reducedMotion} data-testid="character-scene">
    <img className="character-scene__room" src={characterArt(`room-${mode}`)} alt="" draggable={false} />
    <div className="character-scene__portrait"><div className="character-scene__gesture" ref={gestureRef}><div className="character-scene__breathing">
      {CHARACTER_FRAMES.filter(name => name !== 'blink').map(name => <img key={name} className="character-scene__sprite" src={characterArt(name)} data-active={name === frame} alt="" draggable={false} decoding="async" />)}
    </div></div></div>
    <div className="character-scene__light" />
  </div>;
}
