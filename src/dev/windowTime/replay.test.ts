import {expect,it} from 'vitest';
import {createInitialState,gameReducer} from '../../core/gameMachine';
import {gameSketches} from '../../data/gameSketches';
import {calculateScore} from '../../core/score';
import type {GameEvent,Language,Mode} from '../../core/types';
import {PremonitionRecorder} from '../premonition/recording';
import {tempoReplay} from './replay';
import {TEMPOS} from './tempo';

function fixture(language:Language,mode:Mode){
  let state=createInitialState(mode,language),now=0;
  const recorder=new PremonitionRecorder(()=>now);recorder.observeInitial(state);
  const send=(event:GameEvent)=>{now+=200;recorder.record(event);state=gameReducer(state,event);};
  send({type:'START',mode,sessionKind:'ml',sketches:gameSketches(language)});
  for(let round=1;round<=5;round++){
    for(let beat=0;beat<9;beat++){
      if(state.phase==='girl_breath')send({type:'BREATH_DONE'});
      else if(state.phase==='girl_drawing')send({type:'PLAYBACK_DONE'});
      else if(state.phase==='girl_notice'||state.phase==='girl_flustered')send({type:'GIRL_OOPS_BEAT_DONE',phase:state.phase,round:state.round,sessionId:state.sessionId});
      else break;
    }
    send({type:'YOUR_TURN'});send({type:'STROKES_CHANGED',strokes:[{id:`mark${round}`,points:[{x:.2,y:.3,t:0},{x:.6,y:.7,t:500}]}]});send({type:'DONE'});
    if(round<5)send({type:'RECOGNITION_RESOLVED',requestId:state.recognitionRequest!.requestId,result:{source:'ml',guess:language==='en'?'circle':'まる'}});
  }
  send({type:'SHOW_RESULTS'});return {state,recording:recorder.recording!};
}
it('preserves every reducer state, A recognition, next sketch and score across all three five-exchange clocks',()=>{
  for(const language of ['en','ja'] as const)for(const mode of ['day','night'] as const){
    const {state,recording}=fixture(language,mode);
    const timelines=TEMPOS.map(t=>tempoReplay(recording,t,{speed:1}));
    expect(state.entries).toHaveLength(10);expect(state.recognitionRequest).toBeNull();expect(state.phase).toBe('results');
    const expected=timelines[0].map(f=>f.state);
    for(const timeline of timelines){expect(timeline.map(f=>f.state)).toEqual(expected);expect(calculateScore(timeline.at(-1)!.state.entries,'ml',language)).toEqual(calculateScore(state.entries,'ml',language));}
    expect(recording.events.filter(e=>e.event.type==='RECOGNITION_RESOLVED')).toHaveLength(4);
    expect(timelines[1].at(-1)!.playAt).toBeGreaterThan(timelines[0].at(-1)!.playAt);
    expect(timelines[2].at(-1)!.playAt).toBeGreaterThan(timelines[1].at(-1)!.playAt);
  }
});
