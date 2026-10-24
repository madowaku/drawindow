import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GamePhase, Mode, Stroke, StrokePoint, WindowCanvasProps } from '../core/types';
import { sameStrokes } from '../core/drawingHistory';
import { advanceFogTimeline, createFogTimeline, fogTimelineProgress, getBreathOrigin, isTimedCanvasPhase, pauseFogTimeline, resumeFogTimeline, type FogTimeline } from '../lib/fog';
import { getPlaybackDuration, getPlaybackTip, strokesAtProgress } from '../lib/playback';
import { drawStrokes, normalizePointerPoint, normalizeStrokes } from '../lib/strokes';
import { characterDrawingProgress, DRAWING_HESITATION } from '../lib/character';
import { drawWetEdges, wipeCondensation } from '../lib/glass';
import { CharacterScene } from './CharacterScene';
import { StrokeTipOverlay } from './StrokeTipOverlay';
import './WindowCanvas.css';

interface CanvasLayout {
  width: number;
  height: number;
  size: number;
  left: number;
  top: number;
  dpr: number;
}

interface ActiveStroke {
  id: string;
  points: StrokePoint[];
}

const makeId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `window-stroke-${Date.now().toString(36)}-${counter.toString(36)}`;
  };
})();

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function requestFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(() => callback(nowMs()), 16) as unknown as number;
}

function cancelFrame(handle: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
  else clearTimeout(handle);
}

function maxTimestamp(strokes: readonly Stroke[]): number {
  let maximum = 0;
  for (const stroke of strokes) for (const point of stroke.points) maximum = Math.max(maximum, point.t);
  return maximum;
}

function eased(progress: number): number {
  const amount = Math.min(1, Math.max(0, progress));
  return 1 - (1 - amount) ** 3;
}

export function drawFrost(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: Mode,
  phase: GamePhase,
  progress: number,
  tactile = false,
): void {
  ctx.clearRect(0, 0, width, height);
  if (phase === 'title') return;

  const breathProgress = phase === 'girl_breath' ? eased(progress) : 1;
  const base = mode === 'day'
    ? { red: 220, green: 237, blue: 239, alpha: tactile ? 0.59 : 0.42 }
    : { red: 156, green: 181, blue: 211, alpha: tactile ? 0.57 : 0.49 };
  const baseAlpha = phase === 'girl_breath' ? base.alpha * (0.18 + breathProgress * 0.82) : base.alpha;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(${base.red}, ${base.green}, ${base.blue}, ${baseAlpha})`;
  ctx.fillRect(0, 0, width, height);

  // Soft, uneven condensation keeps the glass from reading as a flat overlay.
  const mistCenters = [
    [0.17, 0.2, 0.42], [0.81, 0.27, 0.38], [0.32, 0.73, 0.36], [0.75, 0.81, 0.32],
  ] as const;
  for (const [cx, cy, radius] of mistCenters) {
    const x = width * cx;
    const y = height * cy;
    const r = Math.max(width, height) * radius;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const haze = mode === 'day' ? 0.12 : 0.16;
    gradient.addColorStop(0, `rgba(250, 253, 248, ${haze})`);
    gradient.addColorStop(1, 'rgba(250, 253, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (phase === 'girl_breath') {
    const { x: centerX, y: centerY } = getBreathOrigin(width, height);
    const radius = Math.max(width, height) * (0.09 + breathProgress * 0.46);
    const cloud = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    const cloudAlpha = mode === 'day' ? 0.2 + breathProgress * 0.22 : 0.1 + breathProgress * 0.1;
    cloud.addColorStop(0, `rgba(255, 255, 249, ${cloudAlpha})`);
    cloud.addColorStop(0.55, `rgba(247, 251, 248, ${cloudAlpha * 0.5})`);
    cloud.addColorStop(1, 'rgba(247, 251, 248, 0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, width, height);
  }

  // A quiet inner glass edge remains readable in both themes.
  ctx.strokeStyle = mode === 'day' ? 'rgba(255, 255, 247, 0.54)' : 'rgba(229, 238, 249, 0.36)';
  ctx.lineWidth = 1.25;
  ctx.strokeRect(4, 4, Math.max(0, width - 8), Math.max(0, height - 8));
  ctx.restore();
}

function configureCanvas(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): CanvasRenderingContext2D | null {
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return context;
}

export function WindowCanvas({
  language = 'en',
  expression,
  mode,
  phase,
  round = 1,
  strokes,
  previousStrokes,
  onStrokesChange,
  onBreathDone,
  onPlaybackDone,
  reducedMotion,
  variant = 'glass',
  glassStyle = 'tactile',
  onInputTypeChange,
  studyPlayback,
  studyCalm,
}: WindowCanvasProps & { studyPlayback?: { progress: number; paused: boolean }; studyCalm?: boolean }) {
  // DEV replay owns a single clock for both panes. The product always owns its
  // original timeline and completion callbacks; a seek must never dispatch them.
  const externalPlayback = import.meta.env.DEV ? studyPlayback : undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<readonly Stroke[]>(strokes);
  const lastPublishedRef = useRef<readonly Stroke[]>(strokes);
  const onStrokesChangeRef = useRef(onStrokesChange);
  const onBreathDoneRef = useRef(onBreathDone);
  const onPlaybackDoneRef = useRef(onPlaybackDone);
  const layoutRef = useRef<CanvasLayout>({ width: 0, height: 0, size: 0, left: 0, top: 0, dpr: 1 });
  const frameRef = useRef<number | null>(null);
  const timelineRef = useRef<FogTimeline | null>(null);
  const completedTransitionRef = useRef<string | null>(null);
  const visibleRef = useRef(true);
  const scheduleFrameRef = useRef<() => void>(() => undefined);
  const tickFrameRef = useRef<FrameRequestCallback>(() => undefined);
  const activePointerRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const keyboardStrokeRef = useRef<ActiveStroke | null>(null);
  const keyboardCursorRef = useRef({ x: 0.5, y: 0.5 });
  const drawingStartedAtRef = useRef(0);
  const timestampOffsetRef = useRef(0);
  const [layout, setLayout] = useState<CanvasLayout>(layoutRef.current);
  const [localProgress, setAnimationProgress] = useState(1);
  const animationProgress = externalPlayback
    ? reducedMotion ? 1 : Math.min(1, Math.max(0, externalPlayback.progress))
    : localProgress;
  const [canvasVisible, setCanvasVisible] = useState(true);
  const [pointerTip, setPointerTip] = useState<StrokePoint | null>(null);
  const [keyboardPen, setKeyboardPen] = useState<{ x: number; y: number; drawing: boolean } | null>(null);

  onStrokesChangeRef.current = onStrokesChange;
  onBreathDoneRef.current = onBreathDone;
  onPlaybackDoneRef.current = onPlaybackDone;

  const playbackDuration = phase === 'girl_drawing' ? getPlaybackDuration(strokes) : 900;

  const publishStrokes = (next: readonly Stroke[]) => {
    const normalized = normalizeStrokes(next);
    lastPublishedRef.current = normalized;
    strokesRef.current = normalized;
    onStrokesChangeRef.current(normalized);
  };

  const elapsedDrawingTime = () => timestampOffsetRef.current + Math.max(0, nowMs() - drawingStartedAtRef.current);

  const pointFromPointer = (event: PointerEvent, canvas: HTMLCanvasElement): StrokePoint => {
    const rect = canvas.getBoundingClientRect();
    return normalizePointerPoint(event.clientX, event.clientY, rect, elapsedDrawingTime(), event.pressure);
  };

  const appendPointerSamples = (event: ReactPointerEvent<HTMLCanvasElement>, active: ActiveStroke): boolean => {
    const native = event.nativeEvent;
    let samples: readonly PointerEvent[] = [native];
    if (typeof native.getCoalescedEvents === 'function') {
      const coalesced = native.getCoalescedEvents();
      if (coalesced.length > 0) samples = [...coalesced, native];
    }
    let changed = false;
    for (const sample of samples) {
      const point = pointFromPointer(sample, event.currentTarget);
      const previous = active.points[active.points.length - 1];
      if (previous && point.x === previous.x && point.y === previous.y) continue;
      active.points.push(point);
      changed = true;
    }
    return changed;
  };

  const finishPointerStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId || !activeStrokeRef.current) return;
    appendPointerSamples(event, activeStrokeRef.current);
    const finished = activeStrokeRef.current;
    activePointerRef.current = null;
    activeStrokeRef.current = null;
    setPointerTip(null);
    publishStrokes([...strokesRef.current.filter(stroke => stroke.id !== finished.id), { id: finished.id, points: finished.points }]);
    const target = event.currentTarget;
    if (typeof target.hasPointerCapture === 'function' && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (externalPlayback || phase !== 'player_drawing' || event.button !== 0 || event.isPrimary === false || activePointerRef.current !== null) return;
    event.preventDefault();
    if (keyboardStrokeRef.current) keyboardStrokeRef.current = null;
    setKeyboardPen(null);
    activePointerRef.current = event.pointerId;
    if (['mouse', 'touch', 'pen'].includes(event.pointerType)) onInputTypeChange?.(event.pointerType as 'mouse' | 'touch' | 'pen');
    const active: ActiveStroke = { id: makeId(), points: [pointFromPointer(event.nativeEvent, event.currentTarget)] };
    activeStrokeRef.current = active;
    setPointerTip(active.points[0]);
    publishStrokes([...strokesRef.current, { id: active.id, points: active.points }]);
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Detached test/browser surfaces may reject capture. */ }
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    if (phase !== 'player_drawing' || event.pointerId !== activePointerRef.current || !active) return;
    event.preventDefault();
    if (appendPointerSamples(event, active)) {
      setPointerTip(active.points.at(-1) ?? null);
      publishStrokes([...strokesRef.current.filter(stroke => stroke.id !== active.id), { id: active.id, points: active.points }]);
    }
  };

  const beginKeyboardStroke = () => {
    if (keyboardStrokeRef.current) return;
    onInputTypeChange?.('keyboard');
    const cursor = keyboardCursorRef.current;
    keyboardStrokeRef.current = {
      id: makeId(),
      points: [{ x: cursor.x, y: cursor.y, t: elapsedDrawingTime() }],
    };
    setKeyboardPen({ ...cursor, drawing: true });
  };

  const appendKeyboardPoint = () => {
    const active = keyboardStrokeRef.current;
    if (!active) return;
    const cursor = keyboardCursorRef.current;
    const last = active.points[active.points.length - 1];
    if (last.x === cursor.x && last.y === cursor.y) return;
    active.points.push({ x: cursor.x, y: cursor.y, t: elapsedDrawingTime() });
    publishStrokes([...strokesRef.current.filter(stroke => stroke.id !== active.id), { id: active.id, points: active.points }]);
  };

  const finishKeyboardStroke = () => {
    const active = keyboardStrokeRef.current;
    if (!active) return;
    keyboardStrokeRef.current = null;
    setKeyboardPen(pen => pen ? { ...pen, drawing: false } : null);
    publishStrokes([...strokesRef.current.filter(stroke => stroke.id !== active.id), { id: active.id, points: active.points }]);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (externalPlayback || phase !== 'player_drawing') return;
    const step = event.shiftKey ? 0.05 : 0.025;
    const cursor = keyboardCursorRef.current;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      cursor.x = Math.min(0.98, Math.max(0.02, cursor.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)));
      cursor.y = Math.min(0.98, Math.max(0.02, cursor.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)));
      setKeyboardPen({ ...cursor, drawing: Boolean(keyboardStrokeRef.current) });
      appendKeyboardPoint();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (!event.repeat) beginKeyboardStroke();
      return;
    }
    if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault();
      onInputTypeChange?.('keyboard');
      const point = { ...cursor, t: elapsedDrawingTime() };
      setKeyboardPen({ ...cursor, drawing: false });
      publishStrokes([...strokesRef.current, { id: makeId(), points: [point] }]);
    }
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      finishKeyboardStroke();
    }
  };

  const handleBlur = () => { finishKeyboardStroke(); setKeyboardPen(null); };

  useLayoutEffect(() => {
    strokesRef.current = strokes;
    // A reducer echo has copied objects but identical data. An edit replacement
    // invalidates local gestures before their next pointer/key event can publish.
    if (sameStrokes(strokes, lastPublishedRef.current)) return;
    lastPublishedRef.current = strokes;
    const pointerId = activePointerRef.current;
    activePointerRef.current = null;
    activeStrokeRef.current = null;
    keyboardStrokeRef.current = null;
    setPointerTip(null);
    setKeyboardPen(pen => pen ? { ...pen, drawing: false } : null);
    const canvas = drawingCanvasRef.current;
    if (pointerId !== null && canvas && typeof canvas.hasPointerCapture === 'function' && canvas.hasPointerCapture(pointerId)) {
      try { canvas.releasePointerCapture(pointerId); } catch { /* Capture may already have ended. */ }
    }
  }, [strokes]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      const height = Math.max(0, rect.height);
      const size = Math.min(width, height);
      const dpr = typeof window === 'undefined' ? 1 : Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      const next = {
        width,
        height,
        size,
        left: (width - size) / 2,
        top: height - size,
        dpr,
      };
      layoutRef.current = next;
      setLayout(next);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(root);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (phase !== 'player_drawing') {
      const canvas = drawingCanvasRef.current;
      if (activePointerRef.current !== null && canvas && typeof canvas.hasPointerCapture === 'function' && canvas.hasPointerCapture(activePointerRef.current)) {
        try { canvas.releasePointerCapture(activePointerRef.current); } catch { /* The pointer may already have been released by the browser. */ }
      }
      activePointerRef.current = null;
      activeStrokeRef.current = null;
      keyboardStrokeRef.current = null;
      setPointerTip(null);
      setKeyboardPen(null);
      return;
    }
    drawingStartedAtRef.current = nowMs();
    timestampOffsetRef.current = maxTimestamp(strokesRef.current);
    keyboardCursorRef.current = { x: 0.5, y: 0.5 };
  }, [phase]);

  scheduleFrameRef.current = () => {
    const timeline = timelineRef.current;
    if (frameRef.current !== null || !visibleRef.current || !timeline || timeline.completed || !isTimedCanvasPhase(timeline.phase)) return;
    frameRef.current = requestFrame(tickFrameRef.current);
  };
  tickFrameRef.current = now => {
    frameRef.current = null;
    const timeline = timelineRef.current;
    if (!timeline || !visibleRef.current) return;
    const result = advanceFogTimeline(timeline, now);
    timelineRef.current = result.timeline;
    setAnimationProgress(result.progress);
    if (result.completedNow) {
      const transition = `${mode}:${timeline.phase}:${round}`;
      if (completedTransitionRef.current === transition) return;
      completedTransitionRef.current = transition;
      if (timeline.phase === 'girl_breath') onBreathDoneRef.current();
      if (timeline.phase === 'girl_drawing') onPlaybackDoneRef.current();
      return;
    }
    scheduleFrameRef.current();
  };

  useLayoutEffect(() => {
    if (externalPlayback) return;
    const now = nowMs();
    let timeline = createFogTimeline(mode, phase, now, { reducedMotion, playbackDurationMs: playbackDuration });
    if (completedTransitionRef.current === `${mode}:${phase}:${round}`) {
      timeline = { ...timeline, elapsedMs: timeline.durationMs, startedAt: null, completed: true };
    }
    if (!visibleRef.current) timeline = pauseFogTimeline(timeline, now);
    timelineRef.current = timeline;
    setAnimationProgress(fogTimelineProgress(timeline, now));
    if (phase === 'girl_breath' || phase === 'girl_drawing') scheduleFrameRef.current();
    return () => {
      if (frameRef.current !== null) cancelFrame(frameRef.current);
      frameRef.current = null;
      if (timelineRef.current?.phase === phase) timelineRef.current = null;
    };
  }, [mode, phase, round, reducedMotion, playbackDuration, Boolean(externalPlayback)]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let onScreen = true;
    const updateVisibility = () => {
      const visible = onScreen && !document.hidden;
      if (visible === visibleRef.current) return;
      visibleRef.current = visible;
      setCanvasVisible(visible);
      const now = nowMs();
      if (!visible) {
        if (timelineRef.current) timelineRef.current = pauseFogTimeline(timelineRef.current, now);
        if (frameRef.current !== null) cancelFrame(frameRef.current);
        frameRef.current = null;
      } else {
        if (timelineRef.current) timelineRef.current = resumeFogTimeline(timelineRef.current, now);
        scheduleFrameRef.current();
      }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting && entry.intersectionRatio > 0;
      updateVisibility();
    });
    observer?.observe(root);
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);

  useLayoutEffect(() => {
    if (layout.size <= 0) return;
    const fogCanvas = fogCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!fogCanvas || !drawingCanvas) return;
    const fogContext = configureCanvas(fogCanvas, layout.width, layout.height, layout.dpr);
    const drawingContext = configureCanvas(drawingCanvas, layout.size, layout.size, layout.dpr);
    if (!fogContext || !drawingContext) return;

    const tactile = variant === 'glass' && glassStyle === 'tactile';
    drawFrost(fogContext, layout.width, layout.height, mode, phase, animationProgress, tactile);
    const visibleStrokes = phase === 'girl_drawing'
      ? animationProgress < DRAWING_HESITATION ? [] : strokesAtProgress(strokes, characterDrawingProgress(animationProgress))
      : strokes;
    if (phase !== 'girl_breath' && visibleStrokes.length > 0) {
      fogContext.save();
      fogContext.translate(layout.left, layout.top);
      if (tactile) wipeCondensation(fogContext, visibleStrokes, layout.size);
      else {
        fogContext.globalCompositeOperation = 'destination-out';
        drawStrokes(fogContext, visibleStrokes, layout.size, layout.size, { color: '#000000', widthScale: 1.8 });
      }
      fogContext.restore();
    }

    drawingContext.clearRect(0, 0, layout.size, layout.size);
    if (phase === 'girl_breath' && previousStrokes?.length) {
      drawingContext.save();
      drawingContext.globalAlpha = 1 - eased(animationProgress);
      drawStrokes(drawingContext, previousStrokes, layout.size, layout.size, { color: '#152a32', widthScale: .96 });
      drawingContext.restore();
    }
    if (phase !== 'girl_breath' && phase !== 'title' && visibleStrokes.length > 0) {
      if (tactile) drawWetEdges(drawingContext, visibleStrokes, layout.size, mode);
      else drawStrokes(drawingContext, visibleStrokes, layout.size, layout.size, {
        color: variant === 'neutral' ? '#111111' : mode === 'day' ? '#152a32' : '#142332',
        edgeColor: variant === 'neutral' ? undefined : mode === 'day' ? 'rgba(250, 252, 245, 0.88)' : 'rgba(231, 240, 252, 0.94)',
        widthScale: variant === 'neutral' ? 1.1 : 0.96,
        edgeWidthScale: 0.002,
      });
    }
  }, [layout, mode, phase, strokes, previousStrokes, animationProgress, variant, glassStyle]);

  const drawingStyle = layout.size > 0 ? {
    width: `${layout.size}px`,
    height: `${layout.size}px`,
    left: `${layout.left}px`,
    bottom: '0px',
  } : undefined;
  // The cursor and the ink use the identical eased playback position and square.
  // Keep this local to the canvas so animation never drives the App reducer.
  const playbackTip = phase === 'girl_drawing' && animationProgress >= DRAWING_HESITATION
    ? getPlaybackTip(strokes, characterDrawingProgress(animationProgress))
    : null;

  const activeTip = phase === 'player_drawing' ? pointerTip : null;

  return (
    <div className="window-canvas" ref={rootRef} data-testid="window-canvas" data-mode={mode} data-variant={variant} data-glass-style={glassStyle} data-running={canvasVisible && !reducedMotion}>
      {variant === 'glass' && <CharacterScene studyCalm={import.meta.env.DEV && studyCalm} studyPaused={externalPlayback?.paused} frameOverride={phase === 'girl_breath' && previousStrokes?.length ? 'breath' : import.meta.env.DEV && phase === 'girl_breath' ? expression : undefined} mode={mode} phase={phase} round={round} progress={animationProgress} reducedMotion={reducedMotion} hasPlayerMarks={phase === 'player_drawing' && strokes.some(stroke => stroke.points.length > 0)} />}
      <svg className="window-canvas__spiral" viewBox="0 0 40 40" aria-hidden="true"><path d="M 29 27 C 7 38 1 7 22 8 C 39 8 39 29 24 29 C 12 29 12 15 23 16 C 30 17 29 23 24 23" /></svg>
      <canvas className="window-canvas__fog" ref={fogCanvasRef} aria-hidden="true" />
      <canvas
        className={`window-canvas__drawing${phase === 'player_drawing' ? ' is-interactive' : ''}`}
        data-testid="window-drawing-canvas"
        data-has-strokes={strokes.length > 0}
        ref={drawingCanvasRef}
        style={drawingStyle}
        aria-label={externalPlayback ? language === 'ja' ? '記録した絵の再生' : 'Recorded drawing playback' : language === 'ja' ? '絵を描くところ。矢印キーで移動。スペースキーを押しながら描くか、Enterキーで点を置けます。' : 'Drawing area. Use arrow keys to move. Hold Space to draw, or press Enter to place a dot.'}
        role={externalPlayback ? 'img' : 'application'}
        tabIndex={!externalPlayback && phase === 'player_drawing' ? 0 : -1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerStroke}
        onPointerCancel={finishPointerStroke}
        onLostPointerCapture={event => {
          if (activePointerRef.current === event.pointerId) {
            activePointerRef.current = null;
            activeStrokeRef.current = null;
            setPointerTip(null);
          }
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={() => phase === 'player_drawing' && setKeyboardPen({ ...keyboardCursorRef.current, drawing: Boolean(keyboardStrokeRef.current) })}
        onBlur={handleBlur}
      />
      <StrokeTipOverlay tip={playbackTip} layout={layout} reducedMotion={reducedMotion} visible={canvasVisible && phase === 'girl_drawing'} />
      {variant === 'glass' && glassStyle === 'tactile' && activeTip && <span className="window-canvas__finger" aria-hidden="true" style={{ left: layout.left + activeTip.x * layout.size, top: layout.top + activeTip.y * layout.size }} />}
      {phase === 'player_drawing' && keyboardPen && <span className="window-canvas__keyboard-pen" data-testid="keyboard-cursor" data-drawing={keyboardPen.drawing} aria-hidden="true" style={{ left: layout.left + keyboardPen.x * layout.size, top: layout.top + keyboardPen.y * layout.size }} />}

    </div>
  );
}
