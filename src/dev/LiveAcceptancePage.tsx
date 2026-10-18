import { useCallback, useState } from 'react';
import App from '../App';
import type { DrawingRecognizer, GameState } from '../core/types';
import { renderDrawingDataUrl } from '../lib/strokes';
import { createApiRecognizer } from '../services/recognizer';
import { LiveAcceptanceRecorder, type AcceptanceReport } from './liveAcceptance';

/** Uses the actual game and the same API adapter. Only evidence collection is added. */
export function LiveAcceptancePage() {
  const [recorder] = useState(() => new LiveAcceptanceRecorder());
  const [report, setReport] = useState<AcceptanceReport | null>(null);
  const [human, setHuman] = useState(false);
  const [notes, setNotes] = useState('');
  const [recognizer] = useState<DrawingRecognizer>(() => ({ async recognize(input, options) {
    const started = performance.now();
    let httpStatus: number | null = null, retryAfterMs: number | null = null;
    const api = createApiRecognizer({ endpoint: import.meta.env.VITE_RECOGNITION_URL || '/api/recognize', imageRenderer: renderDrawingDataUrl, onResponse: metadata => { httpStatus = metadata.httpStatus; retryAfterMs = metadata.retryAfterMs; } });
    const result = await api.recognize(input, options);
    recorder.recordAttempt({ requestId: input.requestId, httpStatus, retryAfterMs, latencyMs: performance.now() - started, result });
    return result;
  } }));
  const observe = useCallback((state: GameState) => {
    recorder.observe(state);
    setReport(recorder.report());
    if (state.phase !== 'results') { setHuman(false); setNotes(''); }
  }, [recorder]);
  const evidence = report ? { ...report, humanAttestation: human, notes } : null;
  const save = () => {
    if (!evidence) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `DRAWINDOW-live-${report!.sessionId}-${Date.now()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <><App apiRecognizer={recognizer} onStateChange={observe} />{evidence && <aside aria-label="Local acceptance evidence" style={{ maxWidth: 720, margin: '24px auto', padding: 24 }}>
    <p>Local acceptance record · {evidence.scoreMatches ? 'Nine-link calculation agrees' : 'Calculation needs review'}.</p>
    <label><input type="checkbox" checked={human} onChange={event => setHuman(event.target.checked)} /> I drew five new pictures by hand in this session.</label>
    <p><label>Play notes <input aria-label="Play notes" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} /></label></p>
    <button className="secondary" onClick={save}>SAVE ACCEPTANCE JSON</button>
    <details><summary>Post-reveal QA record</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(evidence, null, 2)}</pre></details>
  </aside>}</>;
}
