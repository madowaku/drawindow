import { useState } from 'react';
import type { DoodleCandidate, GamePhase, Mode } from '../core/types';
import { doodleCandidates, doodleLibrary, DOODLE_LETTERS, PRIORITY_LETTERS } from '../data/doodleLibrary';
import { WindowCanvas } from '../components/WindowCanvas';
import { DoodleThumbnail } from './DoodleThumbnail';
import './DoodleCatalog.css';

export function CataloguePreview() {
  const [mode, setMode] = useState<Mode>('day');
  const [words, setWords] = useState(new URLSearchParams(location.search).has('review'));
  const [readability, setReadability] = useState(true);
  const [fog, setFog] = useState(true);
  const [safeOnly, setSafeOnly] = useState(false);
  const [letter, setLetter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(doodleCandidates[0].id);
  const [phase, setPhase] = useState<GamePhase>('girl_holding');
  const [replay, setReplay] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const items = doodleCandidates.filter(candidate => (letter === 'ALL' || candidate.letter === letter) && (!safeOnly || candidate.readability === 'safe'));
  // Derive selection when filters hide the chosen card; an empty filter is valid.
  const selected = items.find(candidate => candidate.id === selectedId) ?? items[0];
  const choose = (id: string) => { setSelectedId(id); setPhase('girl_holding'); setReplay(value => value + 1); };
  const badge = (candidate: DoodleCandidate) => readability && <span className="doodle-badge" data-testid="readability-badge" data-rating={candidate.readability}>{candidate.readability.toUpperCase()}</span>;
  const toggle = (name: string, value: boolean, action: () => void, text: string) => <button aria-label={name} aria-pressed={value} onClick={action}>{text} <span>{value ? 'ON' : 'OFF'}</span></button>;

  return <main className="app doodle-catalog" data-mode={mode}>
    <header className="doodle-masthead"><a href="/">← DRAWINDOW</a><span>SHIZUKU'S SKETCHBOOK / 01</span><a href="?readability-study">ブラインド観察 →</a></header>
    <div className="doodle-title"><div><p className="doodle-eyebrow">SHIZUKU DOODLE LIBRARY · v0.1</p><h1>Doodle catalog<span>曇り窓の、小さな絵たち。</span></h1></div><p className="doodle-total"><strong>{doodleCandidates.length}</strong> candidates<br />26 letters</p></div>
    <p className="doodle-intro">ひとつの文字に、いくつかの描き方を。絵を選ぶと、大きな窓で線と再生を見比べられます。</p>
    <div className="doodle-toolbar" aria-label="カタログの表示設定">
      <div className="doodle-mode">{(['day', 'night'] as Mode[]).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value.toUpperCase()}</button>)}</div>
      {toggle('word表示', words, () => setWords(!words), 'word')}
      {toggle('readability表示', readability, () => setReadability(!readability), 'readability')}
      {toggle('曇りガラス越し', fog, () => setFog(!fog), '曇りガラス')}
      {toggle('SAFEのみ表示', safeOnly, () => setSafeOnly(!safeOnly), 'SAFEのみ')}
      <label className="doodle-letter-filter">文字で絞る<select value={letter} onChange={event => { setLetter(event.target.value); setPhase('girl_holding'); }}><option value="ALL">A–Z / すべて</option>{DOODLE_LETTERS.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <p className="doodle-policy">SAFE＝形の手掛かりが明確 · SOFT＝別の読みもある · SPICY＝誤読リスク大 · REJECT＝選択対象外。制作側の暫定評価です。初見の正答率を示すものではありません。</p>
    {selected ? <section className="doodle-inspector" aria-label="選んだ絵のプレビュー">
      <div className="doodle-window"><WindowCanvas key={`${selected.id}-${replay}`} mode={mode} phase={phase} strokes={selected.strokes} variant={fog ? 'glass' : 'neutral'} reducedMotion={reducedMotion} onStrokesChange={() => {}} onBreathDone={() => {}} onPlaybackDone={() => setPhase('girl_holding')} /></div>
      <div className="doodle-inspector-copy"><p className="doodle-eyebrow">ON THE WINDOW</p><h2>{selected.letter}<span>{words ? selected.word : 'ことばを伏せて、形を見る。'}</span></h2>
        {badge(selected)}<label className="doodle-sample-label">制作サンプル<select value={selected.id} onChange={event => choose(event.target.value)}>{items.map((candidate, index) => <option key={candidate.id} value={candidate.id}>{words ? `${candidate.letter} · ${candidate.word} · ${candidate.id}` : `${candidate.letter} · 候補 ${index + 1}`}</option>)}</select></label>
        {words && <><p className="doodle-review-note">{selected.reviewNote}</p><p className="doodle-source">{selected.source.attribution}<br /><code>{selected.id}</code></p></>}
        <button className="doodle-replay" onClick={() => { setPhase('girl_drawing'); setReplay(value => value + 1); }}>線を再生する ↻</button>
        <button className="doodle-replay doodle-motion" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>動きを減らす</button>
        <p className="doodle-selection-note">ゲームはSAFEを優先し、同じ単語が続くのを避けます。SAFEがない文字はSOFTを使います。SPICY・REJECTは自動選択しません。</p>
      </div>
    </section> : <p className="doodle-empty" role="status">この条件の候補はありません。</p>}
    <div className="doodle-index-heading"><h2>A little library</h2><span aria-live="polite">{items.length} / {doodleCandidates.length} 候補</span></div>
    <nav className="doodle-alphabet" aria-label="文字の一覧"><button aria-pressed={letter === 'ALL'} onClick={() => { setLetter('ALL'); setPhase('girl_holding'); }}>ALL</button>{DOODLE_LETTERS.map(value => <button key={value} aria-pressed={letter === value} onClick={() => { setLetter(value); setPhase('girl_holding'); }}>{value}</button>)}</nav>
    <div className="doodle-groups" data-filtered={letter !== 'ALL'}>{DOODLE_LETTERS.map(value => {
      const candidates = items.filter(candidate => candidate.letter === value);
      return candidates.length > 0 && <section className="doodle-group" key={value} aria-label={`${value}の候補`}><div className="doodle-group-heading"><h3>{value}</h3><span>{PRIORITY_LETTERS.includes(value) ? '重点レビュー · ' : ''}{candidates.length} / {doodleLibrary[value].length}</span></div><div className="doodle-cards">{candidates.map((candidate, index) => <button key={candidate.id} className="doodle-card" data-testid="doodle-card" data-readability={candidate.readability} aria-pressed={selected?.id === candidate.id} aria-label={`${value}の候補 ${index + 1}${words ? ` · ${candidate.word}` : ''}`} onClick={() => choose(candidate.id)}>
        <div className="doodle-card-image"><DoodleThumbnail strokes={candidate.strokes} mode={mode} fog={fog} /></div><div className="doodle-card-caption"><span className="doodle-card-word">{words ? candidate.word : `${value} / ${String(index + 1).padStart(2, '0')}`}</span>{badge(candidate)}</div><small>{candidate.source.kind === 'original' ? 'ORIGINAL' : 'QUICK, DRAW!'}</small>
      </button>)}</div></section>;
    })}</div>
    <footer className="doodle-footer"><span>線も、読み方も、少しずつ。</span><a href="?readability-study">答えを伏せた自由回答の記録はこちら →</a><p>制作レビュー専用。word OFFの一覧は、ブラインド観察の代わりにはなりません。</p></footer>
  </main>;
}
