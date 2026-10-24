import { useEffect,useMemo,useState,useRef } from 'react';
import type { GirlSketch,Mode,Language } from '../../core/types';
import { selectVisibleStrokes } from '../../core/gameMachine';
import { calculateScore } from '../../core/score';
import type { StudyRecording } from '../premonition/recording';
import { TempoCanvas } from './TempoCanvas';
import { planTempo,TEMPOS,TEMPO_NAMES,type Tempo,type TempoControls } from './tempo';
import { tempoReplay } from './replay';
import { useStudyClock } from './useStudyClock';

const noop=()=>undefined;
export function TimeComparison({sketch,mode,language,tempo,controls,reducedMotion,recording}:{sketch:GirlSketch;mode:Mode;language:Language;tempo:Tempo;controls:TempoControls;reducedMotion:boolean;recording?:StudyRecording}){
  const [playing,setPlaying]=useState(false),[parallel,setParallel]=useState(true),[cycle,setCycle]=useState(0);
  const section=useRef<HTMLElement>(null);
  const panes=useRef<HTMLDivElement>(null),[onScreen,setOnScreen]=useState(true);
  useEffect(()=>{if(!panes.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>setOnScreen(entries.at(-1)?.isIntersecting??false));observer.observe(panes.current);return()=>observer.disconnect();},[]);
  const plans=useMemo(()=>Object.fromEntries(TEMPOS.map(t=>[t,planTempo(sketch.strokes,mode,t,controls)])) as Record<Tempo,ReturnType<typeof planTempo>>,[sketch,mode,controls.speed,controls.hesitationMs]);
  const timelines=useMemo(()=>recording?Object.fromEntries(TEMPOS.map(t=>[t,tempoReplay(recording,t,controls)])) as Record<Tempo,ReturnType<typeof tempoReplay>>:undefined,[recording,controls.speed,controls.hesitationMs]);
  const limit=timelines?Math.max(...TEMPOS.map(t=>timelines[t].at(-1)?.playAt??0)):Math.max(...TEMPOS.map(t=>plans[t].breathMs+plans[t].drawingMs))+1000;
  const clock=useStudyClock(limit,playing&&!reducedMotion,`${sketch.id}:${language}:${mode}:${controls.speed}:${controls.hesitationMs}:${cycle}:${Boolean(recording)}`,()=>setPlaying(false),onScreen);
  const reset=()=>{setPlaying(false);setCycle(c=>c+1);};
  return <section ref={section} className="time-comparison" aria-label={recording?'同一記録の３テンポ再生':'同じ絵の３テンポ比較'}>
    <div className="time-transport"><div className="time-actions"><button onClick={reset}>最初へ</button><button disabled={reducedMotion||clock.at>=limit} onClick={()=>{if(!playing)section.current?.scrollIntoView({block:'start'});setPlaying(p=>!p);}}>{playing?'一時停止':'再生する'}</button><label><input type="checkbox" checked={parallel} onChange={e=>setParallel(e.target.checked)}/>３つを並べる</label></div>
    <label className="time-slider">共通の再生位置 <output>{(clock.at/1000).toFixed(2)} / {(limit/1000).toFixed(2)}秒</output><input aria-label="共通の再生位置" type="range" min="0" max={limit} step="10" value={clock.at} onChange={e=>{setPlaying(false);clock.seek(Number(e.target.value));}}/></label></div>
    {recording&&<p className="time-note">同じ認識結果と５往復を再推論せず再生します。動作時間だけを各設定へ置き換えるため、同じ時刻では往復の位置が異なります。答え合わせ・またねは実プレイ画面で評価します。{recording.completeness==='partial'?'途中復元以後の部分記録です。':''}</p>}
    <div ref={panes} className={`time-panes ${parallel?'is-parallel':''}`}>{(parallel?TEMPOS:[tempo]).map(t=>{
      const plan=plans[t];
      const frame=timelines?[...timelines[t]].reverse().find(f=>f.playAt<=clock.at):undefined;
      const sourcePhase=frame?.state.phase??(clock.at<plan.breathMs?'girl_breath':clock.at<plan.breathMs+plan.drawingMs?'girl_drawing':'girl_holding');
      const phase=reducedMotion&&(sourcePhase==='girl_breath'||sourcePhase==='girl_drawing')?'girl_holding':sourcePhase;
      const state=frame?.state,elapsed=frame?clock.at-frame.playAt:phase==='girl_drawing'?clock.at-plan.breathMs:clock.at;
      const actualPlan=state?planTempo(selectVisibleStrokes(state),state.mode,t,controls):plan;
      const score=state?calculateScore(state.entries,state.sessionKind,state.language):undefined;
      return <article key={t} data-testid={`tempo-${t}`} data-phase={phase} data-drawing-ms={actualPlan.drawingMs} data-round={state?.round??1} data-entries={state?.entries.length??1} data-score={score?.connectedCount??''}>
        <h3>{t} · {TEMPO_NAMES[t]}</h3><p className="time-metric">息 {(actualPlan.breathMs/1000).toFixed(2)}秒 · 描画 {(actualPlan.drawingMs/1000).toFixed(2)}秒</p>
        <div className="time-window"><TempoCanvas tempo={t} controls={controls} atMs={elapsed} paused={!playing||!clock.shown||!onScreen} phase={phase} mode={state?.mode??mode} language={state?.language??language} round={state?.round??1} strokes={state?selectVisibleStrokes(state):sketch.strokes} previousStrokes={state?.entries.at(-1)?.falseStart?.strokes} reducedMotion={reducedMotion} onBreathDone={noop} onPlaybackDone={noop} onStrokesChange={noop}/><div className="time-input-shield"/></div>
        <p className="time-phase">{phase==='girl_breath'?'窓に息を':phase==='girl_drawing'?'一筆ずつ':phase==='girl_holding'?'描き終えた窓':phase==='girl_notice'?'あっ。':phase==='girl_flustered'?'……もう一回。':phase==='results'?'５往復の記録':phase==='recognizing'?'絵を受け取る':phase==='player_drawing'?'プレイヤーの時間':phase}</p>
      </article>;
    })}</div>
    {!recording&&<div className="time-rhythm" aria-label="往復から別れまでの時間の地図"><h3>窓辺の時間の地図</h3><ol><li>絵を受け取る <small>認識の実時間・追加待ちなし</small></li><li>息を・ためらい・線 <small>上の共通時計で比較</small></li><li>描き終えた窓 <small>「あなたの番」はすぐ押せる</small></li><li>眺める・描く <small>プレイヤーの時間・制限なし</small></li><li>５往復で絵日記へ <small>A: 1.00秒 / B: 1.25秒 / C: 1.50秒ごとに１組</small></li><li>すれ違いの答え合わせ <small>A: 0.65秒 / B: 0.85秒 / C: 1.00秒ごとに１リンク</small></li><li>またね <small>本人の操作で開く・いつでも絵へ戻れる</small></li></ol></div>}
  </section>;
}
