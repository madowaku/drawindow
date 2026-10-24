// @vitest-environment jsdom
import {cleanup,render} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import * as tempoModule from '../../lib/drawingTempo';
import {TempoCanvas} from './TempoCanvas';
vi.mock('../../components/WindowCanvas',()=>({WindowCanvas:()=> <div/>}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('does not retime or rescan player geometry when a new pointer sample is published',()=>{
  const plan=vi.spyOn(tempoModule,'planTempo'),strokes=[{id:'human',points:[{x:.2,y:.3,t:0}]}];
  const props={phase:'player_drawing' as const,mode:'day' as const,tempo:'B' as const,controls:{speed:1},strokes,reducedMotion:false,onStrokesChange:()=>{},onBreathDone:()=>{},onPlaybackDone:()=>{}};
  const view=render(<TempoCanvas {...props}/>);expect(plan.mock.calls[0][0]).toHaveLength(0);const calls=plan.mock.calls.length;
  view.rerender(<TempoCanvas {...props} strokes={[{...strokes[0],points:[...strokes[0].points,{x:.8,y:.6,t:20}]}]}/>);
  expect(plan).toHaveBeenCalledTimes(calls);
});
