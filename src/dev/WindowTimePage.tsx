import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import App from '../App';
import { gameSketches } from '../data/gameSketches';
import type { DrawingRecognizer,GameEvent,GameState,Language,Mode,WindowCanvasProps } from '../core/types';
import { PremonitionRecorder } from './premonition/recording';
import { exportTimeReplay } from './windowTime/export';
import { TimeComparison } from './windowTime/Comparison';
import { TempoCanvas } from './windowTime/TempoCanvas';
import { TEMPOS,TEMPO_NAMES,endingTempo,type Tempo,type TempoControls } from './windowTime/tempo';
import { timeSessionStore } from './windowTime/storage';
import './WindowTimePage.css';

const questions=['描く様子を眺めるのが楽しい','何ができるか想像する時間がある','しずくが描いてくれていると感じる','急かされる感じがある','待ち時間が長すぎる','もう一枚描いてほしい','またねまで心地よい','もう少し一緒にいたい'] as const;
const empty=()=>({answers:questions.map(()=>null as number|null),comment:''});
type Condition={tempo:Tempo;controls:TempoControls};
function validCondition(value:unknown):value is Condition {const v=value as Condition|undefined;return Boolean(v&&TEMPOS.includes(v.tempo)&&Number.isFinite(v.controls?.speed)&&v.controls.speed>=.7&&v.controls.speed<=1.4&&(v.controls.hesitationMs===undefined||Number.isFinite(v.controls.hesitationMs)&&v.controls.hesitationMs>=0&&v.controls.hesitationMs<=700));}
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function settings(){try{const value=JSON.parse(localStorage.getItem('drawindow-window-time-settings')??'null');if(value&&TEMPOS.includes(value.tempo)&&Number.isFinite(value.controls?.speed)&&value.controls.speed>=.7&&value.controls.speed<=1.4&&(value.controls.hesitationMs===undefined||Number.isFinite(value.controls.hesitationMs)&&value.controls.hesitationMs>=0&&value.controls.hesitationMs<=700))return value as {tempo:Tempo;controls:TempoControls};}catch{}return {tempo:'B' as Tempo,controls:{speed:1} as TempoControls};}

export function WindowTimePage({recognizer}:{recognizer?:DrawingRecognizer}={}){
  const [initial]=useState(settings),[tempo,setTempo]=useState<Tempo>(initial.tempo),[controls,setControls]=useState<TempoControls>(initial.controls);
  const [run,setRun]=useState<Condition>(initial),runRef=useRef<Condition>(initial),savedCondition=useRef<Condition|undefined>(undefined);
  const [view,setView]=useState<'lab'|'play'>('lab'),[mode,setMode]=useState<Mode>('day'),[language,setLanguage]=useState<Language>('ja'),[index,setIndex]=useState(0);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [state,setState]=useState<GameState|null>(null),[restored,setRestored]=useState(false),[skipEpoch,setSkipEpoch]=useState(0),[includeDrawings,setIncludeDrawings]=useState(false);
  const [ratings,setRatings]=useState(()=>({A:empty(),B:empty(),C:empty()}));
  const [recorder,setRecorder]=useState(()=>new PremonitionRecorder());
  const store=useMemo(()=>({read:async()=>{const raw=await timeSessionStore.read();const condition=(raw as {windowTimeCondition?:unknown}|undefined)?.windowTimeCondition;savedCondition.current=validCondition(condition)?condition:undefined;return raw;},write:async(snapshot:Parameters<typeof timeSessionStore.write>[0])=>timeSessionStore.write(snapshot?Object.assign({},snapshot,{windowTimeCondition:runRef.current}):null)}),[]);
  const log=useRef<Record<string,unknown>[]>([]),started=useRef(performance.now()),latest=useRef<GameState|null>(null);
  const active=view==='play'&&Boolean(state&&!['title','results'].includes(state.phase));
  const compact=view==='play'&&Boolean(state&&state.phase!=='title');
  const sketches=useMemo(()=>gameSketches(language),[language]);
  const sketch=sketches[Math.min(index,sketches.length-1)];
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
  useEffect(()=>{try{localStorage.setItem('drawindow-window-time-settings',JSON.stringify({tempo,controls}));}catch{}},[tempo,controls]);
  useEffect(()=>{log.current.push({atMs:performance.now()-started.current,kind:'condition',view,tempo,controls:{...controls},mode:view==='play'?state?.mode:mode,language:view==='play'?state?.language:language,reduced});},[view,tempo,controls,mode,language,reduced,state?.mode,state?.language]);
  useEffect(()=>{const visibility=()=>log.current.push({atMs:performance.now()-started.current,kind:'visibility',visible:!document.hidden});document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
  useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(log.current.length>1)event.preventDefault();};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
  const onState=useCallback((next:GameState)=>{recorder.observeInitial(next);const before=latest.current;latest.current=next;if(!before||before.phase!==next.phase||before.round!==next.round||before.sessionId!==next.sessionId||before.language!==next.language||before.mode!==next.mode)setState(next);},[recorder]);
  const onEvent=useCallback((event:GameEvent)=>{
    recorder.record(event);
    if(event.type==='START'){const condition={tempo,controls:{...controls}};runRef.current=condition;setRun(condition);setRestored(false);setIncludeDrawings(false);}
    if(event.type==='RESTORE_SESSION'){const condition=savedCondition.current??{tempo,controls};runRef.current=condition;setRun(condition);setRestored(true);}
    log.current.push({atMs:performance.now()-started.current,kind:'game',event:event.type,phase:latest.current?.phase,round:latest.current?.round,tempo:runRef.current.tempo});
  },[recorder,tempo,controls]);
  const onEndingBeat=useCallback((beat:{act:string;pairs:number;links:number;skipped:boolean})=>{log.current.push({atMs:performance.now()-started.current,kind:'ending',run:runRef.current,...beat});},[]);
  const renderCanvas=useCallback((props:WindowCanvasProps)=><TempoCanvas {...props} tempo={run.tempo} controls={run.controls} skipEpoch={skipEpoch}/>,[run,skipEpoch]);
  const ending=endingTempo(run.tempo,restored)??(restored?{pairMs:1000,linkMs:650,arrivalMs:800,goodbyeMs:4000,skipIntro:true}:undefined);
  const ready=state?.phase==='results';
  const recording=useMemo(()=>ready?recorder.recording:null,[ready,recorder,state?.sessionId]);
  const openPlay=()=>{if(view!=='play'){setRecorder(new PremonitionRecorder());latest.current=null;setState(null);setRestored(false);setView('play');}};
  const header=<section className={`time-header ${compact?'is-live':''}`} aria-label="窓辺の時間の研究設定">
    <span className="time-kicker">LOCAL TEMPO STUDY / v0.12</span><h1>窓辺の時間。{compact?` · ${run.tempo} ${TEMPO_NAMES[run.tempo]}`:''}</h1><p>一本の線から、またねまで。速さと静けさを比べます。</p>
    <div className="time-actions"><button aria-pressed={view==='lab'} disabled={active} onClick={()=>setView('lab')}>同じ絵を比べる</button><button aria-pressed={view==='play'} disabled={active} onClick={openPlay}>５往復を試す</button></div>
    <div className="time-actions" role="group" aria-label="テンポ設定">{TEMPOS.map(t=><button key={t} aria-pressed={tempo===t} disabled={active} onClick={()=>setTempo(t)}>{t} · {TEMPO_NAMES[t]}</button>)}</div>
    <p className="time-accessibility" role="status">{reduced?'OSの「動きを減らす」が有効です。線の再生・指先・追加の動きは省略します。テンポ設定では解除しません。':'OSの「動きを減らす」は無効です。線と指先の動きを再生します。'}</p>
    <details><summary>時間を調整する（B/Cのみ）</summary><label>線の速度 {controls.speed.toFixed(2)}倍<input aria-label="線の速度" disabled={active||tempo==='A'} type="range" min=".7" max="1.4" step=".05" value={controls.speed} onChange={e=>setControls(c=>({...c,speed:Number(e.target.value)}))}/></label><label>描く前のためらい {controls.hesitationMs===undefined?'昼夜ごとの初期値':`${controls.hesitationMs}ms`}<input aria-label="描く前のためらい" disabled={active||tempo==='A'} type="range" min="0" max="700" step="20" value={controls.hesitationMs??(tempo==='C'?((view==='play'?state?.mode:mode)==='night'?420:340):((view==='play'?state?.mode:mode)==='night'?320:240))} onChange={e=>setControls(c=>({...c,hesitationMs:Number(e.target.value)}))}/></label><button disabled={active} onClick={()=>setControls({speed:1})}>初期値に戻す</button></details>
    {view==='lab'&&<div className="time-selectors"><label>昼夜<select aria-label="昼夜" value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="day">DAY</option><option value="night">NIGHT</option></select></label><label>言語<select aria-label="比較する言語" value={language} onChange={e=>{setLanguage(e.target.value as Language);setIndex(0);}}><option value="ja">日本語</option><option value="en">English</option></select></label><label>同じ絵<select aria-label="比較する絵" value={index} onChange={e=>setIndex(Number(e.target.value))}>{sketches.map((s,i)=><option key={s.id} value={i}>{s.word}</option>)}</select></label></div>}
    {compact&&<div className="time-live-action">{active&&['girl_breath','girl_drawing'].includes(state?.phase??'')&&<button onClick={()=>{log.current.push({atMs:performance.now()-started.current,kind:'skip',phase:state?.phase});setSkipEpoch(n=>n+1);}}>この動作を進める</button>}</div>}
    <p><a href="?window-time-premonition">Cのテンポで、表情のX/Y比較へ</a></p>
    <p className="time-note">研究専用。本編はA、D案は保留のままです。途中設定はこの端末に残ります。絵と感想は自動共有しません。５往復中は条件を固定します。</p>
  </section>;
  const form=<section className="time-feedback" aria-label="時間体験の記録"><h2>どう過ごせたか。</h2><p>未試遊は空欄のまま。1=全くそう思わない、5=とてもそう思う。「急かされる」「長すぎる」は高いほど懸念があります。</p>
    <div className="time-rating-grid">{TEMPOS.map(t=><fieldset key={t}><legend>{t} · {TEMPO_NAMES[t]}</legend>{questions.map((q,i)=><label key={q}>{q}<select aria-label={`${t} ${q}`} value={ratings[t].answers[i]??''} onChange={e=>setRatings(all=>({...all,[t]:{...all[t],answers:all[t].answers.map((v,j)=>i===j?(e.target.value?Number(e.target.value):null):v)}}))}><option value="">未回答・未試遊</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}<label>感じたこと<textarea maxLength={1000} value={ratings[t].comment} onChange={e=>setRatings(all=>({...all,[t]:{...all[t],comment:e.target.value}}))}/></label></fieldset>)}</div>
    <button onClick={()=>download(JSON.stringify({format:'drawindow-window-time-evaluation-v1',scope:view==='play'?'live five-exchange study':'single-drawing comparison',runCondition:view==='play'?run:null,ratings,questions,conditions:log.current,recording:recording?{completeness:recording.completeness,finished:ready}:null,human:'Only actual answers entered by the participant; no developer or pilot ratings generated.'},null,2),`DRAWINDOW-window-time-evaluation-${Date.now()}.json`)}>評価JSONを保存</button>
    <p className="time-note">感想と過去の演出ログはメモリー内だけです。終了前に本人が保存してください。単体の絵と５往復の感想は分けて扱います。</p>
  </section>;
  const footer=ready&&recording?<section className="time-after"><h2>同じ５往復を、違う時間で。</h2><p className="time-note">実プレイの条件: {run.tempo}。比較設定を変えても、答え合わせとまたねの演技はこの条件を保ちます。</p>
    <div className="time-actions" role="group" aria-label="記録比較テンポ">{TEMPOS.map(t=><button key={t} aria-pressed={tempo===t} onClick={()=>setTempo(t)}>比較 {t} · {TEMPO_NAMES[t]}</button>)}</div>
    <details className="time-replay-settings"><summary>記録の時間を調整する</summary><label>線の速度<input aria-label="記録の線の速度" disabled={tempo==='A'} type="range" min=".7" max="1.4" step=".05" value={controls.speed} onChange={e=>setControls(c=>({...c,speed:Number(e.target.value)}))}/></label><label>ためらい<input aria-label="記録のためらい" disabled={tempo==='A'} type="range" min="0" max="700" step="20" value={controls.hesitationMs??(tempo==='C'?(state?.mode==='night'?420:340):(state?.mode==='night'?320:240))} onChange={e=>setControls(c=>({...c,hesitationMs:Number(e.target.value)}))}/></label></details>
    <TimeComparison sketch={sketch} language={language} mode={mode} tempo={tempo} controls={controls} reducedMotion={reduced} recording={recording}/>{form}<label><input type="checkbox" checked={includeDrawings} onChange={e=>setIncludeDrawings(e.target.checked)}/>絵・名前・認識結果を含む再生記録を保存する</label><button disabled={!includeDrawings} onClick={()=>download(exportTimeReplay(recording,run,{tempo,controls}),`DRAWINDOW-window-time-replay-${Date.now()}.json`)}>描画入りJSONを保存</button><button onClick={()=>setView('lab')}>単体の絵へ戻る</button><p className="time-note">開き直す前に必要な記録を保存してください。保存ゲームを再開した場合は、その時点からの部分記録になります。</p></section>:null;
  if(view==='play')return <App mlRecognizer={recognizer} onStateChange={onState} study={{localOnly:true,storage:store,onEvent,header,footer,renderCanvas,onEndingBeat,ending}}/>;
  return <main className="app time-lab" data-mode={mode}>{header}<TimeComparison sketch={sketch} language={language} mode={mode} tempo={tempo} controls={controls} reducedMotion={reduced}/>{form}</main>;
}
