import { expect, it } from 'vitest';
import { createInitialState } from '../../core/gameMachine';
import { createReplayTimeline } from './timeline';
import type { StudyRecording } from './recording';

const strokes=[{id:'line',points:[{x:.1,y:.2,t:0},{x:.9,y:.8,t:1500}]}];
function recording():StudyRecording { return {version:1,completeness:'complete',initialState:createInitialState(),events:[
  {atMs:0,event:{type:'START',mode:'day',sessionKind:'ml',sketches:[{id:'cat',word:'cat',strokes}]}},
  {atMs:650,event:{type:'BREATH_DONE'}},
  {atMs:2150,event:{type:'PLAYBACK_DONE'}},
  {atMs:22150,event:{type:'YOUR_TURN'}},
  {atMs:22200,event:{type:'STROKES_CHANGED',strokes}},
  {atMs:22300,event:{type:'STROKES_CHANGED',strokes}},
]}; }
it('retains recorded waits and every event, including both stroke publications',()=>{
  const record=recording(),timeline=createReplayTimeline(record);
  expect(timeline).toHaveLength(record.events.length+1);
  expect(timeline.at(-1)!.playAt).toBe(22300);
  expect(timeline.find(f=>f.state.phase==='girl_drawing')!.durationMs).toBe(1500);
  expect(timeline.filter(f=>f.event?.type==='STROKES_CHANGED')).toHaveLength(2);
});
it('never squeezes a 1500ms drawing or a breath into an abbreviated synthetic trace',()=>{
  const record=recording();record.events.forEach((e,i)=>e.atMs=i*10);
  const timeline=createReplayTimeline(record),drawing=timeline.findIndex(f=>f.state.phase==='girl_drawing');
  expect(timeline[drawing].playAt-timeline[drawing-1].playAt).toBe(650);
  expect(timeline[drawing+1].playAt-timeline[drawing].playAt).toBe(1500);
});
