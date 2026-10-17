import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import type { GamePhase, Mode } from '../core/types';
import { SHIZUKU_POSES, characterArt, type ShizukuPose } from '../data/shizukuPoses';
import { CHARACTER_FRAMES, getShizukuReaction, type CharacterFrame } from '../lib/character';
import './CharacterScene.css';

export { characterArt } from '../data/shizukuPoses';

interface Props {
  mode: Mode;
  phase: GamePhase;
  progress?: number;
  reducedMotion: boolean;
  frameOverride?: CharacterFrame;
  round?: number;
}

function recoverPoseImage(event: SyntheticEvent<HTMLImageElement>, fallbackId: ShizukuPose['fallback']): void {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true' || fallbackId === 'hide') {
    image.hidden = true;
    return;
  }

  const fallback = SHIZUKU_POSES[fallbackId];
  image.dataset.fallbackApplied = 'true';
  image.style.setProperty('--pose-eye-x', `${fallback.anchor.x * 100}%`);
  image.style.setProperty('--pose-eye-y', `${fallback.anchor.y * 100}%`);
  image.src = fallback.src;
}

function hideFailedRoom(event: SyntheticEvent<HTMLImageElement>): void {
  // The room is decorative; hiding a failed image avoids a browser broken-image icon.
  event.currentTarget.hidden = true;
}

/** Pose sprites + browser-native phase gestures. Glass and ink live outside this component. */
export function CharacterScene({ mode, phase, progress = 1, reducedMotion, frameOverride, round = 1 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const reaction = getShizukuReaction({ phase, mode, round, reducedMotion, progress });
  const frame = frameOverride ?? reaction.pose;

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
    if (reducedMotion || !target?.animate || !running || reaction.durationMs <= 0) return;
    // One finite gesture per phase. Its timing is presentation-only and never advances the game.
    const tilt = reaction.motion === 'watch' ? '-0.25' : '0';
    const scale = reaction.motion === 'breath' && mode === 'day' ? '1.018' : '1';
    const animation = target.animate([
      { transform: 'translateY(0px) rotate(0deg) scale(1)' },
      { transform: `translateY(-${reaction.leanPx}px) rotate(${tilt}deg) scale(${scale})` },
    ], { duration: reaction.durationMs, easing: 'ease-out', fill: 'both' });
    return () => animation.cancel();
  }, [mode, phase, reducedMotion, running, reaction.durationMs, reaction.leanPx, reaction.motion]);

  const poseStyles = (pose: ShizukuPose): CSSProperties => ({
    '--pose-eye-x': `${pose.anchor.x * 100}%`,
    '--pose-eye-y': `${pose.anchor.y * 100}%`,
  } as CSSProperties);

  return <div
    className="character-scene"
    ref={rootRef}
    aria-hidden="true"
    data-mode={mode}
    data-pose={frame}
    data-motion={reaction.motion}
    data-running={running && !reducedMotion}
    data-reduced-motion={reducedMotion}
    data-blink-enabled={phase === 'title' && !reducedMotion}
    data-testid="character-scene"
  >
    <img className="character-scene__room" src={characterArt(`room-${mode}`)} alt="" draggable={false} onError={hideFailedRoom} />
    <div className="character-scene__portrait">
      <div className="character-scene__gesture" ref={gestureRef}>
        <div className="character-scene__breathing">
          {CHARACTER_FRAMES.filter(name => name !== 'blink').map(name => {
            const pose = SHIZUKU_POSES[name];
            return <img
              key={name}
              className="character-scene__sprite"
              src={pose.src}
              style={poseStyles(pose)}
              data-active={name === frame}
              alt=""
              draggable={false}
              decoding="async"
              onError={event => recoverPoseImage(event, pose.fallback)}
            />;
          })}
          <img
            className="character-scene__blink"
            src={characterArt('blink')}
            style={poseStyles(SHIZUKU_POSES.neutral)}
            alt=""
            draggable={false}
            decoding="async"
            onError={event => recoverPoseImage(event, 'neutral')}
          />
        </div>
      </div>
    </div>
    <div className="character-scene__light" />
  </div>;
}
