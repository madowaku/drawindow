import { useState } from 'react';
import type { GamePhase, Mode } from '../core/types';
import { legacyGirlSketches as girlSketches } from '../data/legacySketches';
import { WindowCanvas } from '../components/WindowCanvas';
import { owlCandidate } from './readabilityCandidates';
import './V04Preview.css';

const download = (data: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'drawindow-readability-v04.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const focusWords = ['owl','dog','nose','queen','xylophone','yarn'];
function shuffledItems(all: boolean) {
  return [...girlSketches.filter(s => all || focusWords.includes(s.word)), owlCandidate]
    .map(s => ({ s, order: Math.random() })).sort((a,b) => a.order-b.order).map(x => x.s);
}

export function ReadabilityStudy() {
  const reviewer = new URLSearchParams(location.search).has('review');
  const [all, setAll] = useState(false);
  const [items, setItems] = useState(() => reviewer ? [...girlSketches,owlCandidate] : shuffledItems(false));
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('day');
  const [clear, setClear] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [phase, setPhase] = useState<GamePhase>('girl_drawing');
  const [replay, setReplay] = useState(0);
  const [slow, setSlow] = useState(false);
  const [guess, setGuess] = useState('');
  const [reason, setReason] = useState('');
  const [participant, setParticipant] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>[]>([]);
  const finished = index === items.length;
  const item = items[Math.min(index, items.length-1)];
  const displayStrokes = slow ? item.strokes.map(stroke => ({...stroke,points:stroke.points.map(point => ({...point,t:point.t*1500/(item.durationMs ?? 900)}))})) : item.strokes;
  const data = { version:'v0.4', scope:'Raw human observations; no automatic recognition or grading.', participant, complete:finished, answers };
  return <main className="app v04-preview" data-mode={mode}>
    <header className="topbar"><a href="?glass-preview">← 比較ページ</a><span>READABILITY STUDY</span></header>
    <h1>{reviewer ? '制作担当用レビュー' : '何の絵に見えますか。'}</h1>
    <p>{reviewer ? 'このページは制作上の意図を表示します。初見の人には review を付けないURLを渡してください。' : '答えの候補は表示しません。見えたものと、その理由をそのまま記録します。回答はこの画面だけで保持し、JSON保存で持ち出せます。'}</p>
    {reviewer && <label>制作サンプル<select value={item.id} onChange={e=>{setIndex(items.findIndex(s=>s.id===e.target.value));setPhase('girl_drawing');setReplay(replay+1);}}>{items.map(s=><option key={s.id} value={s.id}>{s.word}{s.id.includes('review')?' · 改善候補':''}</option>)}</select></label>}
    {!reviewer && !answers.length && <><label>参加者の記号（氏名は不要）<input value={participant} onChange={e => setParticipant(e.target.value)} /></label><button onClick={() => { setAll(!all); setItems(shuffledItems(!all)); setIndex(0); setReplay(replay+1); }}>セット：{all ? '全26枚＋候補' : '重点6枚＋候補'}</button></>}
    {!finished ? <>
      <p>図 {index+1} / {items.length}</p>
      <nav className="v04-controls">
        {(['day','night'] as Mode[]).map(m => <button key={m} aria-pressed={mode===m} onClick={() => setMode(m)}>{m.toUpperCase()}</button>)}
        <button aria-pressed={clear} onClick={() => setClear(!clear)}>{clear ? '白地' : '曇りガラス'}</button>
        <button aria-pressed={legacy} onClick={() => setLegacy(!legacy)}>{legacy ? '現在の線' : '拭き取り'}</button>
        <button onClick={() => { setPhase('girl_drawing'); setReplay(replay+1); }}>再生</button>
        <button aria-pressed={slow} onClick={() => { setSlow(!slow); setPhase('girl_drawing'); setReplay(replay+1); }}>{slow ? 'ゆっくり 1500ms' : '元の再生速度'}</button>
        <button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>動きを減らす</button>
      </nav>
      <div className="v04-window v04-single"><WindowCanvas key={`${index}-${replay}`} mode={mode} phase={phase} strokes={displayStrokes} variant={clear ? 'neutral' : 'glass'} glassStyle={legacy ? 'legacy' : 'tactile'} reducedMotion={reduced} onStrokesChange={() => {}} onBreathDone={() => {}} onPlaybackDone={() => setPhase('girl_holding')} /></div>
      {!reviewer && <form onSubmit={e => { e.preventDefault(); if(!guess.trim() || !reason.trim()) return; setAnswers([...answers,{ order:index+1, sampleId:item.id, target:item.word, guess:guess.trim(), reason:reason.trim(), mode, surface:clear?'clear':'fog', style:legacy?'legacy':'tactile', reducedMotion:reduced,playbackMs:slow?1500:item.durationMs ?? 900 }]); setIndex(index+1); setGuess(''); setReason(''); setPhase('girl_drawing'); }}>
        <label>何の絵？<input required value={guess} onChange={e => setGuess(e.target.value)} autoComplete="off" /></label>
        <label>そう思った理由<textarea required value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button className="primary" type="submit">記録して次へ</button>
      </form>}
    </> : <><p>記録完了。ここで初めて制作上の意図を確認できます。</p><ol>{answers.map((a,i) => <li key={i}>{String(a.guess)} — 意図：{String(a.target)} / {String(a.reason)}</li>)}</ol></>}
    {!reviewer && <div className="v04-controls"><button onClick={() => download(data)}>観察JSONを保存</button></div>}
  </main>;
}
