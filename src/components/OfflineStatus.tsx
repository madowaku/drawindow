import { useEffect, useState } from 'react';
import type { Language } from '../core/types';

/** Ready means the fully precached edition controls this page. */
export function OfflineStatus({ language }: { language: Language }) {
  const [status, setStatus] = useState<'saving' | 'ready' | 'failed'>('saving');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus('failed');
      return;
    }
    let disposed = false;
    const workers = new Set<ServiceWorker>();
    const container = navigator.serviceWorker;
    const update = () => {
      if (!disposed && container.controller) setStatus('ready');
    };
    const changed = () => {
      if (disposed) return;
      // A previous edition may still control the page when the new install fails.
      if ([...workers].some(w => w.state === 'redundant')) {
        setStatus('failed');
      } else {
        update();
      }
    };
    const watch = (worker: ServiceWorker | null) => {
      if (worker && !workers.has(worker)) {
        workers.add(worker);
        worker.addEventListener('statechange', changed);
      }
    };
    let registration: ServiceWorkerRegistration | undefined;
    const found = () => watch(registration?.installing ?? null);
    setStatus('saving');
    container.addEventListener('controllerchange', update);
    const root = new URL(import.meta.env.BASE_URL || './', document.baseURI);
    void container.register(new URL('sw.js', root).href, { scope: root.pathname }).then(reg => {
      if (disposed) return;
      registration = reg;
      reg.addEventListener('updatefound', found);
      watch(reg.installing);
      watch(reg.waiting);
      update();
    }).catch(() => { if (!disposed) setStatus('failed'); });
    return () => {
      disposed = true;
      container.removeEventListener('controllerchange', update);
      registration?.removeEventListener('updatefound', found);
      workers.forEach(worker => worker.removeEventListener('statechange', changed));
    };
  }, [attempt]);
  const ja = language === 'ja';
  return <div className="offline-status" data-status={status}>
    <p className="session-note" role="status">{status === 'ready'
      ? (ja ? '通信なしで遊ぶ準備ができました。このブラウザーから再び開けます。' : 'Ready to play offline. Reopen in this browser anytime.')
      : status === 'saving'
        ? (ja ? '通信なしで遊べるよう、絵と音楽を保存中。この画面を開いたままお待ちください。' : 'Saving pictures and music for offline play. Keep this page open.')
        : (ja ? 'オフライン用の保存ができませんでした。接続と空き容量を確認してください。' : 'Could not save for offline play. Check your connection and available storage.')}</p>
    {status === 'failed' && <button className="text-button" onClick={() => setAttempt(value => value + 1)}>{ja ? '保存をやり直す' : 'Retry saving'}</button>}
  </div>;
}
