import { useEffect, useRef, useState } from 'react';
import type { Language, Stroke } from '../core/types';
import { WindowCanvas } from '../components/WindowCanvas';
import { compareFreehand, freehandExport, freehandCsv, type FreehandSample, type FreehandJudgement } from './freehandComparison';
import { validDrawing } from './recognitionBenchmark';

export function FreehandRecognition() {
  const [intent, setIntent] = useState(''), [language, setLanguage] = useState<Language>('ja');
  const [partition, setPartition] = useState<FreehandSample['partition']>('development');
  const [provenance, setProvenance] = useState<FreehandSample['provenance']>('unverified');
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [samples, setSamples] = useState<FreehandSample[]>([]), [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [error, setError] = useState('');
  const types = useRef<string[]>([]), sending = useRef(false);
  const consentNow = useRef(false), consentGeneration = useRef(0);
  useEffect(() => { const unload = (e: BeforeUnloadEvent) => { if (samples.length || strokes.length) e.preventDefault(); }; window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload); }, [samples.length, strokes.length]);
  const compare = async () => {
    if (sending.current || done) return;
    sending.current = true; setBusy(true); setError('');
    const consentAtSubmission = consentNow.current, generationAtSubmission = consentGeneration.current;
    try {
      const result = await compareFreehand(strokes, language);
      setSamples(previous => [...previous, { id: previous.length + 1, intent, language, provenance, partition, inputTypes: [...types.current], ...result, ...(consentAtSubmission && consentNow.current && generationAtSubmission === consentGeneration.current ? { strokes: structuredClone(strokes) } : {}) }]); setDone(true);
    } catch { setError('比較を完了できませんでした。絵は残っています。もう一度試せます。'); }
    finally { sending.current = false; setBusy(false); }
  };
  const judge = (sample: number, variant: string, key: 'judgement' | 'top3MatchesIntent', value: FreehandJudgement | boolean | null) => setSamples(old => old.map(s => s.id === sample ? { ...s, variants: s.variants.map(v => v.id === variant ? { ...v, [key]: value } : v) } : s));
  const download = (extension: 'json' | 'csv') => {
    const text = extension === 'json' ? JSON.stringify(freehandExport(samples, consent), null, 2) : freehandCsv(samples);
    const url = URL.createObjectURL(new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `DRAWINDOW-v013-freehand.${extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-label="自由描画の診断">
    <h2>しずくは何を見た？ · 自由描画</h2>
    <p>先に描くつもりの物を記録します。言葉は認識モデルに渡しません。同じ筆跡で6条件を順に比較します。スコアは正解確率ではありません。</p>
    <div className="benchmark-setup">
      <label>描くつもりの物<input aria-label="描くつもりの物" maxLength={120} disabled={busy || done} value={intent} onChange={e => setIntent(e.target.value)}/></label>
      <label>認識の言語<select disabled={busy || done} value={language} onChange={e => setLanguage(e.target.value as Language)}><option value="ja">日本語</option><option value="en">English</option></select></label>
      <label>評価データ<select disabled={busy || done} value={partition} onChange={e => setPartition(e.target.value as FreehandSample['partition'])}><option value="development">改善・探索用</option><option value="holdout">最終評価用（改善に再利用しない）</option></select></label>
      <label>入力の出所<select disabled={busy || done} value={provenance} onChange={e => setProvenance(e.target.value as FreehandSample['provenance'])}><option value="unverified">未確認（認識率の集計から除外）</option><option value="human">いま人間が新しく描く</option><option value="synthetic">合成・自動入力（集計から除外）</option></select></label>
    </div>
    <div className="benchmark-workspace"><div>
      <div className="benchmark-canvas-frame"><WindowCanvas variant="neutral" mode="day" language={language} phase={busy || done ? 'recognizing' : 'player_drawing'} strokes={strokes} onStrokesChange={setStrokes} onInputTypeChange={type => { if (!types.current.includes(type)) types.current.push(type); }} onBreathDone={() => {}} onPlaybackDone={() => {}} reducedMotion /></div>
      <p>{types.current.join(' / ') || '入力方法は描画時に記録します'}</p>
      <label className="stroke-consent"><input type="checkbox" checked={consent} onChange={e => { consentNow.current = e.target.checked; consentGeneration.current++; setConsent(e.target.checked); if (!e.target.checked) setSamples(old => old.map(({ strokes: _strokes, ...sample }) => sample)); }}/> 比較時に筆跡を保持してJSONに含める（任意・自動送信なし。解除すると破棄）</label>
      <div className="benchmark-controls"><button disabled={busy || done} onClick={() => setStrokes([])}>CLEAR</button><button disabled={busy || done} onClick={() => setStrokes(old => old.slice(0, -1))}>UNDO</button>
      <button className="benchmark-primary" disabled={busy || done || !intent.trim() || !validDrawing(strokes)} onClick={() => void compare()}>同じ絵を6条件で比較</button></div>
      {error && <p role="alert">{error}</p>}<p role="status">{busy ? '端末内で順に比較中…' : done ? '結果を残しました。各条件を人間が評価してください。' : '描き終えたら比較します。自動再試行はありません。'}</p>
      <button disabled={busy || !done} onClick={() => { setStrokes([]); setIntent(''); setDone(false); types.current = []; }}>次の自由描画へ</button>
    </div><div>{samples.at(-1)?.variants.map(v => <article className="benchmark-result" key={v.id}><h3>{v.id}</h3><p>Top1: {v.top3[0]?.label ?? '—'} · 採用語: {v.result.guess ?? '不明'}<br/>原因: {v.result.failureReason ?? (v.nextDrawingAvailable === false ? 'uncovered_letter' : 'なし')} · {v.elapsedMs.toFixed(1)} ms</p>
      <p>モデル準備: {samples.at(-1)!.loadMs.toFixed(1)} ms（6条件の前に1回）</p>
      <ul>{v.top3.map(c => <li key={c.label}>{c.label} · {c.score.toFixed(4)} · {c.japanese ?? '日本語未対応'}</li>)}</ul>
      <p>次の絵: {v.nextDrawingAvailable === null ? '認識語なし' : v.nextDrawingAvailable ? 'あり（完走の証拠ではありません）' : 'なし'}</p>
      <label>人間の納得度<select aria-label={`納得度 ${v.id}`} value={v.judgement ?? ''} onChange={e => judge(samples.at(-1)!.id, v.id, 'judgement', e.target.value as FreehandJudgement || null)}><option value="">未評価</option>{(v.result.guess ? [['exact', '意図どおり'], ['plausible_alternative', '違う物だが納得できる'], ['unrelated', '意味のわからない誤認識']] : [['abstain_or_error', '認識不能・実行エラー']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Top3に意図した物がある<select aria-label={`Top3 ${v.id}`} value={v.top3MatchesIntent === null ? '' : String(v.top3MatchesIntent)} onChange={e => judge(samples.at(-1)!.id, v.id, 'top3MatchesIntent', e.target.value === '' ? null : e.target.value === 'true')}><option value="">未確認</option><option value="true">はい</option><option value="false">いいえ</option></select></label>
    </article>)}</div></div>
    <p>{samples.length}枚の独立した絵を記録（6条件を6枚には数えません）。記録はメモリ内のみ。終了前に保存してください。</p>
    <div className="benchmark-controls"><button disabled={busy} onClick={() => download('json')}>自由描画JSON</button><button disabled={busy} onClick={() => download('csv')}>自由描画CSV</button></div>
  </section>;
}

