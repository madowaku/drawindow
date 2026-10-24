// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {TimeComparison} from './Comparison';
vi.mock('./TempoCanvas',()=>({TempoCanvas:()=> <div/>}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('freezes its one shared clock when the panes leave view and resumes without catch-up',()=>{
  let pending:FrameRequestCallback|undefined,visibility:(entries:{isIntersecting:boolean}[])=>void=()=>{},observed:Element|undefined;
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{pending=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{pending=undefined;});
  vi.stubGlobal('IntersectionObserver',class {constructor(cb:typeof visibility){visibility=cb;}observe(element:Element){observed=element;}disconnect(){}});
  Element.prototype.scrollIntoView=vi.fn();
  render(<TimeComparison sketch={{id:'s',word:'cat',strokes:[{id:'ink',points:[{x:.1,y:.2,t:0},{x:.8,y:.7,t:1200}]}]}} mode="day" language="en" tempo="B" controls={{speed:1}} reducedMotion={false}/>);
  fireEvent.click(screen.getByRole('button',{name:'再生する'}));act(()=>pending?.(0));act(()=>pending?.(100));
  expect(observed?.classList.contains('time-panes')).toBe(true);
  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('100');
  act(()=>visibility([{isIntersecting:false}]));expect(pending).toBeUndefined();
  act(()=>visibility([{isIntersecting:true}]));act(()=>pending?.(100000));
  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('100');
  act(()=>pending?.(100100));expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('200');
});
