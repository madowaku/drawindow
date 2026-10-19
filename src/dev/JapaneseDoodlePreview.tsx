import { japaneseEverydayDoodles } from '../data/japaneseEverydayDoodles';
import { getBilingualV08Doodles } from '../data/bilingualV08Doodles';
import { useState } from 'react';
import type { Mode } from '../core/types';
import { firstLetter } from '../core/words';
import { girlSketches } from '../data/sketches';
import { localizeGirlSketches } from '../data/japaneseSketches';
import { japaneseExtraSketches } from '../data/japaneseExtraSketches';
import { japaneseDoodlePack } from '../data/japaneseDoodlePack';
import { japaneseClassicV02, japaneseClassicDoodles } from '../data/japaneseClassicDoodles';
import { SketchThumbnail } from '../components/SketchThumbnail';
import './JapaneseDoodlePreview.css';

const original = localizeGirlSketches(girlSketches, 'ja');
const bilingual = getBilingualV08Doodles('ja');
const additions = [...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles, ...bilingual];
const all = [...original, ...additions];
const previousClassic = new Map(japaneseClassicV02.map(sketch => [sketch.word, sketch]));
const syllables = [...new Set(all.map(sketch => firstLetter(sketch.word, 'ja') ?? ''))].sort((a, b) => a.localeCompare(b, 'ja'));

type ReviewMark = '採用' | '保留' | '再修正';
const reviewKey = 'drawindow-ja-doodle-review-v1';
function readMarks(): Record<string, ReviewMark> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(reviewKey) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, mark]) =>
      mark === '採用' || mark === '保留' || mark === '再修正'));
  } catch { return {}; }
}

export function JapaneseDoodlePreview() {
  const [mode, setMode] = useState<Mode>('day');
  const [showAnswers, setShowAnswers] = useState(false);
  const [compare, setCompare] = useState(true);
  const [scope, setScope] = useState<'classic' | 'everyday' | 'bilingual' | 'additions' | 'all'>('bilingual');
  const [syllable, setSyllable] = useState('all');
  const [single, setSingle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [position, setPosition] = useState(0);
  const [phoneWidth, setPhoneWidth] = useState(false);
  const [marks, setMarks] = useState(readMarks);
  const [storageFailed, setStorageFailed] = useState(false);
  function mark(id: string, value: ReviewMark) {
    const next = { ...marks };
    if (next[id] === value) delete next[id]; else next[id] = value;
    setMarks(next);
    try { localStorage.setItem(reviewKey, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }
  const visible = (scope === 'classic' ? japaneseClassicDoodles : scope === 'everyday' ? japaneseEverydayDoodles : scope === 'bilingual' ? bilingual : scope === 'additions' ? additions : all)
    .filter(sketch => syllable === 'all' || firstLetter(sketch.word, 'ja') === syllable);
  const current = Math.min(position, Math.max(0, visible.length - 1));
  const displayed = single ? visible.slice(current, current + 1) : visible;
  return <main className="ja-catalog" data-mode={mode} data-phone-width={phoneWidth} data-single={single} lang="ja">
    <header className="ja-catalog-header"><a href="/">← DRAWINDOW</a><span>SHIZUKU'S JAPANESE SKETCHBOOK</span></header>
    <h1>しずくの絵ことば帳。</h1>
    <p>しずくの手描き案を比較。最初は名前を隠して、何に見えるか、どちらがかわいいかを確かめよう。</p>
    <div className="ja-catalog-actions">
      <button aria-pressed={showAnswers} onClick={() => setShowAnswers(value => !value)}>{showAnswers ? '名前を隠す' : '名前を表示'}</button>
      <button aria-pressed={single} onClick={() => { setSingle(!single); setSettingsOpen(single); }}>{single ? '一覧で見る' : '1枚ずつ見る'}</button>
    </div>
    <details open={settingsOpen} onToggle={event => setSettingsOpen(event.currentTarget.open)}>
    <summary>表示設定・使い方</summary>
    <div className="ja-catalog-actions" role="group" aria-label="プレビュー設定">
      <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>☀ 昼</button>
      <button aria-pressed={mode === 'night'} onClick={() => setMode('night')}>☾ 夜</button>
      <button aria-pressed={compare} onClick={() => setCompare(value => !value)}>{compare ? '比較を閉じる' : '修正前後を比較'}</button>
      <button aria-pressed={scope === 'classic'} onClick={() => { setScope('classic'); setPosition(0); }}>定番16枚</button>
      <button aria-pressed={scope === 'everyday'} onClick={() => { setScope('everyday'); setPosition(0); }}>前回追加12枚</button>
      <button aria-pressed={scope === 'bilingual'} onClick={() => { setScope('bilingual'); setPosition(0); }}>昼夜・日英9枚</button>
      <button aria-pressed={scope === 'additions'} onClick={() => { setScope('additions'); setPosition(0); }}>追加分</button>
      <button aria-pressed={scope === 'all'} onClick={() => { setScope('all'); setPosition(0); }}>全部</button>
      <button aria-pressed={phoneWidth} onClick={() => setPhoneWidth(value => !value)}>360px幅</button>
      <label>はじまりの音 <select value={syllable} onChange={event => { setSyllable(event.target.value); setPosition(0); }}>
        <option value="all">すべて</option>
        {syllables.map(kana => <option key={kana} value={kana}>{kana}</option>)}
      </select></label>
    </div>
    <p className="ja-catalog-note">候補 {visible.length} 枚 · SAFE/SOFTは制作側の暫定評価で、初見の正答率ではありません。これは開発専用ページです。</p>
    <p className="ja-catalog-note">マークはこの端末だけに保存され、ゲーム内の採用状態は変わりません。同じボタンでもう一度押すと解除できます。</p>
    </details>
    {storageFailed && <p role="status">保存できないため、マークはこの画面を開いている間だけ保持します。</p>}
    {single && <nav className="ja-catalog-pager" aria-label="1枚ずつ確認">
      <button disabled={current === 0} onClick={() => setPosition(current - 1)}>前の絵</button>
      <span aria-live="polite">{visible.length ? current + 1 : 0} / {visible.length}</span>
      <button disabled={current >= visible.length - 1} onClick={() => setPosition(current + 1)}>次の絵</button>
    </nav>}
    {!visible.length && <p role="status">この条件の絵はありません。</p>}
    <section data-single={single} className="ja-catalog-grid" data-comparing={compare && scope === 'classic'} aria-label="絵ことば一覧">
      {displayed.map((sketch, displayIndex) => {
        const index = single ? current : displayIndex;
        const before = compare && scope === 'classic' ? previousClassic.get(sketch.word) : undefined;
        return <article className="ja-catalog-card" key={sketch.id}>
          {before ? <div className="ja-catalog-compare">
            <div><SketchThumbnail strokes={before.strokes} label={showAnswers ? `修正前：${sketch.word}` : `修正前の絵 ${index + 1}`} /><span>修正前</span></div>
            <div><SketchThumbnail strokes={sketch.strokes} label={showAnswers ? `修正後：${sketch.word}` : `修正後の絵 ${index + 1}`} /><span>修正後</span></div>
          </div> : <SketchThumbnail strokes={sketch.strokes} label={showAnswers ? `しずくの絵：${sketch.word}` : `しずくの絵 ${index + 1}`} />}
          <span className="ja-catalog-index">#{String(index + 1).padStart(2, '0')}</span>
          {before && <small>{before.id === sketch.id ? '今回の変更なし' : '今回の修正候補'}</small>}
          <div className="ja-catalog-marks" role="group" aria-label={`絵 ${index + 1} の評価`}>
            {(['採用', '保留', '再修正'] as const).map(value => <button key={value}
              aria-pressed={marks[sketch.id] === value} onClick={() => mark(sketch.id, value)}>{value}</button>)}
          </div>
          {showAnswers && <><strong>{sketch.word}</strong><small>{sketch.readability ?? 'safe'} · {sketch.id}</small></>}
        </article>;
      })}
    </section>
  </main>;
}
