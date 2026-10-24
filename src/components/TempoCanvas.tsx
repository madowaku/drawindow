import { useEffect, useMemo, useRef, useState } from 'react';
import { WindowCanvas } from './WindowCanvas';
import type { WindowCanvasProps,Stroke } from '../core/types';
import { planTempo,canvasProgress,type Tempo,type TempoControls } from '../lib/drawingTempo';
import { usePresentationClock } from '../lib/usePresentationClock';
const NO_STROKES:readonly Stroke[]=[];

export function TempoCanvas({tempo,controls,skipEpoch=0,atMs,paused=false,...props}:WindowCanvasProps&{tempo:Tempo;controls:TempoControls;skipEpoch?:number;atMs?:number;paused?:boolean}) {
  const host=useRef<HTMLDivElement>(null),consumed=useRef(skipEpoch);
  const [onScreen,setOnScreen]=useState(true);
  const timed=props.phase==='girl_breath'||props.phase==='girl_drawing';
  // Player samples flow straight to the original pointer/keyboard pipeline.
  // Do not rescan and retime the growing drawing on every input publication.
  const girl=props.phase.startsWith('girl_'),source=girl?props.strokes:NO_STROKES;
  const plan=useMemo(()=>planTempo(source,props.mode,tempo,controls),[source,props.mode,tempo,controls.speed,controls.hesitationMs]);
  const duration=props.phase==='girl_breath'?plan.breathMs:plan.drawingMs;
  const complete=()=>{if(props.phase==='girl_breath')props.onBreathDone();else if(props.phase==='girl_drawing')props.onPlaybackDone();};
  const clock=usePresentationClock(props.reducedMotion?0:duration,tempo!=='A'&&timed&&atMs===undefined,`${props.mode}:${props.phase}:${props.round}:${tempo}`,complete,onScreen);
  useEffect(()=>{if(!host.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>setOnScreen(entries.at(-1)?.isIntersecting??false));observer.observe(host.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(skipEpoch!==consumed.current){consumed.current=skipEpoch;if(timed)complete();}},[skipEpoch]);
  const controlled=atMs!==undefined||(tempo!=='A'&&timed);
  const elapsed=atMs??clock.at;
  const progress=timed?canvasProgress(plan,elapsed,props.phase as 'girl_breath'|'girl_drawing'):1;
  return <div ref={host} className="tempo-canvas-host" data-tempo={tempo} data-elapsed={elapsed} data-duration={duration}>
    <WindowCanvas {...props} calm={tempo!=='A'} strokes={girl?plan.strokes:props.strokes} presentationPlayback={controlled?{progress,paused:paused||!clock.shown}:undefined}/>
  </div>;
}
