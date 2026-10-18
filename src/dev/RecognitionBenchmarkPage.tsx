import { useEffect, useRef, useState } from 'react';
import type { Stroke } from '../core/types';
import { WindowCanvas } from '../components/WindowCanvas';
import { BENCHMARK_PROMPTS, BenchmarkSession, exportCsv, exportJson, summarize, validDrawing, type BenchmarkAttempt, type DrawerIdentity, type InputType, type Judgement } from './recognitionBenchmark';
import './RecognitionBenchmark.css';

const judgementLabels: Record<Judgement, string> = {
  exact: 'exact · 意図どおり / 妥当な同義語',
  plausible_alternative: 'plausible_alternative · 別の物だが納得できる',
  unrelated: 'unrelated · 線からは納得できない',
  abstain_or_error: 'abstain_or_error · 認識不能 / APIエラー',
};
function download(contents: string, extension: 'json' | 'csv', sessionId: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: extension === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `DRAWINDOW-freehand-${sessionId}.${extension}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function AttemptEvaluation({ item, session, update }: { item: BenchmarkAttempt; session: BenchmarkSession; update: () => void }) {
  return <article className="benchmark-result">
    <div className="benchmark-result-heading"><span>{item.attempt === 1 ? 'FIRST ATTEMPT' : `MANUAL RETRY ${item.attempt - 1} · 集計対象外`}</span><span>{item.elapsedMs} ms</span></div>
    <strong className="benchmark-guess" data-testid={`guess-${item.attempt}`}>{item.guess ?? item.errorCode}</strong>
    <p className="benchmark-fine">source: {item.source} · HTTP: {item.httpStatus ?? '未計測'} · {item.imageWidth}×{item.imageHeight} PNG / {item.imageBytes} bytes<br />{item.nextInitial ? `次のお題の頭文字: ${item.nextInitial.toUpperCase()} · テンプレート ${item.nextTemplateCovered ? 'あり' : 'なし'}` : '次のお題の頭文字: —'}</p>
    {item.errorCode && <p role="alert">{item.errorCode === 'rate_limit' ? '429 / rate_limit: 待機後、手動で再試行できます。' : item.errorCode === 'invalid_response' ? 'invalid_response: 有効な認識語がありません。Workerの認識不能（502）もこのまま記録します。' : `${item.errorCode}: 今回の失敗を記録しました。`} 自動再試行はしません。</p>}
    <label htmlFor={`judgement-${item.requestId}`}>納得度 · attempt {item.attempt}</label>
    <select id={`judgement-${item.requestId}`} value={item.judgement ?? ''} onChange={event => { session.judge(item.requestId, event.target.value as Judgement, item.rationale); update(); }}>
      <option value="">選んでください</option>
      {(item.errorCode ? ['abstain_or_error'] as const : ['exact', 'plausible_alternative', 'unrelated'] as const).map(value => <option key={value} value={value}>{judgementLabels[value]}</option>)}
    </select>
    <label htmlFor={`rationale-${item.requestId}`}>理由 · attempt {item.attempt}</label>
    <textarea id={`rationale-${item.requestId}`} value={item.rationale} maxLength={240} rows={2} placeholder="例: 長い柄と先端の形がスコップにも見える" disabled={!item.judgement} onChange={event => { session.judge(item.requestId, item.judgement!, event.target.value); update(); }} />
  </article>;
}

export function RecognitionBenchmark({ session: supplied }: { session?: BenchmarkSession }) {
  const [session] = useState(() => supplied ?? new BenchmarkSession());
  const [, setRevision] = useState(0);
  const update = () => setRevision(value => value + 1);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [drawerId, setDrawerId] = useState('P01');
  const [device, setDevice] = useState<DrawerIdentity['device']>(() => window.innerWidth < 680 ? 'phone' : 'desktop');
  const typesRef = useRef<InputType[]>([]);
  const prompt = BENCHMARK_PROMPTS[sampleIndex];
  const records = session.attempts.filter(item => item.sampleId === prompt.sampleId);
  const locked = records.length > 0 || session.sending;
  const summary = summarize(session.attempts);
  const wait = Math.ceil(session.remainingMs / 1000);
  const evaluated = records.length > 0 && records.every(item => item.judgement && item.rationale.trim());
  const drawerValid = /^[a-zA-Z0-9_-]{1,24}$/.test(drawerId);

  useEffect(() => {
    if (!session.remainingMs) return;
    const timer = setInterval(() => { update(); if (!session.remainingMs) clearInterval(timer); }, 250);
    return () => clearInterval(timer);
  }, [session, session.cooldownUntil]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (session.attempts.length || session.sending || strokes.length) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [session, strokes.length]);

  const send = async (retry = false) => {
    const pending = session.send(sampleIndex, strokes, { drawerId, device, inputTypes: typesRef.current }, retry);
    update();
    await pending;
    update();
  };
  const next = () => {
    if (!evaluated || session.sending) return;
    if (sampleIndex === 11) { setFinished(true); return; }
    setSampleIndex(value => value + 1); setStrokes([]); typesRef.current = [];
  };
  const clear = () => { setStrokes([]); typesRef.current = []; };

  return <main className="benchmark">
    <header className="benchmark-header"><a href="/">DRAWINDOW.</a><span>LOCAL DEV ONLY · FREEHAND v0.1</span></header>
    <div className="benchmark-intro">
      <p className="eyebrow">12 NEW DRAWINGS BY HUMAN HANDS</p>
      <h1>描いて、認識をたしかめる。</h1>
      <p>お題はこの画面だけに保持します。Geminiに送るのは白地・黒線のPNGとリクエストIDだけです。<br />これは探索的な12枚の試行です。ゲームのスコアや認識精度の保証には使いません。</p>
      <p className="benchmark-fine">保存済みのローカルWorkerキーを使用 · 同一オリジン /api/recognize · 512×512 PNG · 逐次送信 · 自動リトライなし</p>
    </div>

    <section className="benchmark-setup" aria-label="描き手の設定">
      <label>匿名の描き手ID<input aria-label="匿名の描き手ID" value={drawerId} maxLength={24} pattern="[a-zA-Z0-9_-]{1,24}" disabled={session.attempts.length > 0 || session.sending} onChange={event => setDrawerId(event.target.value)} /></label>
      <label>端末<select aria-label="端末" value={device} disabled={session.attempts.length > 0 || session.sending} onChange={event => setDevice(event.target.value as DrawerIdentity['device'])}><option value="desktop">PC / desktop</option><option value="phone">スマートフォン</option><option value="tablet">タブレット</option><option value="other">その他</option></select></label>
      <div><button onClick={() => { session.checkZeroStrokes(); update(); }}>ZERO-STROKE CHECK</button><p className="benchmark-fine">{session.zeroStrokeCheck ? 'invalid_input · API calls: 0' : '空入力を送信せずに確認（12枚とは別）'}</p></div>
      {!drawerValid && <p role="alert">匿名IDは英数字・ハイフン・アンダースコアの1〜24文字にしてください。</p>}
    </section>

    {!finished ? <section className="benchmark-workspace" aria-label="手描きの計測">
      <div className="benchmark-draw-panel">
        <div className="benchmark-prompt"><span>{prompt.sampleId} / 12 · {prompt.category}</span><h2>{prompt.ja} / {sampleIndex === 11 ? 'scribble' : prompt.intent}</h2><p>見本はありません。いま、マウス・指・ペンで新しく描いてください。{sampleIndex === 11 && ' 何かを表す意図のない線にしてください。'}</p></div>
        <div className="benchmark-canvas-frame">
          <WindowCanvas key={sampleIndex} variant="neutral" mode="day" phase={locked ? 'recognizing' : 'player_drawing'} strokes={strokes} onStrokesChange={setStrokes} onInputTypeChange={type => { if (!typesRef.current.includes(type)) typesRef.current.push(type); }} onBreathDone={() => {}} onPlaybackDone={() => {}} reducedMotion />
        </div>
        <p className="benchmark-fine">{strokes.reduce((count, stroke) => count + stroke.points.length, 0)} points · input: {typesRef.current.join(' / ') || '—'} · 実際の入力方法を記録します</p>
        <div className="benchmark-controls"><button disabled={locked || !strokes.length} onClick={clear}>CLEAR</button><button disabled={locked || !strokes.length} onClick={() => { setStrokes(value => value.slice(0, -1)); }}>UNDO</button><button className="benchmark-primary" disabled={locked || wait > 0 || !validDrawing(strokes) || !drawerValid} onClick={() => void send()}>SEND ONCE</button></div>
        {session.validationError && <p role="alert">invalid_input: 筆跡・画像サイズ・匿名IDを確認してください。APIには送信していません。</p>}
        <p className="benchmark-status" role="status">{session.sending ? 'Geminiに1回送信中…' : wait > 0 ? `次の送信まで ${wait} 秒待機。自動送信はしません。` : locked ? '初回の送信は完了しました。下の評価を記録してください。' : '描き終えたら SEND ONCE。送信前には結果を表示しません。'}</p>
      </div>
      <div className="benchmark-evaluation">
        {records.length === 0 ? <div className="benchmark-empty"><h2>結果は、送ってから。</h2><p>認識語を見て、線から納得できるかを評価します。意図と違っても、見える形として妥当なら「別の物だが納得できる」を選んでください。</p><p className="benchmark-fine">初回は必ず1リクエスト。失敗も測定結果として残ります。</p></div> : records.map(item => <AttemptEvaluation key={item.requestId} item={item} session={session} update={update} />)}
        {records.length > 0 && <><button disabled={session.sending || wait > 0 || !evaluated || records.length >= 3} onClick={() => void send(true)}>MANUAL RETRY · 別記録（最大2回）</button><p className="benchmark-fine">同じ絵を再送。初回の結果は上書きせず、初回集計に混ぜません。</p></>}
        <button className="benchmark-primary benchmark-next" disabled={!evaluated || session.sending} onClick={next}>NEXT</button>
        <p className="benchmark-fine">認識の納得度と短い理由を入力すると次へ進めます。名前や秘密情報は書かないでください。</p>
      </div>
    </section> : <section className="benchmark-finished"><h2>12枚の記録がそろいました。</h2><p>下の初回集計を確認し、JSONとCSVを保存してください。別の人の試行は、保存後にページを開き直し、別の匿名IDで始めます。</p></section>}

    <section className="benchmark-report" aria-label="初回認識の集計">
      <h2>初回認識の集計 <span>{summary.complete ? '12/12 · 評価済み' : `${summary.firstAttempts}/12 · 計測途中`}</span></h2>
      <div className="benchmark-metrics"><p>意図どおり<strong>{summary.exact} / 11</strong></p><p>納得できる別解を含む<strong>{summary.plausibleOrExact} / 11</strong></p><p>認識不能・エラー<strong>{summary.errorCount} / {summary.firstAttempts || '—'}</strong></p><p>人間の評価済み<strong>{summary.judged} / 12</strong></p></div>
      <p className="benchmark-fine">第12題のscribbleは名詞一致の分母から除外。未実施・未評価は成功扱いにしません。手動再試行 {summary.retries} 件はすべて初回集計から除外します。</p>
      <p>{summary.latency ? `応答時間（初回 ${summary.firstAttempts} 件）: min ${summary.latency.min} / median ${summary.latency.median} / p90 ${summary.latency.p90} / max ${summary.latency.max} ms` : '応答時間: まだ計測していません。'}</p>
      <p className="benchmark-fine">有効な認識語の次の頭文字（重複除外）: {summary.nextInitials.join(', ').toUpperCase() || '—'} · テンプレートあり: {summary.coveredNextInitials.length} 種。認識のconfidenceは生成しません。</p>
      <div className="benchmark-table-wrap"><table><caption>全試行の記録（再試行を含む）</caption><thead><tr>{['ID', '意図', '試行', '認識 / エラー', 'source', 'HTTP', 'ms', '納得度', '理由', '次の頭文字'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{session.attempts.map(item => <tr key={item.requestId}><td>{item.sampleId}</td><td>{item.intent}</td><td>{item.attempt === 1 ? '初回' : `再${item.attempt - 1}`}</td><td>{item.guess ?? item.errorCode}</td><td>{item.source}</td><td>{item.httpStatus ?? '—'}</td><td>{item.elapsedMs}</td><td>{item.judgement ?? '未評価'}</td><td>{item.rationale || '—'}</td><td>{item.nextInitial?.toUpperCase() ?? '—'}</td></tr>)}</tbody></table></div>
      <div className="benchmark-export"><button disabled={session.sending} onClick={() => download(exportJson(session), 'json', session.sessionId)}>Export sanitized JSON</button><button disabled={session.sending} onClick={() => download(exportCsv(session), 'csv', session.sessionId)}>Export sanitized CSV</button></div>
      <p className="benchmark-fine">記録はメモリ内だけです。再読み込み・終了で消えます。途中でも書き出せます。出力に画像・筆跡・キー・生の応答は含みません。JSONに集計、CSVに全試行を保存します。モデル名は未計測のためJSONではnullです。</p>
    </section>
  </main>;
}
