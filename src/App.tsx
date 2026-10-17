import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Check, Eraser, Info, Moon, SpeakerHigh, SpeakerSlash, Sun, X } from '@phosphor-icons/react';
import { createInitialState, gameReducer, selectCanFinishDrawing, selectPlayerEntries, selectVisibleStrokes } from './core/gameMachine';
import { calculateScore } from './core/score';
import type { GirlExpression, Mode, SessionKind } from './core/types';
import { girlSketches } from './data/sketches';
import { WindowCanvas } from './components/WindowCanvas';
import { SketchThumbnail } from './components/SketchThumbnail';
import { renderDrawingDataUrl } from './lib/strokes';
import { playSound } from './lib/audio';
import { createApiRecognizer, createDemoRecognizer, createRecognitionRunner } from './services/recognizer';

const art = (mode: Mode, expression: GirlExpression = 'neutral') => `${import.meta.env.BASE_URL}art/${mode}-${expression}.webp`;

function savedMode(): Mode {
  try { return localStorage.getItem('drawindow-mode') === 'night' ? 'night' : 'day'; } catch { return 'day'; }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  return reduced;
}

export default function App() {
  const liveApiConfigured = Boolean(import.meta.env.VITE_RECOGNITION_URL?.trim()) || import.meta.env.VITE_ENABLE_LIVE_API === 'true';
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(savedMode()));
  const [sound, setSound] = useState(false);
  const [info, setInfo] = useState(false);
  const [leave, setLeave] = useState(false);
  const [sessionChoice, setSessionChoice] = useState<SessionKind>('demo');
  const [intentDrafts, setIntentDrafts] = useState<Record<string, string>>({});
  const [runners] = useState(() => ({
    api: createRecognitionRunner(createApiRecognizer({ endpoint: import.meta.env.VITE_RECOGNITION_URL || '/api/recognize', imageRenderer: renderDrawingDataUrl })),
    demo: createRecognitionRunner(createDemoRecognizer()),
  }));
  const reducedMotion = useReducedMotion();
  const phaseRef = useRef(state.phase);
  const active = !['title', 'review_intents', 'results'].includes(state.phase);
  const players = selectPlayerEntries(state);
  const score = calculateScore(state.entries, state.sessionKind);
  const expression: GirlExpression = state.phase === 'recognizing' || state.phase === 'recognition_error' ? 'thinking' : state.phase === 'girl_holding' || state.phase === 'results' ? 'smiling' : 'neutral';

  useEffect(() => {
    try { localStorage.setItem('drawindow-mode', state.mode); } catch { /* Private browser storage is optional. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.mode === 'day' ? '#edf2ef' : '#18252d');
  }, [state.mode]);

  useEffect(() => {
    const request = state.recognitionRequest;
    if (state.phase !== 'recognizing' || !request) return;
    let current = true;
    const runner = request.sessionKind === 'demo' ? runners.demo : runners.api;
    void runner.recognize(request).then(result => {
      if (current) dispatch({ type: 'RECOGNITION_RESOLVED', requestId: request.requestId, result });
    });
    return () => { current = false; };
  }, [state.recognitionRequest, state.phase, runners]);

  useEffect(() => {
    if (sound && phaseRef.current !== state.phase) {
      if (state.phase === 'girl_breath') playSound('breath');
      else if (state.phase === 'girl_holding') playSound('turn');
      else if (state.phase === 'results') playSound('finish');
    }
    phaseRef.current = state.phase;
  }, [state.phase, sound]);

  useEffect(() => {
    for (const mode of ['day', 'night'] as Mode[]) for (const face of ['neutral', 'thinking', 'smiling'] as GirlExpression[]) {
      const preload = new Image(); preload.src = art(mode, face);
    }
  }, []);

  const start = () => { setIntentDrafts({}); dispatch({ type: 'START', mode: state.mode, sessionKind: state.phase === 'title' ? sessionChoice : state.sessionKind, sketches: girlSketches }); };
  const modeButtons = <div className="mode-picker" role="group" aria-label="Time of day">
    <button aria-pressed={state.mode === 'day'} onClick={() => dispatch({ type: 'SET_MODE', mode: 'day' })}><Sun size={17} /> DAY</button>
    <button aria-pressed={state.mode === 'night'} onClick={() => dispatch({ type: 'SET_MODE', mode: 'night' })}><Moon size={17} /> NIGHT</button>
  </div>;
  const title = state.phase === 'title';

  useLayoutEffect(() => {
    if (['title', 'review_intents', 'results'].includes(state.phase) || (state.phase === 'girl_breath' && state.round === 1)) window.scrollTo(0, 0);
  }, [state.phase, state.round]);

  return <main className={`app ${title ? 'is-title' : ''} ${active ? 'is-playing' : ''}`} data-mode={state.mode} data-phase={state.phase}>
    <header className="topbar">
      <button className="wordmark" onClick={() => active ? setLeave(true) : dispatch({ type: 'RETURN_TO_TITLE' })} aria-label="DRAWINDOW home">DRA<span>W</span>INDOW<span className="wordmark-period">.</span></button>
      <div className="topbar-right">
        {active && <span className="mode-label">{state.mode === 'day' ? <Sun size={15} /> : <Moon size={15} />}{state.mode.toUpperCase()}</span>}
        <button className="icon-button" aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={() => { setSound(!sound); if (!sound) playSound('turn'); }}>{sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}</button>
        <button className="icon-button" aria-label="How to play and credits" onClick={() => setInfo(true)}><Info size={20} /></button>
      </div>
    </header>

    {title && <section className="title-layout">
      <div className="title-copy">
        <p className="eyebrow">A PICTURE WORD CHAIN FOR TWO</p>
        <h1>Dra<span className="shared-w">w</span>indow<span className="title-period">.</span></h1>
        <p className="tagline">Draw your own conclusions.</p>
        <div className="title-rules"><p>Look. Guess. Draw the next word.<br />Never ask what it was.</p><p className="fine-rule">Start with the last letter of what you <em>THINK</em> you saw.</p></div>
        <div className="title-start">{modeButtons}
          <button className="primary start-button" onClick={start}>{sessionChoice === 'demo' ? 'PLAY DEMO' : 'START GAME'}<ArrowRight size={20} /></button>
          <p className="session-note">{sessionChoice === 'demo' ? 'DEMO · Simulated interpretations. No comparable score.' : 'LIVE API · Drawings are sent to the configured recognizer.'}</p>
          {liveApiConfigured && <button className="text-button connection-toggle" onClick={() => setSessionChoice(sessionChoice === 'demo' ? 'api' : 'demo')}>{sessionChoice === 'demo' ? 'Have a recognizer connected? Use live API' : 'Return to local demo'}</button>}
        </div>
        <p className="edition">FIVE EXCHANGES. ONE MISTED WINDOW.</p>
      </div>
      <div className="title-art"><img src={art(state.mode, 'smiling')} alt="A girl waiting on the other side of a misted window" /><div className="art-caption"><span>on the other side</span><span>{state.mode === 'day' ? 'a quiet afternoon' : 'a light still on'}</span></div></div>
    </section>}

    {active && <section className="play-layout" aria-label="Picture word chain">
      <div className="play-heading"><div><p className="eyebrow">ACROSS THE GLASS</p><h1>{state.phase === 'player_drawing' ? 'Your little reply.' : state.phase === 'recognizing' ? 'A moment to wonder.' : state.phase === 'recognition_error' ? 'A little interruption.' : 'What do you see?'}</h1></div><div className="round-label"><span>EXCHANGE</span><strong>{String(state.round).padStart(2, '0')}<small> / 05</small></strong></div></div>
      <div className={`window-surface phase-${state.phase}`}>
        <img className="girl-scene" src={art(state.mode, expression)} alt="" draggable={false} />
        <WindowCanvas mode={state.mode} phase={state.phase} strokes={selectVisibleStrokes(state)} onStrokesChange={strokes => dispatch({ type: 'STROKES_CHANGED', strokes })} onBreathDone={() => dispatch({ type: 'BREATH_DONE' })} onPlaybackDone={() => dispatch({ type: 'PLAYBACK_DONE' })} reducedMotion={reducedMotion} expression={expression} />
        <div className="glass-corner-label">{['player_drawing', 'recognizing', 'recognition_error'].includes(state.phase) ? 'your side' : 'her side'}</div>
        {state.sessionKind === 'demo' && <span className="demo-badge">DEMO</span>}
      </div>
      <div className="play-footer">
        <div className="turn-status" aria-live="polite">
          <p>{state.phase === 'girl_breath' ? state.mode === 'day' ? 'She warms the glass with a breath…' : 'A fresh patch of mist…' : state.phase === 'girl_drawing' ? 'A thought takes shape…' : state.phase === 'girl_holding' ? 'Think of its English name. Use its last letter.' : state.phase === 'player_drawing' ? 'Draw the next word with your finger or mouse.' : state.phase === 'recognizing' ? 'She is finding her own meaning in your drawing…' : 'Your drawing is safe. The recognizer could not respond.'}</p>
          {state.phase !== 'recognition_error' && <span className="no-rush">No rush. Nothing disappears.</span>}
        </div>
        <div className="action-row">
          {state.phase === 'girl_holding' && <button className="primary" onClick={() => dispatch({ type: 'YOUR_TURN' })}>YOUR TURN<ArrowRight size={20} /></button>}
          {state.phase === 'player_drawing' && <><button className="secondary tool" disabled={!state.activeStrokes.length} onClick={() => dispatch({ type: 'UNDO' })} aria-label="Undo last stroke"><ArrowCounterClockwise size={21} /></button><button className="secondary tool clear-tool" disabled={!state.activeStrokes.length} onClick={() => dispatch({ type: 'CLEAR' })}><Eraser size={20} /><span>CLEAR</span></button><button className="primary" disabled={!selectCanFinishDrawing(state)} onClick={() => dispatch({ type: 'DONE' })}>DONE<Check size={20} /></button></>}
          {['girl_breath', 'girl_drawing', 'recognizing'].includes(state.phase) && <div className="waiting"><span className="waiting-mark" />{state.phase === 'recognizing' ? 'THINKING' : 'HER TURN'}</div>}
          {state.phase === 'recognition_error' && <div className="error-actions"><p role="alert">{state.error?.message || 'Connection unavailable. Please try again.'}</p><div>{state.error?.retryable && <button className="primary" onClick={() => dispatch({ type: 'RETRY_RECOGNITION' })}>TRY AGAIN</button>}<button className="secondary" onClick={() => dispatch({ type: 'USE_DEMO' })}>DEMO MODE</button><button className="text-button" onClick={() => dispatch({ type: 'BACK_TO_DRAWING' })}><ArrowLeft size={16} /> BACK</button></div><small>Demo uses simulated interpretations and no comparable score.</small></div>}
        </div>
      </div>
      <div className="progress-track" aria-label={`${state.round} of 5 exchanges`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < state.round - 1 ? 'complete' : i === state.round - 1 ? 'current' : ''} />)}</div>
    </section>}

    {state.phase === 'review_intents' && <section className="review-layout">
      <div className="section-intro"><p className="eyebrow">NOW WE CAN ASK</p><h1>What did you mean?</h1><p>Name your five drawings in English.<br />Your intentions make the chain. You can skip any.</p></div>
      <div className="review-list">{players.map((entry, index) => <div className="review-row" key={entry.id}><span className="item-number">{String(index + 1).padStart(2, '0')}</span><SketchThumbnail strokes={entry.strokes} label={`Your drawing ${index + 1}`} /><div className="review-field"><label htmlFor={`intent-${index}`}>I drew a…</label><input id={`intent-${index}`} value={intentDrafts[entry.id] ?? entry.intendedWord ?? ''} maxLength={48} autoComplete="off" spellCheck={false} placeholder="English noun" onChange={event => { const word = event.target.value; setIntentDrafts(drafts => ({ ...drafts, [entry.id]: word })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word }); }} /><button className="text-button skip-button" onClick={() => { setIntentDrafts(drafts => ({ ...drafts, [entry.id]: '' })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word: '' }); }}>Skip / leave unknown</button></div></div>)}</div>
      <div className="review-footer"><p>Only now do we reveal the words.</p><button className="primary" onClick={() => dispatch({ type: 'SHOW_RESULTS' })}>REVEAL OUR CHAIN<ArrowRight size={20} /></button></div>
    </section>}

    {state.phase === 'results' && <section className="results-layout">
      <div className="section-intro"><p className="eyebrow">TEN DRAWINGS. TWO WAYS OF SEEING.</p><h1>{score.perfect ? 'A perfect understanding.' : 'Between the lines.'}</h1><p>Some thoughts met. Others took a little detour.</p></div>
      {!score.comparable && <p className="result-disclosure">{state.sessionKind === 'demo' ? 'DEMO — simulated interpretations. This result is not score-comparable.' : 'INCOMPLETE — unknown or non-comparable links. No official best score.'}</p>}
      <div className="score-strip"><div><span>{state.sessionKind === 'demo' ? 'DEMO LINKS' : 'LINK SCORE'}</span><strong>{score.connectedCount}<small> / {score.knownPairCount}</small></strong><p>{score.knownPairCount} of 9 possible links known</p></div><div><span>BEST CHAIN</span><strong>{score.bestChain}<small>{score.bestChain === 1 ? ' link' : ' links'}</small></strong><p>Consecutive connected links</p></div></div>
      <ol className="chain-list">{state.entries.map((entry, index) => <li key={entry.id}>
        {index > 0 && <div className={`chain-link ${score.links[index - 1].status}`}><span>{score.links[index - 1].status === 'connected' ? 'CONNECTED' : score.links[index - 1].status === 'broken' ? 'A DIFFERENT DIRECTION' : 'UNKNOWN LINK'}</span><span>{score.links[index - 1].status !== 'unknown' ? `${score.links[index - 1].fromLetter?.toUpperCase()} → ${score.links[index - 1].toLetter?.toUpperCase()}` : 'An intention was left unnamed'}</span></div>}
        <div className={`result-drawing actor-${entry.actor}`}><SketchThumbnail strokes={entry.strokes} label={`${entry.actor === 'girl' ? 'Her' : 'Your'} drawing: ${entry.intendedWord || 'unknown intention'}`} /><div><p className="eyebrow">{entry.actor === 'girl' ? 'SHE DREW' : 'YOU MEANT'} · {entry.round}</p><h2>{entry.intendedWord || 'Unknown'}</h2>{entry.actor === 'player' && <p className="interpretation">{entry.recognition?.guess ? <>{entry.recognition.source === 'mock' ? 'Demo interpretation' : 'She thought'}: <strong>{entry.recognition.guess}</strong></> : 'Her interpretation: unknown'}</p>}</div></div>
      </li>)}</ol>
      <div className="result-end"><p className="tagline">Perhaps we’ll see it differently next time.</p><button className="primary" onClick={start}>ANOTHER WINDOW<ArrowCounterClockwise size={20} /></button><button className="text-button" onClick={() => dispatch({ type: 'RETURN_TO_TITLE' })}>Back to the beginning</button></div>
    </section>}

    {(info || leave) && <div className="modal-backdrop" onClick={() => { setInfo(false); setLeave(false); }}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') { setInfo(false); setLeave(false); }
      if (e.key === 'Tab') {
        const items = e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><button autoFocus className="icon-button close-dialog" aria-label="Close dialog" onClick={() => { setInfo(false); setLeave(false); }}><X size={22} /></button>{leave ? <><p className="eyebrow">TAKE YOUR TIME</p><h2 id="dialog-title">Close this window?</h2><p>This unfinished chain will be lost.</p><button className="primary" onClick={() => { setLeave(false); dispatch({ type: 'RETURN_TO_TITLE' }); }}>RETURN TO TITLE</button><button className="text-button" onClick={() => setLeave(false)}>Keep drawing</button></> : <><p className="eyebrow">DRAWINDOW · v0.2</p><h2 id="dialog-title">A conversation without words.</h2><p>Look at her drawing. Think of its English name. Draw something beginning with its last letter.</p><p>Keep your interpretation to yourself. After five exchanges, name your own pictures and discover which of the nine links connected.</p><p><strong>DAY & NIGHT</strong> change only the mood. There is no timer.</p><p><strong>DEMO</strong> uses simulated interpretations, not image recognition. Live API sends a neutral drawing image to a configured server; the character is never included.</p><div className="credits"><p>Character: OpenAI ImageGen, based on the supplied reference.<br />Doodles: Quick, Draw! / Google, CC BY 4.0; original rare-letter sketches. Fonts: DM Sans & Cormorant Garamond, OFL.</p><a href="https://github.com/googlecreativelab/quickdraw-dataset" target="_blank" rel="noreferrer">Quick, Draw! dataset & attribution</a></div></>}</section></div>}
  </main>;
}
