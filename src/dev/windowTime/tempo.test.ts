import {describe,it,expect} from 'vitest';
import {adoptedShizukuSketches} from '../../data/shizuku-doodles/adopted';
import {getPlaybackDuration,getPlaybackTip,strokesAtProgress} from '../../lib/playback';
import {characterDrawingProgress} from '../../lib/character';
import {planTempo,canvasProgress,TEMPOS} from './tempo';

const geometry=(strokes:ReturnType<typeof planTempo>['strokes'])=>strokes.map(s=>({id:s.id,points:s.points.map(({t:_,...p})=>p)}));
describe('window-time presentation only',()=>{
  it('keeps A exactly current and leaves all 291 adopted drawings untouched',()=>{
    expect(adoptedShizukuSketches).toHaveLength(291);
    for(const sketch of adoptedShizukuSketches){const before=JSON.stringify(sketch);
      for(const mode of ['day','night'] as const)for(const tempo of TEMPOS){const plan=planTempo(sketch.strokes,mode,tempo);
        expect(geometry(plan.strokes)).toEqual(geometry(sketch.strokes));
        expect(plan.drawingMs).toBeGreaterThan(0);
        if(tempo==='A'){expect(plan.strokes).toBe(sketch.strokes);expect(plan.drawingMs).toBe(getPlaybackDuration(sketch.strokes));expect(plan.breathMs).toBe(mode==='day'?650:280);}
        else expect(plan.drawingMs).toBeGreaterThanOrEqual(tempo==='B'?1800:2500);
      }
      expect(JSON.stringify(sketch)).toBe(before);
    }
  });
  it('uses stroke lengths, curvature and real pen-up gaps rather than a uniform slowdown',()=>{
    const strokes=[{id:'line',points:[{x:0,y:0,t:0},{x:.5,y:0,t:100}]},{id:'corner',points:[{x:.5,y:.5,t:130},{x:.8,y:.5,t:150},{x:.8,y:.8,t:180}]}];
    const b=planTempo(strokes,'day','B'),night=planTempo(strokes,'night','B');
    expect(night.breathMs).toBeGreaterThan(b.breathMs);expect(night.penUpMs).toBeGreaterThan(b.penUpMs);
    const gap=(b.strokes[0].points.at(-1)!.t+b.strokes[1].points[0].t)/2;
    const last=b.strokes.at(-1)!.points.at(-1)!.t;
    expect(getPlaybackTip(b.strokes,gap/last)).toBeNull();
    expect(b.strokes[1].points[0].t-b.strokes[0].points.at(-1)!.t).toBeCloseTo(b.penUpMs);
    expect(b.strokes[0].points.at(-1)!.t/100).not.toBeCloseTo((b.strokes[1].points[1].t-b.strokes[1].points[0].t)/20);
  });
  it('keeps ink endpoint and fingertip identical after adapting the Canvas clock',()=>{
    const strokes=[{id:'curve',points:[{x:.1,y:.2,t:0},{x:.4,y:.1,t:100},{x:.8,y:.7,t:200}]}];
    for(const tempo of ['B','C'] as const){const plan=planTempo(strokes,'night',tempo);
      for(const amount of [.01,.1,.3,.6,.83,.95,.999]){
        const elapsed=plan.leadMs+amount*(plan.drawingMs-plan.leadMs),ink=characterDrawingProgress(canvasProgress(plan,elapsed,'girl_drawing'));
        expect(ink).toBeCloseTo(amount,8);
        const tip=getPlaybackTip(plan.strokes,ink),end=strokesAtProgress(plan.strokes,ink).at(-1)!.points.at(-1)!;
        expect(tip?.x).toBeCloseTo(end.x);expect(tip?.y).toBeCloseTo(end.y);
      }
      expect(canvasProgress(plan,0,'girl_drawing')).toBe(0);expect(canvasProgress(plan,plan.drawingMs,'girl_drawing')).toBe(1);
    }
  });
  it('bounds invalid adjustments and keeps all geometry including isolated dots',()=>{
    const strokes=[{id:'empty',points:[]},{id:'dot',points:[{x:.2,y:.3,t:0}]}];
    const plan=planTempo(strokes,'day','C',{speed:NaN,hesitationMs:Infinity});
    expect(Number.isFinite(plan.drawingMs)).toBe(true);expect(geometry(plan.strokes)).toEqual(geometry(strokes));
    expect(plan.strokes[1].points[0].t).toBeCloseTo(plan.drawingMs-plan.leadMs);
    expect(planTempo(strokes,'day','A',{speed:.7,hesitationMs:700}).strokes).toBe(strokes);
  });
});
