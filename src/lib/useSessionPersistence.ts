import { useEffect, useRef, useState } from 'react';
import type { GameEvent, GameState } from '../core/types';
import { decodeSession, encodeSession, readSession, writeSession, type SessionSnapshot } from './sessionStorage';
import type { RestoredSession } from './sessionStorage';

export interface SessionStore { read: () => Promise<unknown>; write: (snapshot: SessionSnapshot | null) => Promise<void>; }
const defaultStore: SessionStore = { read: readSession, write: writeSession };

/** At most two structured clones per second; never serialize the catalogue on pointer moves. */
export function useSessionPersistence(state: GameState, drafts: Record<string, string>, dispatch: (event: GameEvent) => void, setDrafts: (drafts: Record<string, string>) => void, offlineEdition = false, store: SessionStore = defaultStore) {
  const [pending, setPending] = useState<RestoredSession | null | undefined>(undefined);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error' | 'invalid' | 'incompatible' | null>(null);
  const latest = useRef({ state, drafts, pending });
  latest.current = { state, drafts, pending };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(false);
  const writeSequence = useRef(0);
  const loadingCanceled = useRef(false);
  const save = () => {
    const current = latest.current;
    if (current.pending !== null) return;
    const sequence = ++writeSequence.current;
    setStatus('saving');
    void store.write(current.state.phase === 'title' ? null : encodeSession(current.state, current.drafts))
      .then(() => { if (alive.current && sequence === writeSequence.current) setStatus(current.state.phase === 'title' ? null : 'saved'); })
      .catch(() => { if (alive.current && sequence === writeSequence.current) setStatus('error'); });
  };
  useEffect(() => {
    alive.current = true;
    let current = true;
    void store.read().then(raw => {
      if (!current || loadingCanceled.current) return;
      const restored = decodeSession(raw);
      if (offlineEdition && restored?.state.sessionKind === 'api') {
        setPending(null); setStatus('incompatible'); return;
      }
      setPending(restored);
      if (raw && !restored) setStatus('invalid');
    }).catch(() => { if (current && !loadingCanceled.current) { setPending(null); setStatus('error'); } });
    const flush = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; save(); } };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => { current = false; flush(); alive.current = false; window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useEffect(() => {
    if (pending !== null || (state.phase === 'title' && state.sessionId === 0) || timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; save(); }, 500);
  }, [state, drafts, pending]);
  const discard = () => { loadingCanceled.current = true; setPending(null); void store.write(null).catch(() => { if (alive.current) setStatus('error'); }); };
  const resume = () => {
    if (!pending) return;
    setDrafts(pending.intentDrafts);
    dispatch({ type: 'RESTORE_SESSION', state: pending.state });
    setPending(null);
  };
  return { pending, status, resume, discard };
}
