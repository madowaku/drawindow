import { useMemo, useState } from 'react';
import App from '../App';
import { gameReducer } from '../core/gameMachine';
import { selectJapaneseFreshSketch } from '../core/words';
import type { GameEvent, GameState, DrawingEntry } from '../core/types';
import type { SessionSnapshot } from '../lib/sessionStorage';
import { calculateScore } from '../core/score';

/** Explicit DEV-only B intervention. Neither intent nor candidate ranking selects a reply. */
export function recoveryReducer(state: GameState, event: GameEvent): GameState {
  if (event.type !== 'CONTINUE_UNRECOGNIZED') return gameReducer(state, event);
  if (state.phase !== 'recognition_error' || state.sessionKind !== 'ml' || state.round >= 5 || !state.recognitionRequest) return state;
  const used = state.entries.flatMap(entry => entry.templateId ? [entry.templateId] : []);
  const sketch = state.language === 'ja' ? selectJapaneseFreshSketch(state.sketches, used)
    : state.sketches.find(entry => !used.includes(entry.id) && (!entry.readability || ['safe', 'soft'].includes(entry.readability)));
  if (!sketch) return state;
  const entries = state.entries.map(entry => entry.id === state.recognitionRequest?.playerEntryId
    ? { ...entry, comparable: false, nonComparableReason: 'recognition_recovery' as const } : entry);
  const round = state.round + 1;
  const girl: DrawingEntry = { id: `${state.sessionId}:girl:${round}`, actor: 'girl', round,
    intendedWord: sketch.word, strokes: sketch.strokes, templateId: sketch.id, recognition: null, comparable: false };
  return { ...state, entries: [...entries, girl], round, phase: 'girl_breath', activeStrokes: [],
    drawingHistory: { past: [], future: [] }, recognitionRequest: null, error: null, girlCorrection: null };
}

// Separate local save slot: research sessions cannot replace a product session.
const KEY = 'drawindow-recognition-recovery-v013';
const storageFor = (variant: string) => ({
  read: async () => { const text = localStorage.getItem(KEY + variant); return text ? JSON.parse(text) : null; },
  write: async (snapshot: SessionSnapshot | null) => { if (snapshot) localStorage.setItem(KEY + variant, JSON.stringify(snapshot)); else localStorage.removeItem(KEY + variant); },
});

export function RecognitionRecoveryPage() {
  const [state, setState] = useState<GameState>();
  const [variant, setVariant] = useState<'A' | 'B'>('B');
  const storage = useMemo(() => storageFor(variant), [variant]);
  const [fun, setFun] = useState(''), [replay, setReplay] = useState('');
  const [burden, setBurden] = useState(''), [natural, setNatural] = useState('');
  const [shizuku, setShizuku] = useState(''), [misreading, setMisreading] = useState('');
  const [redraws, setRedraws] = useState(() => { try { return Number(localStorage.getItem(KEY + 'B:redraws')) || 0; } catch { return 0; } });
  const resetFeedback = () => { setFun(''); setReplay(''); setBurden(''); setNatural(''); setShizuku(''); setMisreading(''); };
  const score = state ? calculateScore(state.entries, state.sessionKind, state.language) : null;
  const exportStudy = () => {
    const record = { schema: 'DRAWINDOW-recovery-v013', origin: 'human-unverified', variant,
      redrawDefinition: 'Explicit returns to editing; does not assert that the strokes changed.',
      completed: state?.entries.length === 10 && ['review_intents', 'results'].includes(state.phase), redraws,
      recoveries: state?.entries.filter(e => e.nonComparableReason === 'recognition_recovery').length ?? 0,
      feedback: { fun, replay, burden, natural, shizuku, misreading },
      // No words or artwork before reveal. No strokes/images at any time.
      score: state?.phase === 'results' ? score : null,
      failures: state?.entries.filter(e => e.actor === 'player').map(e => ({ round: e.round, failureReason: e.recognition?.failureReason ?? null, recovery: e.nonComparableReason === 'recognition_recovery' })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'DRAWINDOW-recovery-v013.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <App key={variant} onStateChange={setState} study={{ localOnly: true, preserveProductPresentation: true, storage,
    reducer: variant === 'B' ? recoveryReducer : gameReducer,
    onEvent: event => {
      if (event.type === 'BACK_TO_DRAWING') setRedraws(v => { const next = v + 1; try { localStorage.setItem(KEY + variant + ':redraws', String(next)); } catch {} return next; });
      if (event.type === 'START') { resetFeedback(); setRedraws(0); try { localStorage.setItem(KEY + variant + ':redraws', '0'); } catch {} }
    },
    header: <aside className="session-save-note"><strong>v0.13 · 続け方の研究 / Continuation study</strong><p>A: 線を直す / edit · B: わからないまま新しい絵へ / fresh start · C: 名前を伝える案は設計比較のみ。</p>
      <label>比較条件 <select aria-label="比較条件" value={variant} disabled={state?.phase !== 'title' && state?.phase !== 'results' && state !== undefined} onChange={e => { resetFeedback(); setState(undefined); setVariant(e.target.value as 'A' | 'B'); try { setRedraws(Number(localStorage.getItem(KEY + e.target.value + ':redraws')) || 0); } catch { setRedraws(0); } }}><option>A</option><option>B</option></select></label></aside>,
    errorActions: (s, dispatch) => variant === 'B' ? <button className="secondary" onClick={() => dispatch({ type: 'CONTINUE_UNRECOGNIZED' })}>{s.language === 'ja' ? 'わからないまま、次の一枚へ' : 'Keep this picture and start a new one'}</button> : null,
    footer: <aside className="session-save-note"><p>わからなかった絵も10枚に残ります。そこから次へのリンクは不明として残します。認識成功には数えません。</p>
      {state?.phase === 'results' && <><label>自然だった / Natural <input value={natural} onChange={e => setNatural(e.target.value)} maxLength={80}/></label>
      <label>描き直しの負担 / Redraw burden <input value={burden} onChange={e => setBurden(e.target.value)} maxLength={80}/></label>
      <label>楽しかった / Fun <input value={fun} onChange={e => setFun(e.target.value)} maxLength={80}/></label>
      <label>しずくらしかった / Felt like Shizuku <input value={shizuku} onChange={e => setShizuku(e.target.value)} maxLength={80}/></label>
      <label>すれ違いを楽しめた / Enjoyed misreadings <input value={misreading} onChange={e => setMisreading(e.target.value)} maxLength={80}/></label>
      <label>また遊びたい / Play again <input value={replay} onChange={e => setReplay(e.target.value)} maxLength={80}/></label></>}
      <button onClick={exportStudy}>Export continuation JSON · 絵・筆跡なし</button></aside>,
  }} />;
}
