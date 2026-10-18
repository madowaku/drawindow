import { useState } from 'react';
import type { Mode } from '../core/types';
import { firstLetter } from '../core/words';
import { girlSketches } from '../data/sketches';
import { localizeGirlSketches } from '../data/japaneseSketches';
import { japaneseExtraSketches } from '../data/japaneseExtraSketches';
import { japaneseDoodlePack } from '../data/japaneseDoodlePack';
import { japaneseClassicDoodles } from '../data/japaneseClassicDoodles';
import { SketchThumbnail } from '../components/SketchThumbnail';
import './JapaneseDoodlePreview.css';

const original = localizeGirlSketches(girlSketches, 'ja');
const additions = [...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles];
const all = [...original, ...additions];
const syllables = [...new Set(all.map(sketch => firstLetter(sketch.word, 'ja') ?? ''))].sort((a, b) => a.localeCompare(b, 'ja'));

export function JapaneseDoodlePreview() {
  const [mode, setMode] = useState<Mode>('day');
  const [showAnswers, setShowAnswers] = useState(false);
  const [scope, setScope] = useState<'classic' | 'additions' | 'all'>('classic');
  const [syllable, setSyllable] = useState('all');
  const visible = (scope === 'classic' ? japaneseClassicDoodles : scope === 'additions' ? additions : all)
    .filter(sketch => syllable === 'all' || firstLetter(sketch.word, 'ja') === syllable);
  return <main className="ja-catalog" data-mode={mode} lang="ja">
    <header className="ja-catalog-header"><a href="/">← DRAWINDOW</a><span>SHIZUKU'S JAPANESE SKETCHBOOK</span></header>
    <h1>しずくの絵ことば帳。</h1>
    <p>定番16枚からブラインドで確認。名前を隠して見て、伝わらなかった絵は直そう。</p>
    <div className="ja-catalog-actions" role="group" aria-label="プレビュー設定">
      <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>☀ 昼</button>
      <button aria-pressed={mode === 'night'} onClick={() => setMode('night')}>☾ 夜</button>
      <button aria-pressed={showAnswers} onClick={() => setShowAnswers(value => !value)}>{showAnswers ? '名前を隠す' : '名前を表示'}</button>
      <button aria-pressed={scope === 'classic'} onClick={() => setScope('classic')}>定番16枚</button>
      <button aria-pressed={scope === 'additions'} onClick={() => setScope('additions')}>追加分</button>
      <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>全部</button>
      <label>はじまりの音 <select value={syllable} onChange={event => setSyllable(event.target.value)}>
        <option value="all">すべて</option>
        {syllables.map(kana => <option key={kana} value={kana}>{kana}</option>)}
      </select></label>
    </div>
    <p className="ja-catalog-note">候補 {visible.length} 枚 · SAFE/SOFTは制作側の暫定評価で、初見の正答率ではありません。これは開発専用ページです。</p>
    <section className="ja-catalog-grid" aria-label="絵ことば一覧">
      {visible.map((sketch, index) => <article className="ja-catalog-card" key={sketch.id}>
        <SketchThumbnail strokes={sketch.strokes} label={showAnswers ? `しずくの絵：${sketch.word}` : `しずくの絵 ${index + 1}`} />
        <span className="ja-catalog-index">#{String(index + 1).padStart(2, '0')}</span>
        {showAnswers && <><strong>{sketch.word}</strong><small>{sketch.readability ?? 'safe'} · {sketch.id}</small></>}
      </article>)}
    </section>
  </main>;
}
