import { GirlOopsReaction } from './components/GirlOopsReaction';
import { OfflineStatus } from './components/OfflineStatus';
import { adoptShizukuSketches } from './data/shizuku-doodles/adopted';
import { japaneseEverydayDoodles } from './data/japaneseEverydayDoodles';
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, ArrowClockwise, Check, Eraser, Info, Moon, SpeakerHigh, SpeakerSlash, Sun, X } from '@phosphor-icons/react';
import { createInitialState, gameReducer, selectCanFinishDrawing, selectPlayerEntries, selectVisibleStrokes } from './core/gameMachine';
import { calculateScore } from './core/score';
import { EndingScene } from './components/EndingScene';
import type { DrawingRecognizer, GameState, Language, Mode, SessionKind } from './core/types';
import { girlSketches } from './data/sketches';
import { localizeGirlSketches, withJapaneseStarter } from './data/japaneseSketches';
import { japaneseExtraSketches } from './data/japaneseExtraSketches';
import { japaneseDoodlePack } from './data/japaneseDoodlePack';
import { japaneseClassicDoodles } from './data/japaneseClassicDoodles';
import { WindowCanvas } from './components/WindowCanvas';
import { SketchThumbnail } from './components/SketchThumbnail';
import { CharacterScene, characterArt } from './components/CharacterScene';
import { MusicCredits } from './components/MusicCredits';
import { CHARACTER_FRAMES } from './lib/character';
import { renderDrawingDataUrl } from './lib/strokes';
import { musicForScene } from './lib/music';
import { useGameAudio } from './lib/useGameAudio';
import { createApiRecognizer, createDemoRecognizer, createRecognitionRunner } from './services/recognizer';
import { createQuickDrawRecognizer, preloadQuickDrawModel } from './services/quickDrawRecognizer';

function savedMode(): Mode {
  try { return localStorage.getItem('drawindow-mode') === 'night' ? 'night' : 'day'; } catch { return 'day'; }
}

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem('drawindow-language');
    if (saved === 'en' || saved === 'ja') return saved;
  } catch { /* Storage is optional. */ }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
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

export interface AppProps {
  /** Optional local acceptance observer; production supplies neither prop. */
  apiRecognizer?: DrawingRecognizer;
  mlRecognizer?: DrawingRecognizer;
  onStateChange?: (state: GameState) => void;
}

export default function App({ apiRecognizer, mlRecognizer, onStateChange }: AppProps = {}) {
  const appScrollRef = useRef<HTMLElement>(null);
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const lastIntentFocusRef = useRef<HTMLInputElement | null>(null);
  const offlineEdition = import.meta.env.VITE_OFFLINE_EDITION === 'true';
  const liveApiConfigured = !offlineEdition && (Boolean(import.meta.env.VITE_RECOGNITION_URL?.trim()) || import.meta.env.VITE_ENABLE_LIVE_API === 'true');
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(savedMode(), savedLanguage()));
  const { sound, toggleSound, playSound } = useGameAudio(musicForScene(state.phase, state.mode));
  const [info, setInfo] = useState(false);
  const [leave, setLeave] = useState(false);
  const [sessionChoice, setSessionChoice] = useState<SessionKind>(offlineEdition ? 'ml' : liveApiConfigured && import.meta.env.VITE_DEFAULT_LIVE === 'true' ? 'api' : 'demo');
  const [intentDrafts, setIntentDrafts] = useState<Record<string, string>>({});
  const [runners] = useState(() => ({
    api: createRecognitionRunner(apiRecognizer ?? createApiRecognizer({ endpoint: import.meta.env.VITE_RECOGNITION_URL || '/api/recognize', imageRenderer: renderDrawingDataUrl })),
    demo: createRecognitionRunner(createDemoRecognizer()),
    ml: createRecognitionRunner(mlRecognizer ?? createQuickDrawRecognizer(), { timeoutMs: 45000 }),
  }));
  useEffect(() => {
    if (offlineEdition) void preloadQuickDrawModel().catch(() => { /* Explicit error on recognition. */ });
  }, [offlineEdition]);
  const reducedMotion = useReducedMotion();
  const phaseRef = useRef(state.phase);
  const active = !['title', 'review_intents', 'results'].includes(state.phase);
  const protectLeave = active || state.phase === 'review_intents';
  const players = selectPlayerEntries(state);
  const score = calculateScore(state.entries, state.sessionKind, state.language);
  const t = (en: string, ja: string) => state.language === 'ja' ? ja : en;
  const openDialog = (kind: 'info' | 'leave') => {
    dialogReturnFocusRef.current = state.phase === 'review_intents' && lastIntentFocusRef.current?.isConnected
      ? lastIntentFocusRef.current : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (kind === 'info') setInfo(true);
    else setLeave(true);
  };
  const closeDialog = () => { setInfo(false); setLeave(false); };

  useLayoutEffect(() => {
    if (info || leave) return;
    const target = dialogReturnFocusRef.current;
    dialogReturnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }, [info, leave]);

  useEffect(() => {
    const handleEditShortcut = (event: KeyboardEvent) => {
      if (state.phase !== 'player_drawing' || info || leave || event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable]'))) return;
      const key = event.key.toLowerCase();
      const type = key === 'z' ? event.shiftKey ? 'REDO' : 'UNDO' : key === 'y' ? 'REDO' : null;
      if (!type) return;
      event.preventDefault();
      dispatch({ type });
    };
    window.addEventListener('keydown', handleEditShortcut);
    return () => window.removeEventListener('keydown', handleEditShortcut);
  }, [state.phase, info, leave]);

  // Clear a completed developer record before painting the next session.
  useLayoutEffect(() => { onStateChange?.(state); }, [state, onStateChange]);

  useEffect(() => {
    document.documentElement.lang = state.language;
    try { localStorage.setItem('drawindow-language', state.language); } catch { /* Optional. */ }
  }, [state.language]);

  useEffect(() => {
    try { localStorage.setItem('drawindow-mode', state.mode); } catch { /* Private browser storage is optional. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.mode === 'day' ? '#edf2ef' : '#18252d');
  }, [state.mode]);

  useEffect(() => {
    const request = state.recognitionRequest;
    if (state.phase !== 'recognizing' || !request) return;
    let current = true;
    const runner = request.sessionKind === 'demo' ? runners.demo : request.sessionKind === 'ml' ? runners.ml : runners.api;
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
  }, [state.phase, sound, playSound]);

  useEffect(() => {
    for (const name of [...CHARACTER_FRAMES, 'room-day', 'room-night']) {
      const preload = new Image(); preload.src = characterArt(name);
    }
  }, []);

  const start = () => {
    setIntentDrafts({});
    let sketches = localizeGirlSketches(girlSketches, state.language);
    if (state.language === 'ja') {
      sketches = adoptShizukuSketches([...sketches, ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles], 'ja');
      // Advance only on an actual Japanese START, never on render or language toggle.
      // Persisted index means a page reload does not go back to the same drawing.
      let startIndex = state.sessionId;
      try {
        const saved = localStorage.getItem('drawindow-ja-starter-sequence');
        if (saved !== null && Number.isSafeInteger(Number(saved)) && Number(saved) >= 0) startIndex = Number(saved);
        localStorage.setItem('drawindow-ja-starter-sequence', String(startIndex + 1));
      } catch { /* Session counter fallback when storage is unavailable. */ }
      sketches = withJapaneseStarter(sketches, state.mode, startIndex);
    }
    dispatch({ type: 'START', mode: state.mode, sessionKind: state.phase === 'title' ? sessionChoice : state.sessionKind, sketches });
  };
  const languageButtons = <div className="language-picker" role="group" aria-label="Language / 言語">
    <button aria-pressed={state.language === 'ja'} onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'ja' })} lang="ja">日本語</button>
    <button aria-pressed={state.language === 'en'} onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'en' })} lang="en">English</button>
  </div>;
  const modeButtons = <div className="mode-picker" role="group" aria-label={t('Time of day', '昼と夜')}>
    <button aria-pressed={state.mode === 'day'} onClick={() => dispatch({ type: 'SET_MODE', mode: 'day' })}><Sun size={17} /> {t('DAY', '昼')}</button>
    <button aria-pressed={state.mode === 'night'} onClick={() => dispatch({ type: 'SET_MODE', mode: 'night' })}><Moon size={17} /> {t('NIGHT', '夜')}</button>
  </div>;
  const title = state.phase === 'title';

  useLayoutEffect(() => {
    if (['title', 'review_intents', 'results'].includes(state.phase) || (state.phase === 'girl_breath' && state.round === 1)) {
      if (appScrollRef.current) appScrollRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [state.phase, state.round]);

  return <main ref={appScrollRef} className={`app ${title ? 'is-title' : ''} ${active ? 'is-playing' : ''}`} data-mode={state.mode} data-language={state.language} data-phase={state.phase} onFocusCapture={event => { if (state.phase === 'review_intents' && event.target instanceof HTMLInputElement) lastIntentFocusRef.current = event.target; }}>
    <header className="topbar">
      <button className="wordmark" onClick={() => protectLeave ? openDialog('leave') : dispatch({ type: 'RETURN_TO_TITLE' })} aria-label={t('DRAWINDOW home', '最初の画面へ')}>DRA<span>W</span>INDOW<span className="wordmark-period">.</span></button>
      <div className="topbar-right">
        {active && <span className="mode-label">{state.mode === 'day' ? <Sun size={15} /> : <Moon size={15} />}{state.language === 'ja' ? state.mode === 'day' ? '昼' : '夜' : state.mode.toUpperCase()}</span>}
        <button className="icon-button" aria-label={sound ? t('Mute sound', '音を消す') : t('Enable sound', '音を出す')} aria-pressed={sound} onClick={toggleSound}>{sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}</button>
        <button className="icon-button" aria-label={t('How to play and credits', '遊び方とクレジット')} onClick={() => openDialog('info')}><Info size={20} /></button>
      </div>
    </header>

    {title && <section className="title-layout">
      <div className="title-copy">
        <h1>Dra<span className="shared-w">w</span>indow<span className="title-period">.</span></h1>
        <p className="tagline">{t('Draw your own conclusions.', '言葉にしない、ふたりのしりとり。')}</p>
        <div className="title-rules"><p>{t('Guess her picture. Draw from its last letter.', '何に見えた？ その名前の最後の音から、次の絵を。')}</p></div>
        <div className="title-start">{languageButtons}{modeButtons}
          {offlineEdition && <OfflineStatus language={state.language} />}
          <button className="primary start-button" onClick={start}>{sessionChoice === 'demo' ? t('PLAY DEMO', 'デモで遊ぶ') : t('START GAME', 'はじめる')}<ArrowRight size={20} /></button>
          <p className="session-note">{sessionChoice === 'ml'
            ? t('LOCAL AI · Drawings never leave your device. Experimental guesses and unsupported words are possible.', '端末内AI · 絵は送信しません。認識は実験中で、未対応語や誤認識があります。')
            : sessionChoice === 'demo'
              ? t('DEMO · Simulated interpretations, not recognition.', 'デモ · 実際の画像認識は行いません。')
              : t('LIVE API · Drawings are sent to a recognizer server.', 'LIVE API · 絵を認識サーバーへ送信します。')}</p>
          {offlineEdition && <button className="text-button connection-toggle" onClick={() => setSessionChoice(sessionChoice === 'ml' ? 'demo' : 'ml')}>{sessionChoice === 'ml' ? t('Switch to simulated demo', 'デモに切り替える') : t('Return to on-device recognition', '端末内AIに戻る')}</button>}
          {liveApiConfigured && <button className="text-button connection-toggle" onClick={() => setSessionChoice(sessionChoice === 'demo' ? 'api' : 'demo')}>{sessionChoice === 'demo' ? t('Have a recognizer connected? Use live API', '認識APIに接続して遊ぶ') : t('Return to local demo', 'ローカルデモに戻る')}</button>}
        </div>
      </div>
      <div className="title-art" role="img" aria-label={t('A girl waiting on the other side of a misted window', '曇りガラスの向こうにいる女の子')}><CharacterScene mode={state.mode} phase="title" reducedMotion={reducedMotion} /><div className="title-art__glass" /></div>
    </section>}

    {active && <section className="play-layout" aria-label={t('Picture word chain', '絵のしりとり')}>
      <div className="play-heading"><div><h1>{state.phase === 'player_drawing' ? t('Your little reply.', 'あなたからのお返事。') : state.phase === 'recognizing' ? t('A moment to wonder.', '少し、考えごと。') : state.phase === 'recognition_error' ? t('A little interruption.', 'ちょっとひと休み。') : t('What do you see?', '何に見える？')}</h1></div><div className="round-label"><span>{t('EXCHANGE', 'おうふく')}</span><strong>{String(state.round).padStart(2, '0')}<small> / 05</small></strong></div></div>
      <div className={`window-surface phase-${state.phase}`}>
        <WindowCanvas language={state.language} previousStrokes={state.entries.at(-1)?.falseStart?.strokes} mode={state.mode} phase={state.phase} round={state.round} strokes={selectVisibleStrokes(state)} onStrokesChange={strokes => dispatch({ type: 'STROKES_CHANGED', strokes })} onBreathDone={() => dispatch({ type: 'BREATH_DONE' })} onPlaybackDone={() => dispatch({ type: 'PLAYBACK_DONE' })} reducedMotion={reducedMotion} />
        <span className="demo-badge">{state.sessionKind === 'demo' ? 'DEMO' : state.sessionKind === 'ml' ? 'LOCAL AI' : 'LIVE API'}</span>
      </div>
      <div className="play-footer">
        <div className="turn-status" aria-live="polite">
          {(state.phase === 'girl_notice' || state.phase === 'girl_flustered') && <GirlOopsReaction
            key={`${state.sessionId}:${state.round}`} phase={state.phase}
            onDone={() => dispatch({ type: 'GIRL_OOPS_BEAT_DONE', sessionId: state.sessionId, round: state.round, phase: state.phase as 'girl_notice' | 'girl_flustered' })} />}
          {state.phase === 'girl_holding' && <p>{t('Think of its English name. Use its last letter.', '見えたものの、最後の音から。')}</p>}
          {state.phase === 'player_drawing' && <p>{t('Draw with your finger or mouse.', '指かマウスで描こう。')}</p>}
        </div>
        <div className="action-row">
          {state.phase === 'girl_holding' && <button className="primary" onClick={() => dispatch({ type: 'YOUR_TURN' })}>{t('YOUR TURN', 'あなたの番')}<ArrowRight size={20} /></button>}
          {state.phase === 'player_drawing' && <><button className="secondary tool" disabled={!state.drawingHistory.past.length} onClick={() => dispatch({ type: 'UNDO' })} aria-label={t('Undo last edit', '元に戻す')} title={t('Undo · Ctrl/Cmd+Z', '元に戻す · Ctrl/Cmd+Z')}><ArrowCounterClockwise size={21} /></button><button className="secondary tool" disabled={!state.drawingHistory.future.length} onClick={() => dispatch({ type: 'REDO' })} aria-label={t('Redo last edit', 'やり直す')} title={t('Redo · Ctrl/Cmd+Shift+Z', 'やり直す · Ctrl/Cmd+Shift+Z')}><ArrowClockwise size={21} /></button><button className="secondary tool clear-tool" disabled={!state.activeStrokes.length} onClick={() => dispatch({ type: 'CLEAR' })} aria-label={t('CLEAR', '消す')}><Eraser size={20} /><span>{t('CLEAR', '消す')}</span></button><button className="primary" disabled={!selectCanFinishDrawing(state)} onClick={() => dispatch({ type: 'DONE' })}>{t('DONE', 'できた')}<Check size={20} /></button></>}
          {['girl_breath', 'girl_drawing', 'girl_notice', 'girl_flustered', 'recognizing'].includes(state.phase) && <div className="waiting"><span className="waiting-mark" />{state.phase === 'recognizing' ? t('THINKING', '考え中') : t('HER TURN', 'しずくの番')}</div>}
          {state.phase === 'recognition_error' && <div className="error-actions"><p role="alert">{state.language === 'ja' ? state.error?.code === 'rate_limit' ? '認識回数の制限に達しました。少し時間をおいてください。絵は残っています。' : state.error?.code === 'uncovered_letter' ? '次につながる絵が見つかりません。描き直すか、デモを試してください。' : '認識できませんでした。絵は残っています。' : state.error?.message || 'Connection unavailable. Please try again.'}</p><div>{state.error?.retryable && <button className="primary" onClick={() => dispatch({ type: 'RETRY_RECOGNITION' })}>{t('TRY AGAIN', 'もう一度')}</button>}<button className="secondary" onClick={() => dispatch({ type: 'USE_DEMO' })}>{t('DEMO MODE', 'デモにする')}</button><button className="text-button" onClick={() => dispatch({ type: 'BACK_TO_DRAWING' })}><ArrowLeft size={16} /> {t('BACK', '戻る')}</button></div><small>{t('Demo uses simulated interpretations and no comparable score.', 'デモは認識をシミュレーションするため、正式なスコアにはなりません。')}</small></div>}
        </div>
      </div>
      <div className="progress-track" aria-label={t(`${state.round} of 5 exchanges`, `全５回中${state.round}回目`)}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < state.round - 1 ? 'complete' : i === state.round - 1 ? 'current' : ''} />)}</div>
    </section>}

    {state.phase === 'review_intents' && <section className="review-layout">
      <div className="session-portrait" data-testid="review-character" aria-hidden="true"><CharacterScene mode={state.mode} phase="review_intents" round={state.round} reducedMotion={reducedMotion} /></div>
      <div className="section-intro"><h1>{t('What did you mean?', '何を描いたの？')}</h1><p>{t('Name your drawings in English. Leave any blank.', '絵の名前をひらがな・カタカナで。空欄でも大丈夫。')}</p></div>
      <div className="review-list">{players.map((entry, index) => <div className="review-row" key={entry.id}><span className="item-number">{String(index + 1).padStart(2, '0')}</span><SketchThumbnail strokes={entry.strokes} label={t(`Your drawing ${index + 1}`, `あなたの絵 ${index + 1}`)} /><div className="review-field"><label className="visually-hidden" htmlFor={`intent-${index}`}>{t('I drew a…', '描いたのは…')}</label><input id={`intent-${index}`} value={intentDrafts[entry.id] ?? entry.intendedWord ?? ''} maxLength={48} autoComplete="off" spellCheck={false} placeholder={t('English noun', 'ひらがな・カタカナで')} onChange={event => { const word = event.target.value; setIntentDrafts(drafts => ({ ...drafts, [entry.id]: word })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word }); }} /><button className="text-button skip-button" onClick={() => { setIntentDrafts(drafts => ({ ...drafts, [entry.id]: '' })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word: '' }); }}>{t('Leave unknown', '空欄にする')}</button></div></div>)}</div>
      <div className="review-footer"><button className="primary" onClick={() => dispatch({ type: 'SHOW_RESULTS' })}>{t('REVEAL OUR CHAIN', '答えあわせ')}<ArrowRight size={20} /></button></div>
    </section>}

    {state.phase === 'results' && <EndingScene key={state.sessionId} entries={state.entries} score={score} mode={state.mode} language={state.language} sessionKind={state.sessionKind} reducedMotion={reducedMotion} onRestart={start} onTitle={() => dispatch({ type: 'RETURN_TO_TITLE' })} />}

    {(info || leave) && <div className="modal-backdrop" onClick={closeDialog}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') closeDialog();
      if (e.key === 'Tab') {
        const items = e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><button autoFocus className="icon-button close-dialog" aria-label={t('Close dialog', '閉じる')} onClick={closeDialog}><X size={22} /></button>{leave ? <><h2 id="dialog-title">{t('Close this window?', '窓を閉じる？')}</h2><p>{t('This unfinished chain will be lost.', '途中の絵と名前は消えてしまうよ。')}</p><button className="primary" onClick={() => { dialogReturnFocusRef.current = null; setLeave(false); dispatch({ type: 'RETURN_TO_TITLE' }); }}>{t('RETURN TO TITLE', '最初に戻る')}</button><button className="text-button" onClick={closeDialog}>{state.phase === 'review_intents' ? t('Keep naming', '名前つけを続ける') : t('Keep drawing', '続きを描く')}</button></> : <><p className="eyebrow">DRAWINDOW · v0.7.1</p><h2 id="dialog-title">{t('A conversation without words.', '言葉を使わない会話。')}</h2><p>{t('Look at her drawing. Think of its English name. Draw something beginning with its last letter.', 'しずくの絵に名前をつけて、最後の音から次の絵を描こう。ご→こ、ぎ→きのように濁点を外してもOK。「ん」で終わったら、新しい絵から再開するよ。')}</p><p>{t('Keep your interpretation to yourself. After five exchanges, name your own pictures and discover which of the nine links connected.', '途中で答えを言わないでね。５往復したら名前を明かして、９本のつながりを確かめよう。')}</p><p>{t('DAY & NIGHT change only the mood. There is no timer.', '昼と夜では雰囲気が変わるよ。時間制限はありません。')}</p><p>{offlineEdition
              ? t('Local AI runs on your device without uploading drawings. Guesses are experimental. Offline relaunch needs completed installation and caching.', '端末内AIは絵を送信しません。判定は実験中です。通信なしでの再起動にはインストールとキャッシュの完了が必要です。')
              : t('DEMO uses simulated interpretations, not image recognition. Live API sends a neutral drawing image to a configured server; the character is never included.', 'デモは画像認識ではなく、決まった解釈を返します。LIVE APIでは絵だけを認識サーバーに送り、しずくの画像は送りません。')}</p><div className="credits"><p>{t('Character', 'キャラクター')}: OpenAI ImageGen<br />{t('Doodles', '絵')}: Quick, Draw! / Google, CC BY 4.0; DRAWINDOW original. {t('Fonts', 'フォント')}: DM Sans &amp; Cormorant Garamond, OFL.</p><MusicCredits /><a href="https://github.com/googlecreativelab/quickdraw-dataset" target="_blank" rel="noreferrer">Quick, Draw! dataset & attribution</a></div></>}</section></div>}
  </main>;
}
