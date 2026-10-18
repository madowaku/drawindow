import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Check, Eraser, Info, Moon, SpeakerHigh, SpeakerSlash, Sun, X } from '@phosphor-icons/react';
import { createInitialState, gameReducer, selectCanFinishDrawing, selectPlayerEntries, selectVisibleStrokes } from './core/gameMachine';
import { calculateScore } from './core/score';
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
  onStateChange?: (state: GameState) => void;
}

export default function App({ apiRecognizer, onStateChange }: AppProps = {}) {
  const liveApiConfigured = Boolean(import.meta.env.VITE_RECOGNITION_URL?.trim()) || import.meta.env.VITE_ENABLE_LIVE_API === 'true';
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(savedMode(), savedLanguage()));
  const { sound, toggleSound, playSound } = useGameAudio(musicForScene(state.phase, state.mode));
  const [info, setInfo] = useState(false);
  const [leave, setLeave] = useState(false);
  const [sessionChoice, setSessionChoice] = useState<SessionKind>('demo');
  const [intentDrafts, setIntentDrafts] = useState<Record<string, string>>({});
  const [runners] = useState(() => ({
    api: createRecognitionRunner(apiRecognizer ?? createApiRecognizer({ endpoint: import.meta.env.VITE_RECOGNITION_URL || '/api/recognize', imageRenderer: renderDrawingDataUrl })),
    demo: createRecognitionRunner(createDemoRecognizer()),
  }));
  const reducedMotion = useReducedMotion();
  const phaseRef = useRef(state.phase);
  const active = !['title', 'review_intents', 'results'].includes(state.phase);
  const players = selectPlayerEntries(state);
  const score = calculateScore(state.entries, state.sessionKind, state.language);
  const t = (en: string, ja: string) => state.language === 'ja' ? ja : en;

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
      sketches = [...sketches, ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles];
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
    if (['title', 'review_intents', 'results'].includes(state.phase) || (state.phase === 'girl_breath' && state.round === 1)) window.scrollTo(0, 0);
  }, [state.phase, state.round]);

  return <main className={`app ${title ? 'is-title' : ''} ${active ? 'is-playing' : ''}`} data-mode={state.mode} data-language={state.language} data-phase={state.phase}>
    <header className="topbar">
      <button className="wordmark" onClick={() => active ? setLeave(true) : dispatch({ type: 'RETURN_TO_TITLE' })} aria-label={t('DRAWINDOW home', '最初の画面へ')}>DRA<span>W</span>INDOW<span className="wordmark-period">.</span></button>
      <div className="topbar-right">
        {active && <span className="mode-label">{state.mode === 'day' ? <Sun size={15} /> : <Moon size={15} />}{state.language === 'ja' ? state.mode === 'day' ? '昼' : '夜' : state.mode.toUpperCase()}</span>}
        <button className="icon-button" aria-label={sound ? t('Mute sound', '音を消す') : t('Enable sound', '音を出す')} aria-pressed={sound} onClick={toggleSound}>{sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}</button>
        <button className="icon-button" aria-label={t('How to play and credits', '遊び方とクレジット')} onClick={() => setInfo(true)}><Info size={20} /></button>
      </div>
    </header>

    {title && <section className="title-layout">
      <div className="title-copy">
        <p className="eyebrow">{t('A PICTURE WORD CHAIN FOR TWO', 'ふたりの、絵のしりとり')}</p>
        <h1>Dra<span className="shared-w">w</span>indow<span className="title-period">.</span></h1>
        <p className="tagline">{t('Draw your own conclusions.', '言葉にしない、ふたりのしりとり。')}</p>
        <div className="title-rules"><p>{t('Look. Guess. Draw the next word.', '見て、想像して、次の絵を描く。')}<br />{t('Never ask what it was.', '正解は、最後まで聞かない。')}</p><p className="fine-rule">{t('Start with the last letter of what you THINK you saw.', '見えたと思うものの、最後の文字から。')}</p>{state.language === 'ja' && <p className="fine-rule">濁点・半濁点はつけても外してもOK。（ご→こ、ぎ→き）</p>}</div>
        <div className="title-start">{languageButtons}{modeButtons}
          <button className="primary start-button" onClick={start}>{sessionChoice === 'demo' ? t('PLAY DEMO', 'デモで遊ぶ') : t('START GAME', 'はじめる')}<ArrowRight size={20} /></button>
          <p className="session-note">{sessionChoice === 'demo' ? t('DEMO · Simulated interpretations. No comparable score.', 'デモ · 絵の認識はシミュレーションです。正式なスコアにはなりません。') : t('LIVE API · Drawings are sent to the configured recognizer.', 'LIVE API · あなたの絵が認識用サーバーに送られます。')}</p>
          {liveApiConfigured && <button className="text-button connection-toggle" onClick={() => setSessionChoice(sessionChoice === 'demo' ? 'api' : 'demo')}>{sessionChoice === 'demo' ? t('Have a recognizer connected? Use live API', '認識APIに接続して遊ぶ') : t('Return to local demo', 'ローカルデモに戻る')}</button>}
        </div>
        <p className="edition">{t('FIVE EXCHANGES. ONE MISTED WINDOW.', '５往復。ひとつの曇りガラス。')}</p>
      </div>
      <div className="title-art" role="img" aria-label={t('A girl waiting on the other side of a misted window', '曇りガラスの向こうにいる女の子')}><CharacterScene mode={state.mode} phase="title" reducedMotion={reducedMotion} /><div className="title-art__glass" /><div className="art-caption"><span>{t('on the other side', '窓の向こう')}</span><span>{state.mode === 'day' ? t('a quiet afternoon', '静かな午後') : t('a light still on', 'まだ灯る明かり')}</span></div></div>
    </section>}

    {active && <section className="play-layout" aria-label={t('Picture word chain', '絵のしりとり')}>
      <div className="play-heading"><div><p className="eyebrow">{t('ACROSS THE GLASS', 'ガラス越しに')}</p><h1>{state.phase === 'player_drawing' ? t('Your little reply.', 'あなたからのお返事。') : state.phase === 'recognizing' ? t('A moment to wonder.', '少し、考えごと。') : state.phase === 'recognition_error' ? t('A little interruption.', 'ちょっとひと休み。') : t('What do you see?', '何に見える？')}</h1></div><div className="round-label"><span>{t('EXCHANGE', 'おうふく')}</span><strong>{String(state.round).padStart(2, '0')}<small> / 05</small></strong></div></div>
      <div className={`window-surface phase-${state.phase}`}>
        <WindowCanvas mode={state.mode} phase={state.phase} round={state.round} strokes={selectVisibleStrokes(state)} onStrokesChange={strokes => dispatch({ type: 'STROKES_CHANGED', strokes })} onBreathDone={() => dispatch({ type: 'BREATH_DONE' })} onPlaybackDone={() => dispatch({ type: 'PLAYBACK_DONE' })} reducedMotion={reducedMotion} />
        <div className="glass-corner-label">{['player_drawing', 'recognizing', 'recognition_error'].includes(state.phase) ? t('your side', 'こちらがわ') : t('her side', 'むこうがわ')}</div>
        <span className="demo-badge">{state.sessionKind === 'demo' ? 'DEMO' : 'LIVE API'}</span>
      </div>
      <div className="play-footer">
        <div className="turn-status" aria-live="polite">
          <p>{state.phase === 'girl_breath' ? state.mode === 'day' ? t('She warms the glass with a breath…', 'ふうっと、ガラスが曇る…') : t('A fresh patch of mist…', 'またひとつ、曇った窓…') : state.phase === 'girl_drawing' ? t('A thought takes shape…', 'ひとつの想いが、絵になる…') : state.phase === 'girl_holding' ? t('Think of its English name. Use its last letter.', '何に見えた？ 最後の音から。濁点を外してもOK。') : state.phase === 'player_drawing' ? t('Draw the next word with your finger or mouse.', '指かマウスで、次の絵を描こう。') : state.phase === 'recognizing' ? t('She is finding her own meaning in your drawing…', 'しずくが、あなたの絵を見つめている…') : t('Your drawing is safe. The recognizer could not respond.', '絵は残っています。認識できませんでした。')}</p>
          {state.phase !== 'recognition_error' && <span className="no-rush">{t('No rush. Nothing disappears.', 'あわてなくて大丈夫。絵は消えないよ。')}</span>}
        </div>
        <div className="action-row">
          {state.phase === 'girl_holding' && <button className="primary" onClick={() => dispatch({ type: 'YOUR_TURN' })}>{t('YOUR TURN', 'あなたの番')}<ArrowRight size={20} /></button>}
          {state.phase === 'player_drawing' && <><button className="secondary tool" disabled={!state.activeStrokes.length} onClick={() => dispatch({ type: 'UNDO' })} aria-label={t('Undo last stroke', 'ひと筆戻す')}><ArrowCounterClockwise size={21} /></button><button className="secondary tool clear-tool" disabled={!state.activeStrokes.length} onClick={() => dispatch({ type: 'CLEAR' })}><Eraser size={20} /><span>{t('CLEAR', '消す')}</span></button><button className="primary" disabled={!selectCanFinishDrawing(state)} onClick={() => dispatch({ type: 'DONE' })}>{t('DONE', 'できた')}<Check size={20} /></button></>}
          {['girl_breath', 'girl_drawing', 'recognizing'].includes(state.phase) && <div className="waiting"><span className="waiting-mark" />{state.phase === 'recognizing' ? t('THINKING', '考え中') : t('HER TURN', 'しずくの番')}</div>}
          {state.phase === 'recognition_error' && <div className="error-actions"><p role="alert">{state.language === 'ja' ? state.error?.code === 'rate_limit' ? '認識回数の制限に達しました。少し時間をおいてください。絵は残っています。' : state.error?.code === 'uncovered_letter' ? '次につながる絵が見つかりません。描き直すか、デモを試してください。' : '認識できませんでした。絵は残っています。' : state.error?.message || 'Connection unavailable. Please try again.'}</p><div>{state.error?.retryable && <button className="primary" onClick={() => dispatch({ type: 'RETRY_RECOGNITION' })}>{t('TRY AGAIN', 'もう一度')}</button>}<button className="secondary" onClick={() => dispatch({ type: 'USE_DEMO' })}>{t('DEMO MODE', 'デモにする')}</button><button className="text-button" onClick={() => dispatch({ type: 'BACK_TO_DRAWING' })}><ArrowLeft size={16} /> {t('BACK', '戻る')}</button></div><small>{t('Demo uses simulated interpretations and no comparable score.', 'デモは認識をシミュレーションするため、正式なスコアにはなりません。')}</small></div>}
        </div>
      </div>
      <div className="progress-track" aria-label={t(`${state.round} of 5 exchanges`, `全５回中${state.round}回目`)}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < state.round - 1 ? 'complete' : i === state.round - 1 ? 'current' : ''} />)}</div>
    </section>}

    {state.phase === 'review_intents' && <section className="review-layout">
      <div className="session-portrait" data-testid="review-character" aria-hidden="true"><CharacterScene mode={state.mode} phase="review_intents" round={state.round} reducedMotion={reducedMotion} /></div>
      <div className="section-intro"><p className="eyebrow">{t('NOW WE CAN ASK', '答えあわせの時間')}</p><h1>{t('What did you mean?', '何を描いたの？')}</h1><p>{t('Name your five drawings in English.', '描いた５つの絵の名前を、ひらがなで教えてね。')}<br />{t('Your intentions make the chain. You can skip any.', '思い浮かべた名前でつながりを確かめるよ。空欄でも大丈夫。')}</p></div>
      <div className="review-list">{players.map((entry, index) => <div className="review-row" key={entry.id}><span className="item-number">{String(index + 1).padStart(2, '0')}</span><SketchThumbnail strokes={entry.strokes} label={t(`Your drawing ${index + 1}`, `あなたの絵 ${index + 1}`)} /><div className="review-field"><label htmlFor={`intent-${index}`}>{t('I drew a…', '描いたのは…')}</label><input id={`intent-${index}`} value={intentDrafts[entry.id] ?? entry.intendedWord ?? ''} maxLength={48} autoComplete="off" spellCheck={false} placeholder={t('English noun', 'ひらがな・カタカナで')} onChange={event => { const word = event.target.value; setIntentDrafts(drafts => ({ ...drafts, [entry.id]: word })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word }); }} /><button className="text-button skip-button" onClick={() => { setIntentDrafts(drafts => ({ ...drafts, [entry.id]: '' })); dispatch({ type: 'SET_INTENT', entryId: entry.id, word: '' }); }}>{t('Skip / leave unknown', 'わからないままにする')}</button></div></div>)}</div>
      <div className="review-footer"><p>{t('Only now do we reveal the words.', 'ここで初めて、名前を明かす。')}</p><button className="primary" onClick={() => dispatch({ type: 'SHOW_RESULTS' })}>{t('REVEAL OUR CHAIN', '答えあわせ')}<ArrowRight size={20} /></button></div>
    </section>}

    {state.phase === 'results' && <section className="results-layout">
      <div className="session-portrait" data-testid="results-character" aria-hidden="true"><CharacterScene mode={state.mode} phase="results" round={state.round} reducedMotion={reducedMotion} /></div>
      <div className="section-intro"><p className="eyebrow">{t('TEN DRAWINGS. TWO WAYS OF SEEING.', '１０枚の絵。ふたつの見え方。')}</p><h1>{score.perfect ? t('A perfect understanding.', 'ぴったり、通じあった。') : t('Between the lines.', '絵と絵のあいだ。')}</h1><p>{t('Some thoughts met. Others took a little detour.', '伝わった想いも、寄り道した想いも。')}</p></div>
      {!score.comparable && <p className="result-disclosure">{state.sessionKind === 'demo' ? t('DEMO — simulated interpretations. This result is not score-comparable.', 'デモの解釈はシミュレーションです。正式なスコアにはなりません。') : t('INCOMPLETE — unknown or non-comparable links. No official best score.', '不明なつながりがあります。正式なベストスコアはつきません。')}</p>}
      <div className="score-strip"><div><span>{state.sessionKind === 'demo' ? t('DEMO LINKS', 'デモのつながり') : t('LINK SCORE', 'つながり')}</span><strong>{score.connectedCount}<small> / {score.knownPairCount}</small></strong><p>{t(`${score.knownPairCount} of 9 possible links known`, `９本中${score.knownPairCount}本が判定できた`)}</p></div><div><span>{t('BEST CHAIN', '最長のつながり')}</span><strong>{score.bestChain}<small>{t(score.bestChain === 1 ? ' link' : ' links', ' 本')}</small></strong><p>{t('Consecutive connected links', '連続してつながった数')}</p></div></div>
      <ol className="chain-list">{state.entries.map((entry, index) => <li key={entry.id}>
        {index > 0 && <div className={`chain-link ${score.links[index - 1].status}`}><span>{score.links[index - 1].status === 'connected' ? t('CONNECTED', 'つながった') : score.links[index - 1].status === 'broken' ? t('A DIFFERENT DIRECTION', 'ちがう道へ') : t('UNKNOWN LINK', 'まだわからない')}</span><span>{score.links[index - 1].status !== 'unknown' ? `${score.links[index - 1].fromLetter?.toUpperCase()} → ${score.links[index - 1].toLetter?.toUpperCase()}` : t('An intention was left unnamed', '名前のない絵がある')}</span></div>}
        <div className={`result-drawing actor-${entry.actor}`}><SketchThumbnail strokes={entry.strokes} label={t(`${entry.actor === 'girl' ? 'Her' : 'Your'} drawing: ${entry.intendedWord || 'unknown intention'}`, `${entry.actor === 'girl' ? 'しずく' : 'あなた'}の絵：${entry.intendedWord || '不明'}`)} /><div><p className="eyebrow">{entry.actor === 'girl' ? t('SHE DREW', 'しずくの絵') : t('YOU MEANT', 'あなたの絵')} · {entry.round}</p><h2>{entry.intendedWord || t('Unknown', 'わからない')}</h2>{entry.actor === 'player' && <p className="interpretation">{entry.recognition?.guess ? <>{entry.recognition.source === 'mock' ? t('Demo interpretation', 'デモの解釈') : t('She thought', 'しずくには')}: <strong>{entry.recognition.guess}</strong></> : entry.round === 5 ? t('Final drawing · not sent for recognition', '最後の絵は認識していません') : t('Her interpretation: unknown', 'しずくの解釈：不明')}</p>}</div></div>
      </li>)}</ol>
      <div className="result-end"><p className="tagline">{t('Perhaps we’ll see it differently next time.', '次は、ちがうふうに見えるかも。')}</p><button className="primary" onClick={start}>{t('ANOTHER WINDOW', 'もう一度遊ぶ')}<ArrowCounterClockwise size={20} /></button><button className="text-button" onClick={() => dispatch({ type: 'RETURN_TO_TITLE' })}>{t('Back to the beginning', '最初に戻る')}</button></div>
    </section>}

    {(info || leave) && <div className="modal-backdrop" onClick={() => { setInfo(false); setLeave(false); }}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') { setInfo(false); setLeave(false); }
      if (e.key === 'Tab') {
        const items = e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><button autoFocus className="icon-button close-dialog" aria-label={t('Close dialog', '閉じる')} onClick={() => { setInfo(false); setLeave(false); }}><X size={22} /></button>{leave ? <><p className="eyebrow">{t('TAKE YOUR TIME', 'まだ大丈夫')}</p><h2 id="dialog-title">{t('Close this window?', '窓を閉じる？')}</h2><p>{t('This unfinished chain will be lost.', '描きかけのしりとりは消えてしまうよ。')}</p><button className="primary" onClick={() => { setLeave(false); dispatch({ type: 'RETURN_TO_TITLE' }); }}>{t('RETURN TO TITLE', '最初に戻る')}</button><button className="text-button" onClick={() => setLeave(false)}>{t('Keep drawing', '続きを描く')}</button></> : <><p className="eyebrow">DRAWINDOW · v0.5</p><h2 id="dialog-title">{t('A conversation without words.', '言葉を使わない会話。')}</h2><p>{t('Look at her drawing. Think of its English name. Draw something beginning with its last letter.', 'しずくの絵に名前をつけて、最後の音から次の絵を描こう。ご→こ、ぎ→きのように濁点を外してもOK。「ん」で終わったら、新しい絵から再開するよ。')}</p><p>{t('Keep your interpretation to yourself. After five exchanges, name your own pictures and discover which of the nine links connected.', '途中で答えを言わないでね。５往復したら名前を明かして、９本のつながりを確かめよう。')}</p><p>{t('DAY & NIGHT change only the mood. There is no timer.', '昼と夜では雰囲気が変わるよ。時間制限はありません。')}</p><p>{t('DEMO uses simulated interpretations, not image recognition. Live API sends a neutral drawing image to a configured server; the character is never included.', 'デモは画像認識ではなく、決まった解釈を返します。LIVE APIでは絵だけを認識サーバーに送り、しずくの画像は送りません。')}</p><div className="credits"><p>{t('Character', 'キャラクター')}: OpenAI ImageGen<br />{t('Doodles', '絵')}: Quick, Draw! / Google, CC BY 4.0; DRAWINDOW original. {t('Fonts', 'フォント')}: DM Sans &amp; Cormorant Garamond, OFL.</p><MusicCredits /><a href="https://github.com/googlecreativelab/quickdraw-dataset" target="_blank" rel="noreferrer">Quick, Draw! dataset & attribution</a></div></>}</section></div>}
  </main>;
}
