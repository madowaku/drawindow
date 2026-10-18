import { useState } from 'react';
import type { GamePhase, Mode, Stroke } from '../core/types';
import { girlSketches } from '../data/sketches';
import { WindowCanvas } from '../components/WindowCanvas';
import './V04Preview.css';

export function GlassPreview() {
  const [mode, setMode] = useState<Mode>('day');
  const [strokes, setStrokes] = useState<readonly Stroke[]>(girlSketches[0].strokes);
  const [phase, setPhase] = useState<GamePhase>('player_drawing');
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  return <main className="app v04-preview" data-mode={mode}>
    <header className="topbar"><a href="/">← DRAWINDOW</a><span>GLASS STUDY · v0.4</span></header>
    <h1>指で、曇りをほどく。</h1><p>同じ筆跡を2枚の窓で比較。どちらに描いても両方に映ります。</p>
    <nav className="v04-controls" aria-label="Comparison controls">
      {(['day','night'] as Mode[]).map(value => <button key={value} aria-pressed={value === mode} onClick={() => setMode(value)}>{value.toUpperCase()}</button>)}
      <button onClick={() => { setStrokes([]); setPhase('player_drawing'); }}>CLEAR</button>
      <button disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0,-1))}>UNDO</button>
      <button onClick={() => { setStrokes(girlSketches[0].strokes); setPhase('girl_drawing'); }}>再生</button>
      <button onClick={() => setPhase('player_drawing')}>指で描く</button>
      <button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>動きを減らす</button>
    </nav>
    <section className="v04-pair">{(['legacy','tactile'] as const).map(style => <article key={style}>
      <h2>{style === 'legacy' ? 'A · 現在の黒い線' : 'B · 拭き取る曇り'}</h2>
      <div className="v04-window" data-comparison={style}><WindowCanvas mode={mode} phase={phase} strokes={strokes} glassStyle={style} reducedMotion={reduced} onStrokesChange={setStrokes} onBreathDone={() => {}} onPlaybackDone={() => setPhase('girl_holding')} /></div>
    </article>)}</section>
    <p>髪・顔・服・背景をまたぐ線をお試しください。CLEAR / UNDOは両方の窓へ反映されます。これは描き味の比較用で、認識APIを呼びません。</p>
    <p><a href="?catalogue-preview">絵の判読性を確認</a> · <a href="?character-preview">しずくの画像を比較</a></p>
  </main>;
}
