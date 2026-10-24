// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import type {WindowCanvasProps} from '../core/types';
import {WindowTimePage} from './WindowTimePage';
vi.mock('../components/SketchThumbnail',()=>({SketchThumbnail:({label}:{label:string})=><div role="img" aria-label={label}/>}));
vi.mock('./windowTime/TempoCanvas',()=>({TempoCanvas:(p:WindowCanvasProps)=><div>
 {p.phase==='girl_breath'&&<button onClick={p.onBreathDone}>Finish breath</button>}{p.phase==='girl_drawing'&&<button onClick={p.onPlaybackDone}>Finish drawing</button>}
 {p.phase==='player_drawing'&&<button onClick={()=>p.onStrokesChange([{id:'mark',points:[{x:.2,y:.3,t:0},{x:.7,y:.8,t:500}]}])}>Draw test line</button>}
 </div>}));
vi.mock('./windowTime/storage',()=>({timeSessionStore:{read:async()=>undefined,write:async()=>{}}}));
vi.mock('../services/quickDrawRecognizer',()=>({preloadQuickDrawModel:async()=>{},createQuickDrawRecognizer:()=>({recognize:async()=>({guess:null,source:'ml'})})}));
beforeEach(()=>{localStorage.clear();localStorage.setItem('drawindow-language','en');window.scrollTo=vi.fn();Element.prototype.scrollIntoView=vi.fn();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function finish(language:'en'|'ja'){
 fireEvent.click(screen.getByRole('button',{name:language==='en'?'English':'日本語'}));
 fireEvent.click(screen.getByRole('button',{name:language==='en'?'START GAME':'はじめる'}));
 for(let round=0;round<5;round++){
  fireEvent.click(await screen.findByRole('button',{name:'Finish breath'}));fireEvent.click(screen.getByRole('button',{name:'Finish drawing'}));
  fireEvent.click(screen.getByRole('button',{name:language==='en'?'YOUR TURN':'あなたの番'}));fireEvent.click(screen.getByRole('button',{name:'Draw test line'}));fireEvent.click(screen.getByRole('button',{name:language==='en'?'DONE':'できた'}));
 }
 await waitFor(()=>expect(document.querySelectorAll('.review-row')).toHaveLength(5));fireEvent.click(screen.getByRole('button',{name:language==='en'?'REVEAL OUR CHAIN':'答えあわせ'}));
 const slider=await screen.findByRole('slider',{name:'共通の再生位置'});fireEvent.change(slider,{target:{value:slider.getAttribute('max')}});
 for(const t of ['A','B','C'])expect(screen.getByTestId(`tempo-${t}`).getAttribute('data-entries')).toBe('10');
}
it('starts a fresh recorder when play remounts and keeps a second language/session replay consistent',async()=>{
 const recognize=vi.fn(async(request:{language?:string})=>({source:'ml' as const,guess:request.language==='ja'?'まる':'circle'}));
 render(<WindowTimePage recognizer={{recognize}}/>);
 fireEvent.click(screen.getByRole('button',{name:'５往復を試す'}));await finish('en');
 expect(document.querySelector('.time-header')?.classList.contains('is-live')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'単体の絵へ戻る'}));fireEvent.click(screen.getByRole('button',{name:'５往復を試す'}));await finish('ja');
 expect(recognize).toHaveBeenCalledTimes(8);
});
