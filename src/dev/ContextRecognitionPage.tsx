import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language, Stroke } from '../core/types';
import { WindowCanvas } from '../components/WindowCanvas';
import { CharacterScene } from '../components/CharacterScene';
import { gameSketches } from '../data/gameSketches';
import { inferContextDrawing, MODEL_METADATA } from './contextRecognition/inference';
import { compareContextRecognition, DEFAULT_CONTEXT_CONFIG } from './contextRecognition/policies';
import { evaluateComparison, exportComparisonsJson, summarizeComparisons } from './contextRecognition/evaluation';
import type { ContextConfig, EvaluationInput, EvaluatedComparison } from './contextRecognition/types';
import './ContextRecognitionPage.css';

type Inference = typeof inferContextDrawing;
type FrozenSample = Awaited<ReturnType<Inference>> & { requestId: string; drawingId: string; language: Language; previousWord: string; participant: string; inputTypes: string[]; contextWasHidden: boolean };
type SavedSetting = { sample: Omit<FrozenSample, 'candidates' | 'baseline'>; expression: string; result: EvaluatedComparison };

function download(records: readonly SavedSetting[], format: 'json' | 'csv') {
  // Both the policy exporter and this metadata projection are explicit whitelists. Geometry is never retained.
  const safe = records.map(({ sample, expression, result }, index) => ({
    sampleId: sample.requestId, drawingId: sample.drawingId, participant: sample.participant, language: sample.language,
    previousWord: sample.previousWord, inputTypes: sample.inputTypes.join('|'), inferenceMs: sample.inferenceMs,
    model: MODEL_METADATA, contextWasHidden: sample.contextWasHidden, expression, settingIndex: index + 1,
    result: JSON.parse(exportComparisonsJson([result])),
  }));
  const quote = (value: unknown) => {
    const raw = String(value ?? '');
    const safeCell = /^[\s]*[=+\-@]|^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safeCell.replace(/"/g, '""')}"`;
  };
  const body = format === 'json' ? JSON.stringify({ schema: 'drawindow-context-v010', records: safe }, null, 2)
    : '\uFEFF' + ['sampleId,drawingId,participant,language,previousWord,inputTypes,inferenceMs,model,contextWasHidden,expression,settingIndex,resultJson', ...safe.map(row => Object.values(row).map(value => quote(typeof value === 'object' ? JSON.stringify(value) : value)).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `DRAWINDOW-context-${Date.now()}.${format}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ContextRecognitionPage({ infer = inferContextDrawing }: { infer?: Inference }) {
  const [language, setLanguage] = useState<Language>('ja');
  const [previousWord, setPreviousWord] = useState('りんご');
  const [hidePrevious, setHidePrevious] = useState(false);
  const [participant, setParticipant] = useState('P01');
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [sample, setSample] = useState<FrozenSample | null>(null);
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<ContextConfig>({ ...DEFAULT_CONTEXT_CONFIG });
  const [evaluation, setEvaluation] = useState<EvaluationInput>({});
  const [goldMode, setGoldMode] = useState('unknown');
  const [expression, setExpression] = useState<'off' | 'neutral' | 'thinking' | 'curious'>('off');
  const [records, setRecords] = useState<SavedSetting[]>([]);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const inputTypes = useRef<string[]>([]);
  const busy = useRef(false);
  const attemptedRef = useRef(false);
  const comparison = useMemo(() => sample ? compareContextRecognition({ language: sample.language, previousWord: sample.previousWord, candidates: sample.candidates, failure: sample.baseline.guess ? undefined : sample.baseline }, config) : null, [sample, config]);
  const assessed = useMemo(() => comparison ? evaluateComparison(comparison, evaluation, gameSketches(comparison.language)) : null, [comparison, evaluation]);
  const summary = useMemo(() => {
    const groups = new Map<string, Map<string, EvaluatedComparison>>();
    for (const record of records) {
      const key = JSON.stringify({ config: record.result.comparison.config, language: record.sample.language, previousWord: record.sample.previousWord });
      const samples = groups.get(key) ?? new Map<string, EvaluatedComparison>();
      // A later save of this sample/settings updates its evaluation, rather than adding another human sample.
      samples.set(`${record.sample.participant}:${record.sample.drawingId}`, record.result); groups.set(key, samples);
    }
    return Array.from(groups, ([settings, samples]) => ({ settings: JSON.parse(settings), uniqueSamples: samples.size, summary: summarizeComparisons([...samples.values()]) }));
  }, [records]);

  useEffect(() => () => { generation.current += 1; controller.current?.abort(); }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (strokes.length || records.length) event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [strokes.length, records.length]);
  const invalidate = () => {
    generation.current += 1; controller.current?.abort(); busy.current = false; attemptedRef.current = false;
    setPending(false); setAttempted(false); setSample(null); setError(''); setEvaluation({}); setGoldMode('unknown');
  };
  const draw = (next: readonly Stroke[]) => { invalidate(); setStrokes(next); };
  const run = async () => {
    if (busy.current || attemptedRef.current || !strokes.some(stroke => stroke.points.length > 0) || !/^[A-Za-z0-9_-]{1,24}$/.test(participant)) return;
    busy.current = true; attemptedRef.current = true; setAttempted(true); setPending(true); setError('');
    const ticket = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    const requestId = `context-${Date.now()}-${ticket}`;
    const frozen = { requestId, language, previousWord, participant, inputTypes: [...inputTypes.current], contextWasHidden: hidePrevious };
    try {
      const geometry = new TextEncoder().encode(JSON.stringify(strokes.map(stroke => stroke.points.map(point => [point.x, point.y]))));
      const [result, digest] = await Promise.all([
        infer({ requestId, language, strokes }, { signal: abort.signal }),
        crypto.subtle.digest('SHA-256', geometry),
      ]);
      if (ticket !== generation.current) return;
      const drawingId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      setSample({ ...result, ...frozen, drawingId, candidates: result.candidates.map(candidate => ({ label: candidate.label, score: candidate.score })) });
    } catch {
      if (ticket === generation.current) setError('推論できませんでした。新しい描画で再試行できます。自動再試行はしません。');
    } finally {
      if (ticket === generation.current) { busy.current = false; setPending(false); }
    }
  };
  const save = () => {
    if (!sample || !assessed) return;
    const { requestId, drawingId, language: frozenLanguage, previousWord: frozenWord, participant: frozenParticipant, inputTypes: frozenTypes, inferenceMs, contextWasHidden } = sample;
    setRecords(previous => [...previous, { sample: { requestId, drawingId, language: frozenLanguage, previousWord: frozenWord, participant: frozenParticipant, inputTypes: [...frozenTypes], inferenceMs, contextWasHidden }, expression, result: structuredClone(assessed) }]);
  };

  return <main className="context-lab">
    <header className="context-lab-header"><a href="/">DRAWINDOW.</a><span>LOCAL LAB / v0.10</span></header>
    <section className="context-lab-intro"><p className="context-lab-eyebrow">ONE DRAWING · THREE READINGS</p><h1>線と、ひとつ前のことば。</h1><p>同じ絵の認識を、文脈の使い方だけ変えて比べます。モデル推論は一度だけ。補正値は未較正の研究用設定です。</p><p className="context-lab-note">この端末内で処理・記録します。氏名やメールは入力しないでください。記録はメモリー内だけです。閉じる・再読込で失われます。保存は明示したJSON / CSVのみ。描画座標・画像は書き出しません。</p></section>
    <div className="context-lab-workspace">
      <section className="context-lab-drawing" aria-label="描画と入力">
        <div className="context-lab-setup">
          <label>匿名コード<input aria-label="匿名コード" value={participant} maxLength={24} onChange={event => { invalidate(); setParticipant(event.target.value); }} /></label>
          <label>言語<select aria-label="言語" value={language} onChange={event => { invalidate(); setLanguage(event.target.value as Language); }}><option value="ja">日本語</option><option value="en">English</option></select></label>
          <div className="context-lab-previous"><label className="context-lab-checkbox"><input type="checkbox" checked={hidePrevious} onChange={event => setHidePrevious(event.target.checked)} />描き手に正式名を隠す</label>{hidePrevious ? <p className="context-lab-note">正式名は非表示です。担当者が設定してから画面を渡してください。直前の絵は名前を伏せて別に提示します。</p> : <label>直前のしずくの正式名<input aria-label="直前のしずくの正式名" value={previousWord} maxLength={80} onChange={event => { invalidate(); setPreviousWord(event.target.value); }} /></label>}</div>
        </div>
        <p className="context-lab-note">正式名から語頭を予測します。描き手が同じ名前を思ったかは、結果のあとで別に記録します。</p>
        <div className="context-lab-canvas"><WindowCanvas variant="neutral" language={language} mode="day" phase="player_drawing" strokes={strokes} onStrokesChange={draw} onInputTypeChange={type => { if (!inputTypes.current.includes(type)) inputTypes.current.push(type); }} onBreathDone={() => {}} onPlaybackDone={() => {}} reducedMotion /></div>
        <div className="context-lab-actions"><button onClick={() => { draw([]); inputTypes.current = []; }}>消して新しく描く</button><button aria-label="一度だけ認識する" className="context-lab-primary" onClick={run} disabled={pending || attempted || !strokes.some(stroke => stroke.points.length > 0) || !/^[A-Za-z0-9_-]{1,24}$/.test(participant)}>{pending ? '端末内で認識中…' : '一度だけ認識する'}</button></div>
        {!/^[A-Za-z0-9_-]{1,24}$/.test(participant) && <p role="alert">匿名コードは英数字・ハイフン・アンダースコアの1〜24文字にしてください。</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      <aside className="context-lab-controls">
        <fieldset><legend>C / 画像を主体にした補正</legend>
          <label>方式<select aria-label="C 方式" value={config.variant} onChange={event => setConfig({ ...config, variant: event.target.value as ContextConfig['variant'] })}><option value="gap">順位とスコア差のガード</option><option value="bonus">ガード内で小さく加算</option></select></label>
          <label>最大順位<input aria-label="C 最大順位" type="number" min="1" max="5" value={config.maxRank} onChange={event => setConfig({ ...config, maxRank: Math.max(1, Math.min(5, Number(event.target.value) || 1)) })} /></label>
          <label>最大スコア差<input aria-label="C 最大スコア差" type="number" min="0" max="0.08" step="0.01" value={config.maxGap} onChange={event => setConfig({ ...config, maxGap: Math.max(0, Math.min(.08, Number(event.target.value))) })} /></label>
          <label>補正の強さ<input aria-label="C 補正の強さ" type="number" min="0" max="0.08" step="0.01" value={config.strength} onChange={event => setConfig({ ...config, strength: Math.max(0, Math.min(.08, Number(event.target.value))) })} /></label>
          <p className="context-lab-note">上限はTop 5・差と強さ0.08。設定変更は固定した全345候補を再利用します。加算後の値も、正解の確率ではありません。</p>
        </fieldset>
        <fieldset><legend>表情だけを比較</legend><label>表示<select aria-label="表情だけを比較" value={expression} onChange={event => setExpression(event.target.value as typeof expression)}><option value="off">なし</option><option value="neutral">いつもの表情</option><option value="thinking">考える</option><option value="curious">気になる</option></select></label><p className="context-lab-note">認識から独立した静止プレビューです。選択は推論・補正に影響しません。</p>{expression !== 'off' && <div className="context-lab-expression"><CharacterScene mode="day" phase="player_drawing" reducedMotion frameOverride={expression} /></div>}</fieldset>
      </aside>
    </div>
    {comparison && sample && assessed && <section className="context-lab-results" aria-label="同じ推論の比較結果">
      <div className="context-lab-result-heading"><h2>ひとつの絵、3つの解釈</h2><span>{sample.inferenceMs.toFixed(1)} ms / 語頭の仮説: {comparison.expectedFirst ?? '不明'} / {sample.requestId}</span></div>
      <div className="context-lab-cards">{(['A', 'B', 'C'] as const).map(policy => { const value = comparison.selections[policy]; const score = assessed.policies[policy]; return <article key={policy} data-testid={`policy-${policy}`}><p className="context-lab-eyebrow">{policy} / {policy === 'A' ? 'v0.9の画像認識' : policy === 'B' ? '文脈を強く優先 · Top 10' : '画像主体の小さな補正'}</p><h3>{value.unknown ? 'unknown' : value.result.guess}</h3><p>元順位 {value.selectedRank ?? '—'} · {value.selectedLabel ?? '—'}<br />{value.reason}</p><p className="context-lab-note">補正 {value.correctionMs.toFixed(2)} ms<br />意味の正解: {score.exactClassMatch === null ? '未評価' : score.exactClassMatch ? '一致' : '不一致'} / 読み: {score.readingMatch === null ? '未評価' : score.readingMatch ? '一致' : '不一致'}<br />文字上の継続: {score.lexicalContinuation ? '可能' : '不可'} / 次の見本: {score.templateExists ? 'あり' : 'なし'}<br />対応外の棄却: {score.outOfVocabularyAbstained === null ? '未評価' : score.outOfVocabularyAbstained ? 'unknownを保持' : '既知分類を回答'}<br />Aとの比較: {score.relativeToA}</p></article>; })}</div>
      <details><summary>生候補の全順位・未較正スコア ({comparison.candidates.length})</summary><div className="context-lab-ranks"><table><thead><tr><th>順位</th><th>モデル分類</th><th>名前</th><th>スコア</th><th>語頭</th></tr></thead><tbody>{comparison.candidates.map(item => <tr key={item.label}><td>{item.rank}</td><td>{item.label}</td><td>{item.word ?? '対応外'}</td><td>{item.score.toFixed(5)}</td><td>{item.contextMatch ? '一致' : '—'}</td></tr>)}</tbody></table></div></details>
      <fieldset className="context-lab-evaluation"><legend>結果を見たあとに、人間が記録</legend><p className="context-lab-note">以下は評価専用です。認識モデル・A/B/Cの補正には渡しません。読みの一致と意味の正解は別です。感想は1（低い）〜5（高い）、未観察のままでも記録できます。</p>
        <label>意図したことば<input aria-label="意図したことば" maxLength={80} value={evaluation.intendedWord ?? ''} onChange={event => setEvaluation({ ...evaluation, intendedWord: event.target.value })} /></label>
        <label>直前の絵を何だと思ったか<input aria-label="直前の絵を何だと思ったか" maxLength={80} value={evaluation.perceivedPreviousWord ?? ''} onChange={event => setEvaluation({ ...evaluation, perceivedPreviousWord: event.target.value })} /></label>
        <label>意味の正解を指定<select aria-label="意味の正解を指定" value={goldMode} onChange={event => { const mode = event.target.value; setGoldMode(mode); setEvaluation({ ...evaluation, intendedModelLabel: mode === 'outside' ? '__out_of_vocabulary__' : undefined }); }}><option value="unknown">不明・未評価</option><option value="class">正確なモデル分類を指定</option><option value="outside">345分類の対応外</option></select></label>
        {goldMode === 'class' && <label>正解モデル分類<select aria-label="正解モデル分類" value={evaluation.intendedModelLabel ?? ''} onChange={event => setEvaluation({ ...evaluation, intendedModelLabel: event.target.value || undefined })}><option value="">分類を選択</option>{comparison.candidates.map(candidate => <option key={candidate.label} value={candidate.label}>{candidate.label}</option>)}</select></label>}
        <div className="context-lab-observations">{(['A', 'B', 'C'] as const).map(policy => <label key={policy}>実際の試遊で継続した · {policy}<select aria-label={`実際の試遊で継続した · ${policy}`} value={evaluation.observedContinuation?.[policy] === undefined ? '' : String(evaluation.observedContinuation[policy])} onChange={event => { const observations = { ...evaluation.observedContinuation }; if (event.target.value === '') delete observations[policy]; else observations[policy] = event.target.value === 'true'; setEvaluation({ ...evaluation, observedContinuation: observations }); }}><option value="">未観察</option><option value="true">はい</option><option value="false">いいえ</option></select></label>)}</div>
        {([['enjoyment', '楽しさ'], ['replayIntent', '再遊意向'], ['shizukuFeeling', 'しずくらしさ']] as const).map(([key, label]) => <label key={key}>{label}<select aria-label={label} value={evaluation[key] ?? ''} onChange={event => setEvaluation({ ...evaluation, [key]: event.target.value === '' ? undefined : Number(event.target.value) })}><option value="">未観察</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
      </fieldset>
      <button className="context-lab-primary" onClick={save}>この設定・評価を記録する</button><p className="context-lab-note">値を変えてもう一度記録すると、同じサンプルの別設定として残ります。新しい描画では結果と評価を隠します。</p>
    </section>}
    <section className="context-lab-export" aria-label="保存した設定"><h2>記録 / {records.length} 設定</h2><p className="context-lab-note">異なる描画 {new Set(records.map(record => `${record.sample.participant}:${record.sample.drawingId}`)).size} 枚。同じ匿名コード・座標の再推論や設定違いを別の絵として数えません。</p>{records.length > 0 && sample && <><ol>{records.map((record, index) => <li key={index}>{record.sample.requestId} · C {record.result.comparison.config.variant} / rank {record.result.comparison.config.maxRank} / gap {record.result.comparison.config.maxGap} / strength {record.result.comparison.config.strength}</li>)}</ol><details><summary>保存した設定の集計（人間精度・楽しさの証明ではありません）</summary><pre>{JSON.stringify(summary, null, 2)}</pre></details></>}<div className="context-lab-actions"><button disabled={!records.length} onClick={() => download(records, 'json')}>JSONを書き出す</button><button disabled={!records.length} onClick={() => download(records, 'csv')}>CSVを書き出す</button></div></section>
  </main>;
}
