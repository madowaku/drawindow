import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import type { GamePhase, Mode } from '../core/types';
import { SHIZUKU_POSES, characterArt, type ShizukuPose } from '../data/shizukuPoses';
import { reviewPose } from '../data/shizukuCandidates';
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
  hasPlayerMarks?: boolean;
  artSet?: 'current' | 'candidate' | 'final';
  studyPaused?: boolean;
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
  image.style.setProperty('--pose-scale', '1');
  image.src = fallback.src;
}

function hideFailedRoom(event: SyntheticEvent<HTMLImageElement>): void {
  // The room is decorative; hiding a failed image avoids a browser broken-image icon.
  event.currentTarget.hidden = true;
}

/** Pose sprites + browser-native phase gestures. Glass and ink live outside this component. */
export function CharacterScene({ mode, phase, progress = 1, reducedMotion, frameOverride, round = 1, hasPlayerMarks = false, artSet = 'current', studyPaused = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [running, setRunning] = useState(true);
  const runningRef = useRef(running);
  const paused = import.meta.env.DEV && studyPaused;
  runningRef.current = running && !paused;
  const reaction = getShizukuReaction({ phase, mode, round, reducedMotion, progress, hasPlayerMarks });
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
    if (reducedMotion || !target?.animate || reaction.durationMs <= 0) return;
    // A finite beat on pose/phase entry, not on every stroke sample or UI render.
    const tilt = reaction.motion === 'watch' ? '-0.25' : '0';
    const scale = reaction.motion === 'watch' ? (mode === 'day' ? '1.006' : '1.003') : reaction.motion === 'breath' && mode === 'day' ? '1.018' : '1';
    const frames = reaction.motion === 'fluster' ? [
      { transform: 'translateX(0px) rotate(0deg)' },
      { transform: 'translateX(-2px) rotate(-1deg)', offset: .25 },
      { transform: 'translateX(2px) rotate(.7deg)', offset: .55 },
      { transform: 'translateX(0px) rotate(-.4deg)' },
    ] : [
      { transform: 'translateY(0px) rotate(0deg) scale(1)' },
      { transform: `translateY(-${reaction.leanPx}px) rotate(${tilt}deg) scale(${scale})` },
    ];
    const animation = target.animate(frames, { duration: reaction.durationMs, easing: 'ease-out', fill: 'both' });
    animationRef.current = animation;
    if (!runningRef.current) animation.pause();
    return () => { animation.cancel(); animationRef.current = null; };
  }, [mode, phase, reducedMotion, reaction.durationMs, reaction.leanPx, reaction.motion]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) return;
    // Preserve the gesture clock while hidden, instead of replaying on tab return.
    // A finished gesture must also stay finished; play() would restart it.
    if ((!running || paused) && animation.playState !== 'finished') animation.pause();
    else if (running && !paused && animation.playState === 'paused') animation.play();
  }, [running, paused]);

  const poseStyles = (pose: ShizukuPose): CSSProperties => ({
    '--pose-eye-x': `${pose.anchor.x * 100}%`,
    '--pose-eye-y': `${pose.anchor.y * 100}%`,
    '--pose-scale': pose.renderScale ?? 1,
  } as CSSProperties);

  return <div
    className="character-scene"
    ref={rootRef}
    aria-hidden="true"
    data-mode={mode}
    data-pose={frame}
    data-motion={reaction.motion}
    data-running={running && !paused && !reducedMotion}
    data-reduced-motion={reducedMotion}
    data-blink-enabled={phase === 'title' && !reducedMotion && artSet === 'current'}
    data-art-set={artSet}
    data-testid="character-scene"
  >
    <img className="character-scene__room" src={characterArt(`room-${mode}`)} alt="" draggable={false} onError={hideFailedRoom} />
    <div className="character-scene__portrait">
      <div className="character-scene__gesture" ref={gestureRef}>
        <div className="character-scene__breathing">
          {CHARACTER_FRAMES.filter(name => name !== 'blink').map(name => {
            const pose = artSet !== 'current' ? reviewPose(name, artSet === 'final') : SHIZUKU_POSES[name];
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
