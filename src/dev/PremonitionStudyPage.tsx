import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import App from '../App';
import type { DrawingRecognizer, GameState } from '../core/types';
import { usePremonition } from './premonition/usePremonition';
import { PremonitionRecorder, exportReplay } from './premonition/recording';
import { studySessionStore } from './premonition/storage';
import { createBlindAssignment, createEvaluation, evaluationCsv, evaluationFields, exportMetadata, type BlindAssignment, type BlindLabel, type Evaluation, type EvaluationField } from './premonition/evaluation';
import { PremonitionReplay } from './premonition/Replay';
import './PremonitionStudyPage.css';

const labels:Record<EvaluationField,string>={naturalness:'自然に感じた',friendliness:'親しみを感じた',noticed:'反応に気づいた',blamed:'責められたように感じた',intrusive:'反応が邪魔だった',tempo:'テンポがよかった',daynight:'昼・夜の雰囲気に合った',shizuku:'しずくらしいと感じた',replay:'もう一度遊びたい'};
function saveText(text:string,name:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function useReduced(){const [value,setValue]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setValue(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);return value;}

/** Reuses the actual game. All differences are DEV-only observations/presentation. */
export function PremonitionStudyPage({recognizer,initialAssignment}: {recognizer?:DrawingRecognizer;initialAssignment?:BlindAssignment}={}){
  const [recorder]=useState(()=>new PremonitionRecorder());
  const [assignment,setAssignment]=useState(()=>initialAssignment??createBlindAssignment());
  const [label,setLabel]=useState<BlindLabel>(assignment.order[0]);
  const [state,setState]=useState<GameState|null>(null);
  const stateRef=useRef<GameState|null>(null);
  const [participant,setParticipant]=useState('P01');
  const [evaluation,setEvaluation]=useState<Record<BlindLabel,Evaluation>>(()=>({X:createEvaluation(),Y:createEvaluation()}));
  const [reveal,setReveal]=useState(false),[includeDrawings,setIncludeDrawings]=useState(false);
  const exposures=useRef<{atMs:number;labels:readonly BlindLabel[];kind:string;phase:string}[]>([]);const origin=useRef(performance.now());
  const liveLabels=useRef<BlindLabel[]>([]);const labelRef=useRef(label);labelRef.current=label;
  const reducedMotion=useReduced();
  const presentation=usePremonition(state,assignment[label]==='D',reducedMotion);
  const onEvent=useCallback((event:Parameters<PremonitionRecorder['record']>[0])=>{
    if(event.type==='START'){
      origin.current=performance.now();exposures.current=[{atMs:0,labels:[labelRef.current],kind:'live',phase:'girl_breath'}];liveLabels.current=[labelRef.current];setEvaluation({X:createEvaluation(),Y:createEvaluation()});setReveal(false);setIncludeDrawings(false);
    }
    recorder.record(event);
    if(event.type==='RESTORE_SESSION'&&recorder.recording?.completeness==='partial'&&!['title','results','review_intents'].includes(event.state.phase)){
      origin.current=performance.now();liveLabels.current=[labelRef.current];exposures.current=[{atMs:0,labels:[labelRef.current],kind:'restored-live',phase:event.state.phase}];
    }
  },[recorder]);
  const observe=useCallback((next:GameState)=>{
    recorder.observeInitial(next);
    const before=stateRef.current;stateRef.current=next;
    if(!before||before.phase!==next.phase||before.round!==next.round||before.sessionId!==next.sessionId||before.mode!==next.mode||before.language!==next.language)setState(next);
  },[recorder]);
  const ready=state?.phase==='results';
  const recording=useMemo(()=>ready?recorder.recording:null,[ready,recorder,state?.sessionId]);
  useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(recorder.recording?.events.length)e.preventDefault();};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[recorder]);
  const noteReplay=useCallback((labels:readonly BlindLabel[],kind:'single'|'paired')=>{exposures.current.push({atMs:Math.max(0,performance.now()-origin.current),labels:[...labels],kind,phase:'replay'});},[]);
  const choose=(slot:BlindLabel)=>{if(slot!==label){exposures.current.push({atMs:Math.max(0,performance.now()-origin.current),labels:[slot],kind:'switch',phase:state?.phase??'title'});if(state&&!['title','results','review_intents'].includes(state.phase)&&!liveLabels.current.includes(slot))liveLabels.current.push(slot);setLabel(slot);}};
  const validId=/^[A-Za-z0-9_-]{1,24}$/.test(participant);
  const exportMeta=()=>{
    if(!recording)return;
    const data=JSON.parse(exportMetadata(recording,evaluation,assignment,presentation.events.filter(e=>e.sessionId===state?.sessionId).map(e=>({id:e.id,round:e.round,mode:e.mode,atMs:recording.events.find(item=>item.event.type==='RECOGNITION_RESOLVED'&&item.event.requestId===e.requestId)?.atMs??0,expression:e.candidate.expression,durationMs:e.candidate.durationMs,reason:e.candidate.reason,suppressionReason:e.suppressionReason}))));
    saveText(JSON.stringify({...data,participant,liveLabels:[...liveLabels.current],plannedOrder:assignment.order,renderedExposureLog:exposures.current,scope:'Human responses only if actually entered; replay uses recorded still drawings and compacted time.'},null,2),`DRAWINDOW-study-${participant}-${Date.now()}.json`,'application/json');
  };
  const header=<section className="premonition-controls" aria-label="匿名の比較設定"><div><span className="premonition-kicker">LOCAL STUDY / v0.11</span><h1>窓の向こうを、もう一度。</h1><p>同じ５往復を、表示を変えて見返します。認識は端末内で行います。正解を当てる試験と、感じ方の評価は別に記録します。</p></div>
    <div className="premonition-actions" role="group" aria-label="比較する表示">{assignment.order.map(slot=><button key={slot} aria-pressed={label===slot} onClick={()=>choose(slot)}>表示 {slot}</button>)}<button disabled={state?.phase!=='title'} onClick={()=>{setAssignment(a=>({...a,order:[a.order[1],a.order[0]]}));setLabel(assignment.order[1]);}}>提示順を入れ替える</button></div>
    <label>匿名コード<input aria-label="匿名コード" maxLength={24} value={participant} disabled={!['title','results'].includes(state?.phase??'title')} onChange={e=>setParticipant(e.target.value)}/></label>
    {!validId&&<p role="alert">氏名を使わず、P01のような英数字・ハイフン・アンダースコアで記録してください。</p>}
    <p className="premonition-fine">ゲーム途中はこの端末の研究用保存に残ります。比較記録・感想はメモリー内だけです。新しいゲームや終了前に本人が書き出してください。自動共有はしません。</p>
  </section>;
  const footer=ready&&recording?<section className="premonition-report" aria-label="終了後の比較と感想"><p>{recording.completeness==='partial'?'途中復元以後の部分記録です。以前の演出時系列は補完しません。':'開始からの同じゲームイベントを記録しました。'}</p>
    <PremonitionReplay recording={recording} assignment={assignment} label={label} reducedMotion={reducedMotion} onExposure={noteReplay}/>
    <h2>どう感じたか、別々に</h2><p>未観察は空欄のままにしてください。実プレイした表示: {[...liveLabels.current].join('・')||'未記録'}。記録の再生と実際の５往復は区別します。</p>
    <div className="premonition-evaluations">{(['X','Y'] as const).map(slot=><fieldset key={slot}><legend>表示 {slot}</legend>{evaluationFields.map(field=><label key={field}>{labels[field]}<select aria-label={`${slot} ${labels[field]}`} value={evaluation[slot][field]??''} onChange={e=>setEvaluation(all=>({...all,[slot]:{...all[slot],[field]:e.target.value?Number(e.target.value):null}}))}><option value="">未回答・未観察</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value}</option>)}</select></label>)}<label>反応の意味・気になったこと（個人情報なし）<textarea aria-label={`${slot} 自由記述`} value={evaluation[slot].freeText} maxLength={1000} onChange={e=>setEvaluation(all=>({...all,[slot]:{...all[slot],freeText:e.target.value}}))}/></label></fieldset>)}</div>
    <div className="premonition-actions"><button disabled={!validId} onClick={exportMeta}>評価JSONを書き出す</button><button disabled={!validId} onClick={()=>saveText(evaluationCsv(evaluation,assignment,{participant,completeness:recording.completeness,finished:state?.phase==='results'&&state.entries.length===10,liveLabels:liveLabels.current,exposureLog:exposures.current}),`DRAWINDOW-study-${participant}-${Date.now()}.csv`,'text/csv')}>評価CSVを書き出す</button></div>
    <label className="premonition-check"><input type="checkbox" checked={includeDrawings} onChange={e=>setIncludeDrawings(e.target.checked)}/> 自分の絵・名前・認識結果を含むローカル再生JSONを書き出す</label><button disabled={!includeDrawings} onClick={()=>saveText(exportReplay(recording),`DRAWINDOW-replay-${Date.now()}.json`,'application/json')}>描画を含む再生JSONを保存</button>
    <details><summary>実施者の検査欄（終了後）</summary><label className="premonition-check"><input type="checkbox" checked={reveal} onChange={e=>setReveal(e.target.checked)}/> 匿名表示の割り当てを確認する</label>{reveal&&<p>表示X: {assignment.X} / 表示Y: {assignment.Y} / 提示順: {assignment.order.join(' → ')}</p>}<p>追加表情は昼240ms・夜160ms、応答１・３回目のみ。スコアを自信に換算していません。抑制も含めた実表示の観測:</p><pre>{JSON.stringify(presentation.events.filter(e=>e.sessionId===state?.sessionId),null,2)}</pre></details>
  </section>:null;
  return <App mlRecognizer={recognizer} onStateChange={observe} study={{localOnly:true,expression:presentation.expression,storage:studySessionStore,onEvent,header,footer}}/>;
}
