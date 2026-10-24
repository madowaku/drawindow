import type { Mode, Stroke } from '../../core/types';
import { getPlaybackDuration } from '../../lib/playback';

export type Tempo = 'A' | 'B' | 'C';
export interface TempoControls { speed: number; hesitationMs?: number; }
export interface TempoPlan {
  tempo: Tempo; strokes: readonly Stroke[]; drawingMs: number; breathMs: number;
  leadMs: number; penUpMs: number; quiet: boolean;
}
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export const TEMPOS:readonly Tempo[]=['A','B','C'];
export const TEMPO_NAMES:Record<Tempo,string>={A:'現行',B:'ゆったり',C:'とてもゆったり'};

/** Runtime geometry only; no word, recognition, score or intention inputs.
 * Retiming copies timestamps only. Segment weights slow turns and endpoints,
 * while explicit pen-up gaps keep separate strokes separate.
 */
export function planTempo(strokes:readonly Stroke[],mode:Mode,tempo:Tempo,controls:TempoControls={speed:1}):TempoPlan {
  if(tempo==='A')return {tempo,strokes,drawingMs:getPlaybackDuration(strokes),breathMs:mode==='day'?650:280,leadMs:getPlaybackDuration(strokes)*.14,penUpMs:0,quiet:false};
  const speed=Number.isFinite(controls.speed)?clamp(controls.speed,.7,1.4):1;
  const paths=strokes.filter(s=>s.points.length>0);
  let length=0,turns=0;
  const weights=paths.map(stroke=>stroke.points.slice(1).map((point,index)=>{
    const previous=stroke.points[index],distance=Math.hypot(point.x-previous.x,point.y-previous.y);
    length+=distance;
    const after=stroke.points[index+2];
    let corner=0;
    if(after&&distance>0){const next=Math.hypot(after.x-point.x,after.y-point.y);if(next>0)corner=Math.acos(clamp(((point.x-previous.x)*(after.x-point.x)+(point.y-previous.y)*(after.y-point.y))/(distance*next),-1,1))/Math.PI;}
    turns+=corner;
    return Math.max(.00001,distance)*(1+.6*corner+(index===0||index===stroke.points.length-2 ? .28 : 0));
  }));
  const dayLead=tempo==='B'?240:340;
  const defaultLead=dayLead+(mode==='night'?80:0);
  const leadMs=Number.isFinite(controls.hesitationMs)?clamp(controls.hesitationMs!,0,700):defaultLead;
  const base=tempo==='B'?clamp(1650+length*115+paths.length*42+turns*6,1800,3000):clamp(2350+length*140+paths.length*48+turns*8,2500,4000);
  // Give NIGHT its extra lead/gaps as time, rather than stealing those
  // milliseconds from ink movement to fit the DAY budget.
  const nightGaps=mode==='night'?Math.min(220,Math.max(0,paths.length-1)*25):0;
  const drawingMs=Math.round((base-dayLead)/speed+leadMs+nightGaps);
  const penUpMs=paths.length>1?Math.min(tempo==='B'?(mode==='day'?85:110):(mode==='day'?115:140),(drawingMs-leadMs)*.28/(paths.length-1)):0;
  const motionMs=Math.max(1,drawingMs-leadMs-penUpMs*Math.max(0,paths.length-1));
  const sums=weights.map(w=>Math.max(.02,w.reduce((a,b)=>a+b,0))),total=sums.reduce((a,b)=>a+b,0)||1;
  let cursor=0,pathIndex=0;
  const timed=strokes.map(stroke=>{
    if(!stroke.points.length)return {...stroke,points:[]};
    const index=pathIndex++,duration=motionMs*sums[index]/total;
    const segmentSum=weights[index].reduce((a,b)=>a+b,0)||1;
    let elapsed=0;
    const points=stroke.points.map((point,i)=>{if(i)elapsed+=weights[index][i-1]/segmentSum*duration;return {...point,t:cursor+(stroke.points.length===1?duration:elapsed)};});
    cursor+=duration+penUpMs;
    return {...stroke,points};
  });
  return {tempo,strokes:timed,drawingMs,breathMs:tempo==='B'?(mode==='day'?800:950):(mode==='day'?950:1100),leadMs,penUpMs,quiet:true};
}

/** Adapt the shared clock to the original Canvas' 14% hold and final easing.
 * Inverting that easing prevents applying it twice to the retimed geometry.
 */
export function canvasProgress(plan:TempoPlan,elapsedMs:number,phase:'girl_breath'|'girl_drawing'):number {
  const elapsed=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0;
  if(phase==='girl_breath')return clamp(elapsed/plan.breathMs,0,1);
  if(plan.tempo==='A')return clamp(elapsed/plan.drawingMs,0,1);
  if(elapsed<plan.leadMs)return plan.leadMs>0?.14*elapsed/plan.leadMs:0;
  const ink=clamp((elapsed-plan.leadMs)/Math.max(1,plan.drawingMs-plan.leadMs),0,1);
  const inverse=ink<.82?ink:.82+Math.pow((ink-.82)/.18,1/.8)*.18;
  return .14+inverse*.86;
}

export function endingTempo(tempo:Tempo,restored=false) {
  return tempo==='A'?undefined:{pairMs:tempo==='B'?1250:1500,linkMs:tempo==='B'?850:1000,arrivalMs:tempo==='B'?600:700,goodbyeMs:tempo==='B'?5000:6000,skipIntro:restored};
}
