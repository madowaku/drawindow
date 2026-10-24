// @vitest-environment jsdom
import {act,renderHook,cleanup} from '@testing-library/react';
import {useLayoutEffect} from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {useStudyClock} from './useStudyClock';
afterEach(()=>{cleanup();vi.unstubAllGlobals();Object.defineProperty(document,'hidden',{configurable:true,value:false});});
it('rejects an obsolete RAF even if invoked after the next phase rendered',()=>{
  let pending:FrameRequestCallback|undefined;vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{pending=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>undefined);
  const done=vi.fn(),{result,rerender}=renderHook(({key})=>useStudyClock(1000,true,key,done),{initialProps:{key:'old'}});
  act(()=>pending?.(0));const obsolete=pending;rerender({key:'new'});act(()=>obsolete?.(100));
  expect(result.current.at).toBe(0);expect(done).not.toHaveBeenCalled();
});
it('pauses hidden time, seeks, completes once, and paints a new phase from zero',()=>{
  let pending:FrameRequestCallback|undefined;
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{pending=callback;return 1;});
  vi.stubGlobal('cancelAnimationFrame',()=>{pending=undefined;});
  const done=vi.fn(),painted:number[]=[];
  const {result,rerender}=renderHook(({key})=>{const clock=useStudyClock(1000,true,key,done);useLayoutEffect(()=>{painted.push(clock.at);});return clock;},{initialProps:{key:'first'}});
  act(()=>pending?.(0));act(()=>pending?.(100));expect(result.current.at).toBe(100);
  act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect(pending).toBeUndefined();
  act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  act(()=>pending?.(100000));expect(result.current.at).toBe(100);act(()=>pending?.(100100));expect(result.current.at).toBe(200);
  act(()=>result.current.seek(950));act(()=>pending?.(100200));expect(result.current.at).toBe(1000);expect(done).toHaveBeenCalledTimes(1);
  painted.length=0;rerender({key:'second'});expect(painted.every(at=>at===0)).toBe(true);expect(result.current.at).toBe(0);
});
