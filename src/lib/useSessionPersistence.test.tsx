// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReducer, useState } from 'react';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { gameSketches } from '../data/gameSketches';
import { encodeSession, readSession, writeSession } from './sessionStorage';
import { useSessionPersistence } from './useSessionPersistence';
vi.mock('./sessionStorage', async original => ({ ...await original<typeof import('./sessionStorage')>(), readSession: vi.fn(), writeSession: vi.fn() }));
const read = vi.mocked(readSession), write = vi.mocked(writeSession);
function useFixture(offline = false) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState('night', 'en'));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const persistence = useSessionPersistence(state, drafts, dispatch, setDrafts, offline);
  return { state, dispatch, drafts, ...persistence };
}
function saved(kind: 'api' | 'ml' = 'ml') {
  const state = gameReducer(createInitialState('night', 'en'), { type: 'START', mode: 'night', sessionKind: kind, sketches: gameSketches('en') });
  return encodeSession(state, {});
}
beforeEach(() => { vi.clearAllMocks(); read.mockResolvedValue(undefined); write.mockResolvedValue(); });
afterEach(() => { vi.useRealTimers(); });
describe('local persistence coordination', () => {
  it('waits for an explicit resume and does not run the old animation', async () => {
    read.mockResolvedValue(saved());
    const { result, unmount } = renderHook(() => useFixture());
    await waitFor(() => expect(result.current.pending).toBeTruthy());
    expect(result.current.state.phase).toBe('title');
    expect(write).not.toHaveBeenCalled();
    act(() => result.current.resume());
    expect(result.current.state.phase).toBe('girl_holding');
    expect(result.current.state.mode).toBe('night');
    unmount();
  });
  it('a delayed database read cannot replace a deliberately started new game', async () => {
    let resolve!: (value: unknown) => void;
    read.mockReturnValue(new Promise(r => { resolve = r; }));
    const { result, unmount } = renderHook(() => useFixture());
    act(() => {
      result.current.discard();
      result.current.dispatch({ type: 'START', mode: 'day', sessionKind: 'ml', sketches: gameSketches('en') });
    });
    await act(async () => { resolve(saved()); });
    expect(result.current.pending).toBeNull();
    expect(result.current.state.phase).toBe('girl_breath');
    expect(result.current.state.mode).toBe('day');
    unmount();
  });
  it('keeps an incompatible API save from resuming in the offline edition', async () => {
    read.mockResolvedValue(saved('api'));
    const { result } = renderHook(() => useFixture(true));
    await waitFor(() => expect(result.current.status).toBe('incompatible'));
    expect(result.current.pending).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });
  it('reports quota/save failure while keeping the playable state intact', async () => {
    const { result, unmount } = renderHook(() => useFixture());
    await waitFor(() => expect(result.current.pending).toBeNull());
    write.mockRejectedValue(new DOMException('Quota exceeded', 'QuotaExceededError'));
    act(() => {
      result.current.discard();
      result.current.dispatch({ type: 'START', mode: 'day', sessionKind: 'ml', sketches: gameSketches('en') });
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.state.entries).toHaveLength(1);
    expect(result.current.state.phase).toBe('girl_breath');
    unmount();
  });
});
