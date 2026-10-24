import { useEffect, useMemo, useRef, useState } from 'react';
import { CharacterScene } from '../../components/CharacterScene';
import { SketchThumbnail } from '../../components/SketchThumbnail';
import { selectVisibleStrokes } from '../../core/gameMachine';
import { calculateScore } from '../../core/score';
import { detectPremonitionTransition } from './logic';
import { replayRecording, type StudyRecording } from './recording';
import type { BlindAssignment, BlindLabel } from './evaluation';

export function PremonitionReplay({ recording, assignment, label, reducedMotion, onExposure }: {recording:StudyRecording;assignment:BlindAssignment;label:BlindLabel;reducedMotion:boolean;onExposure?:(labels:readonly BlindLabel[],kind:'single'|'paired')=>void}) {
  const timeline=useMemo(()=>{
    const raw=replayRecording(recording);
    let at=0;
    return raw.map((frame,index)=>{
      if(index)at+=Math.min(1000,Math.max(100,frame.atMs-raw[index-1].atMs));
      return {...frame,playAt:at,beat:detectPremonitionTransition(raw[index-1]?.state??null,frame.state)};
    }).filter((frame,index,all)=>!['STROKES_CHANGED','SET_INTENT'].includes(frame.event?.type??'')||all[index+1]?.event?.type!==frame.event?.type);
  },[recording]);
  const [clock,setClock]=useState(0),[playing,setPlaying]=useState(false),[both,setBoth]=useState(false);
  const limit=timeline.at(-1)?.playAt??0;
  const elapsed=useRef<number|null>(null);
  const beatRef=useRef<string|undefined>(undefined);
  const [visible,setVisible]=useState(()=>!document.hidden);
  const [suppressedBeat,setSuppressedBeat]=useState<string|undefined>(undefined);
  useEffect(()=>{
    const changed=()=>{setVisible(!document.hidden);if(document.hidden){setPlaying(false);setSuppressedBeat(beatRef.current);elapsed.current=null;}};
    document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);
  },[]);
  useEffect(()=>{if(visible)onExposure?.(both?['X','Y']:[label],both?'paired':'single');},[both,label,onExposure,visible]);
  useEffect(()=>{setClock(0);setPlaying(false);},[recording]);
  useEffect(()=>{
    if(!playing||reducedMotion)return;
    let handle=0;
    const visible=()=>{elapsed.current=null;if(document.hidden)setPlaying(false);};
    const tick=(now:number)=>{
      if(document.hidden){elapsed.current=null;return;}
      if(elapsed.current!==null){const step=Math.min(100,now-elapsed.current);setClock(value=>Math.min(limit,value+step));}
      elapsed.current=now;handle=requestAnimationFrame(tick);
    };
    elapsed.current=null;handle=requestAnimationFrame(tick);document.addEventListener('visibilitychange',visible);
    return()=>{cancelAnimationFrame(handle);document.removeEventListener('visibilitychange',visible);elapsed.current=null;};
  },[playing,reducedMotion,limit]);
  useEffect(()=>{if(reducedMotion)setPlaying(false);},[reducedMotion]);
  useEffect(()=>{if(clock>=limit)setPlaying(false);},[clock,limit]);
  const frame=[...timeline].reverse().find(item=>item.playAt<=clock)??timeline[0];
  if(!frame)return null;
  const event=frame.beat;beatRef.current=event?.id;
  const dExpression=visible&&event?.id!==suppressedBeat&&!reducedMotion&&event&&!event.suppressionReason&&clock-frame.playAt<event.candidate.durationMs?event.candidate.expression:undefined;
  const score=calculateScore(frame.state.entries,frame.state.sessionKind,frame.state.language);
  const nextBeat=()=>{setSuppressedBeat(undefined);setPlaying(false);const next=timeline.find(item=>item.playAt>clock&&item.beat);setClock(next?.playAt??limit);};
  return <section className="premonition-replay" aria-label="同じ記録の比較再生">
    <h2>同じ窓の記録を見返す</h2><p>再推論はしません。絵は記録の静止表示、長い待ち時間を短縮した共通時計で表情を比較します。一時停止・手動位置では表情も静止比較です。実プレイのテンポ評価とは分けてください。</p>
    <div className="premonition-actions"><button onClick={()=>{setSuppressedBeat(undefined);setClock(0);setPlaying(false);}}>最初へ</button><button disabled={reducedMotion||clock>=limit} onClick={()=>setPlaying(value=>!value)}>{playing?'再生を止める':'記録を再生'}</button><button onClick={nextBeat}>次の認識直後</button><label><input type="checkbox" checked={both} onChange={e=>setBoth(e.target.checked)}/> 並べて比較する</label></div>
    <label>再生位置<input aria-label="再生位置" type="range" min="0" max={limit} step="10" value={clock} onChange={e=>{setSuppressedBeat(undefined);setPlaying(false);setClock(Number(e.target.value));}}/></label>
    {reducedMotion&&<p>動きを減らす設定では自動再生と追加の短い表情を止めています。位置を選んで見返せます。</p>}
    <div className={`premonition-replay-panes ${both?'is-paired':''}`}>{(both?(['X','Y'] as const):[label]).map(slot=><article key={slot} data-testid={`replay-${slot}`} data-round={frame.state.round} data-entry-count={frame.state.entries.length} data-connected={score.connectedCount}>
      <h3>表示 {slot}</h3><div className="premonition-replay-window"><CharacterScene mode={frame.state.mode} phase={frame.state.phase} reducedMotion={reducedMotion} round={frame.state.round} frameOverride={assignment[slot]==='D'?dExpression:undefined}/><div className="premonition-replay-glass"/><SketchThumbnail strokes={selectVisibleStrokes(frame.state)} label="記録した絵"/></div>
      <p>{frame.state.mode==='day'?'DAY':'NIGHT'} · {frame.state.round}/5 · 記録 {frame.state.entries.length}/10枚</p>
    </article>)}</div>
  </section>;
}
