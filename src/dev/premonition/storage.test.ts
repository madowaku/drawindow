import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '../../lib/sessionStorage';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

/** Exercise the IndexedDB protocol without adding a database implementation dependency. */
function indexedDbFixture(failFirst = false) {
  let saved: unknown;
  let attempts = 0;
  const createObjectStore = vi.fn();
  const put = vi.fn((snapshot: unknown, key: string) => { expect(key).toBe('current'); saved = structuredClone(snapshot); });
  const remove = vi.fn((key: string) => { expect(key).toBe('current'); saved = undefined; });
  const close = vi.fn();
  const db = {
    createObjectStore, close, onversionchange: undefined as undefined | (() => void),
    transaction: vi.fn((name: string, mode: string) => {
      expect(name).toBe('sessions');
      const transaction = {
        oncomplete: undefined as undefined | (() => void),
        onabort: undefined as undefined | (() => void),
        onerror: undefined as undefined | (() => void),
        objectStore: (store: string) => {
          expect(store).toBe('sessions');
          return { put, delete: remove, get: (key: string) => {
            expect(key).toBe('current');
            const read = { result: saved, onsuccess: undefined as undefined | (() => void), onerror: undefined };
            queueMicrotask(() => read.onsuccess?.());
            return read;
          } };
        },
      };
      if (mode === 'readwrite') queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    }),
  };
  const open = vi.fn(() => {
    const request = { result: db, error: new Error('unavailable'), onerror: undefined as undefined | (() => void), onblocked: undefined, onsuccess: undefined as undefined | (() => void), onupgradeneeded: undefined as undefined | (() => void) };
    attempts++;
    const fail = failFirst && attempts === 1;
    queueMicrotask(() => { if (fail) request.onerror?.(); else { request.onupgradeneeded?.(); request.onsuccess?.(); } });
    return request;
  });
  vi.stubGlobal('indexedDB', { open });
  return { db, open, put, remove, createObjectStore };
}

describe('isolated local study persistence', () => {
  it('reads, writes and discards only the independent study game snapshot', async () => {
    const fixture = indexedDbFixture();
    const { studySessionStore, STUDY_DATABASE_NAME } = await import('./storage');
    expect(await studySessionStore.read()).toBeUndefined();
    expect(STUDY_DATABASE_NAME).not.toBe('drawindow-session');
    expect(fixture.open).toHaveBeenCalledWith(STUDY_DATABASE_NAME, 1);
    expect(fixture.createObjectStore).toHaveBeenCalledWith('sessions');
    const snapshot = { version: 1, intentDrafts: { player: 'local draft' } } as unknown as SessionSnapshot;
    await studySessionStore.write(snapshot);
    expect(await studySessionStore.read()).toEqual(snapshot);
    expect(fixture.put).toHaveBeenCalledTimes(1);
    await studySessionStore.write(null);
    expect(await studySessionStore.read()).toBeUndefined();
    expect(fixture.remove).toHaveBeenCalledTimes(1);
    expect(fixture.open).toHaveBeenCalledTimes(1);
  });
  it('allows retry after an unavailable database and closes stale connections', async () => {
    const fixture = indexedDbFixture(true);
    const { studySessionStore } = await import('./storage');
    await expect(studySessionStore.read()).rejects.toThrow('unavailable');
    expect(await studySessionStore.read()).toBeUndefined();
    expect(fixture.open).toHaveBeenCalledTimes(2);
    fixture.db.onversionchange?.();
    expect(fixture.db.close).toHaveBeenCalledOnce();
    await studySessionStore.read();
    expect(fixture.open).toHaveBeenCalledTimes(3);
  });
});
