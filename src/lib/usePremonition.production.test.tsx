// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createInitialState,gameReducer} from '../core/gameMachine';
import {usePremonition} from './usePremonition';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllEnvs();});
it('runs D in production without collecting research events or mutating accepted A',()=>{
 vi.stubEnv('DEV',false);vi.useFakeTimers();let before=gameReducer(createInitialState('day','en'),{type:'START',mode:'day',sessionKind:'ml',sketches:['cat','tree','egg'].map(word=>({id:word,word,strokes:[]}))});
 for(const type of ['BREATH_DONE','PLAYBACK_DONE','YOUR_TURN'] as const)before=gameReducer(before,{type});
 before=gameReducer(before,{type:'STROKES_CHANGED',strokes:[{id:'human',points:[{x:.2,y:.3,t:0}]}]});before=gameReducer(before,{type:'DONE'});
 const after=gameReducer(before,{type:'RECOGNITION_RESOLVED',requestId:before.recognitionRequest!.requestId,result:{source:'ml',guess:'tree'}});const saved=JSON.stringify(after);
 const view=renderHook(({state})=>usePremonition(state,true,false),{initialProps:{state:before}});view.rerender({state:after});
 expect(view.result.current.expression).toBe('smile');expect(view.result.current.events).toEqual([]);act(()=>vi.advanceTimersByTime(240));expect(view.result.current.expression).toBeUndefined();expect(JSON.stringify(after)).toBe(saved);
});
