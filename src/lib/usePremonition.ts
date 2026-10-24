import { useEffect, useRef, useState } from 'react';
import type { GameState, GirlExpression } from '../core/types';
import { detectPremonitionTransition, type PremonitionEvent } from './premonition';

export interface PremonitionPresentation {
  expression?: GirlExpression;
  events: readonly PremonitionEvent[];
  active?: PremonitionEvent;
}

/** Cosmetic observer only: no recognizer, dispatch, persistence or reducer clock. */
export function usePremonition(state: GameState | null, enabled: boolean, reducedMotion: boolean, observe = false): PremonitionPresentation {
  const previous = useRef<GameState | null>(null);
  const consumed = useRef(new Set<string>());
  const displayed = useRef(new Map<number, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [events, setEvents] = useState<readonly PremonitionEvent[]>([]);
  const [active, setActive] = useState<PremonitionEvent>();
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const clear = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    setActive(undefined);
  };

  useEffect(() => {
    const changed = () => {
      const shown = document.visibilityState !== 'hidden';
      if (!shown) clear();
      setVisible(shown);
    };
    document.addEventListener('visibilitychange', changed);
    return () => {
      document.removeEventListener('visibilitychange', changed);
      if (timer.current !== undefined) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    const inBreath = state?.phase === 'girl_breath';
    if (!inBreath || !enabled || reducedMotion || !visible || before?.sessionId !== state?.sessionId) clear();
    const event = detectPremonitionTransition(before, state);
    if (!event || consumed.current.has(event.id)) return;
    // Consume before checking settings: toggling D or returning to a tab cannot replay.
    consumed.current.add(event.id);
    const count = displayed.current.get(event.sessionId) ?? 0;
    const suppressionReason = event.suppressionReason ?? (!enabled ? 'disabled' :
      !visible || document.visibilityState === 'hidden' ? 'hidden' : reducedMotion ? 'reduced_motion' : count >= 2 ? 'frequency' : undefined);
    const observed: PremonitionEvent = { ...event, ...(suppressionReason ? { suppressionReason } : {}) };
    if(observe)setEvents(items => [...items, observed]);
    if (!observed.candidate.expression || suppressionReason) return;
    clear();
    displayed.current.set(event.sessionId, count + 1);
    setActive(observed);
    timer.current = setTimeout(() => { timer.current = undefined; setActive(undefined); }, observed.candidate.durationMs);
  }, [state, enabled, reducedMotion, visible, observe]);

  // Render-time guard also covers a phase/setting change before its effect runs.
  const showing = active && enabled && !reducedMotion && visible && state?.phase === 'girl_breath' && state.sessionId === active.sessionId ? active : undefined;
  return { events, ...(showing ? { active: showing, expression: showing.candidate.expression } : {}) };
}
