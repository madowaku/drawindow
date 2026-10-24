import { useEffect, useState } from 'react';
import type { Language } from '../core/types';

type OfflineState = 'saving' | 'ready' | 'failed' | 'update';

/** Ready is a checked snapshot of this document's edition, never a durability promise. */
export function OfflineStatus({ language }: { language: Language }) {
  const [status, setStatus] = useState<OfflineState>('saving');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus('failed');
      return;
    }
    const edition = document.querySelector<HTMLMetaElement>('meta[name="drawindow-offline-edition"]')?.content;
    if (!edition) { setStatus('failed'); return; }
    let disposed = false;
    let sequence = 0;
    let failedInstall = false;
    let registration: ServiceWorkerRegistration | undefined;
    const workers = new Set<ServiceWorker>();
    const channels = new Set<MessageChannel>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const container = navigator.serviceWorker;
    const requestWorker = (worker: ServiceWorker) => new Promise<{ edition?: string; complete?: boolean } | null>(resolve => {
        const channel = new MessageChannel();
        channels.add(channel);
        const done = (value: { edition?: string; complete?: boolean } | null) => {
          clearTimeout(timer); timers.delete(timer);
          channel.port1.close(); channel.port2.close(); channels.delete(channel);
          resolve(value);
        };
        const timer = setTimeout(() => done(null), 15000);
        timers.add(timer);
        channel.port1.onmessage = event => done(event.data);
        try { worker.postMessage({ type: 'DRAWINDOW_OFFLINE_VERIFY' }, [channel.port2]); }
        catch { done(null); }
      });

    const verify = async () => {
      const current = ++sequence;
      const controller = container.controller;
      if (disposed || failedInstall) return;
      if (!controller && !registration?.waiting) { setStatus('saving'); return; }
      setStatus('saving');
      const result = controller ? await requestWorker(controller) : null;
      const waiting = registration?.waiting;
      const pending = waiting ? await requestWorker(waiting) : null;
      if (disposed || current !== sequence || failedInstall) return;
      if (waiting) setStatus(pending?.complete === true ? 'update' : 'failed');
      else if (result?.edition === edition && result.complete === true) setStatus('ready');
      else setStatus('failed');
    };
    const changed = () => {
      if (disposed) return;
      if ([...workers].some(worker => worker.state === 'redundant')) {
        failedInstall = true; ++sequence; setStatus('failed');
      } else { void verify(); }
    };
    const watch = (worker: ServiceWorker | null) => {
      if (worker && !workers.has(worker)) {
        workers.add(worker); worker.addEventListener('statechange', changed);
      }
    };
    const found = () => { watch(registration?.installing ?? null); };
    const update = () => { void verify(); };
    const visible = () => { if (document.visibilityState === 'visible') void verify(); };
    setStatus('saving');
    container.addEventListener('controllerchange', update);
    window.addEventListener('online', update);
    document.addEventListener('visibilitychange', visible);
    const interval = setInterval(visible, 60000);
    const root = new URL(import.meta.env.BASE_URL || './', document.baseURI);
    void container.register(new URL('sw.js', root).href, { scope: root.pathname, updateViaCache: 'none' }).then(reg => {
      if (disposed) return;
      registration = reg;
      reg.addEventListener('updatefound', found);
      watch(reg.installing); watch(reg.waiting);
      void verify();
    }).catch(() => { if (!disposed) { ++sequence; setStatus('failed'); } });
    return () => {
      disposed = true; ++sequence;
      clearInterval(interval); timers.forEach(clearTimeout);
      channels.forEach(channel => { channel.port1.close(); channel.port2.close(); });
      container.removeEventListener('controllerchange', update);
      window.removeEventListener('online', update);
      document.removeEventListener('visibilitychange', visible);
      registration?.removeEventListener('updatefound', found);
      workers.forEach(worker => worker.removeEventListener('statechange', changed));
    };
  }, [attempt]);
  const ja = language === 'ja';
  return <div className="offline-status" data-status={status}>
    <p className="session-note" role="status">{status === 'ready'
      ? (ja ? 'この版の絵と音楽を保存しました。このブラウザーで通信なしで開けます。ブラウザーが保存を消去した場合は再保存が必要です。' : 'This edition is saved for offline play in this browser. If the browser clears storage, save it again.')
      : status === 'update'
        ? (ja ? '更新版を保存しました。遊び終わったら、このゲームのタブをすべて閉じて開き直してください。' : 'An update is saved. After playing, close all game tabs and reopen to use it.')
        : status === 'saving'
          ? (ja ? '通信なしで遊べるよう、絵と音楽の保存を確認中。この画面を開いたままお待ちください。' : 'Saving and checking pictures and music for offline play. Keep this page open.')
          : (ja ? 'この版のオフライン用の保存ができませんでした。接続と空き容量を確認してください。' : 'Could not save this edition for offline play. Check your connection and available storage.')}</p>
    {status === 'failed' && <button className="text-button" onClick={() => setAttempt(value => value + 1)}>{ja ? '保存をやり直す' : 'Retry saving'}</button>}
  </div>;
}
