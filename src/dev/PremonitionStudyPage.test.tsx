// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PremonitionStudyPage } from './PremonitionStudyPage';
import type { WindowCanvasProps } from '../core/types';
import { createInitialState, gameReducer } from '../core/gameMachine';
import { encodeSession } from '../lib/sessionStorage';
import { gameSketches } from '../data/gameSketches';
const stored=vi.hoisted(()=>({read:vi.fn(async():Promise<unknown>=>undefined)}));
vi.mock('../components/WindowCanvas',()=>({WindowCanvas:(p:WindowCanvasProps)=><div>
 {p.phase==='girl_breath'&&<button onClick={p.onBreathDone}>Finish breath</button>}{p.phase==='girl_drawing'&&<button onClick={p.onPlaybackDone}>Finish picture</button>}
 {p.phase==='player_drawing'&&<button onClick={()=>p.onStrokesChange([{id:'synthetic',points:[{x:.2,y:.3,t:0},{x:.7,y:.8,t:10}]}])}>Draw synthetic mark</button>}
 </div>}));
vi.mock('../components/CharacterScene',()=>({CharacterScene:(p:{frameOverride?:string;phase:string})=><div data-testid="pose" data-pose={p.frameOverride??p.phase}/>,characterArt:(name:string)=>name}));
vi.mock('../components/SketchThumbnail',()=>({SketchThumbnail:()=> <div>Recorded drawing</div>}));
vi.mock('../services/quickDrawRecognizer',()=>({preloadQuickDrawModel:vi.fn(async()=>{}),createQuickDrawRecognizer:()=>({recognize:async()=>({guess:null,source:'ml'})})}));
vi.mock('./premonition/storage',()=>({studySessionStore:{read:stored.read,write:async()=>{}}}));
vi.mock('./windowTime/cPremonitionStorage',()=>({cPremonitionStore:{read:async()=>undefined,write:async()=>{}}}));
beforeEach(()=>{stored.read.mockResolvedValue(undefined);localStorage.clear();localStorage.setItem('drawindow-language','en');window.scrollTo=vi.fn();Object.defineProperty(window,'matchMedia',{writable:true,value:()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})});});
afterEach(cleanup);
async function finish(resumed=false){
 if(!resumed)fireEvent.click(screen.getByRole('button',{name:/START GAME/}));
 for(let i=0;i<5;i++){
  if(!(resumed&&i===0)){
  await screen.findByRole('button',{name:'Finish breath'});fireEvent.click(screen.getByRole('button',{name:'Finish breath'}));fireEvent.click(screen.getByRole('button',{name:'Finish picture'}));
  // Finish any Japanese cosmetic slip is not needed in this English fixture.
  fireEvent.click(screen.getByRole('button',{name:'YOUR TURN'}));}
  fireEvent.click(screen.getByRole('button',{name:'Draw synthetic mark'}));
  fireEvent.click(screen.getByRole('button',{name:'DONE'}));
 }
 await waitFor(()=>expect(screen.getAllByRole('textbox',{name:'I drew a…'})).toHaveLength(5));
 fireEvent.click(screen.getByRole('button',{name:'REVEAL OUR CHAIN'}));
 await screen.findByRole('region',{name:'終了後の比較と感想'});
}
it('plays actual five exchanges with four A results and anonymous switching never invokes recognition',async()=>{
 const recognize=vi.fn(async()=>({guess:'circle',source:'ml' as const}));
 render(<PremonitionStudyPage recognizer={{recognize}} initialAssignment={{X:'D',Y:'A',order:['X','Y']}}/>);
 expect(screen.queryByRole('region',{name:'終了後の比較と感想'})).toBeNull();
 expect(screen.queryByText(/表示X: D/)).toBeNull();
 await finish();expect(recognize).toHaveBeenCalledTimes(4);
 for(const call of recognize.mock.calls)expect(JSON.stringify(call)).not.toMatch(/intendedWord|previousWord|evaluation/);
 const slider=screen.getByRole('slider',{name:'再生位置'});
 fireEvent.click(screen.getByRole('button',{name:'次の認識直後'}));const position=(slider as HTMLInputElement).value;
 fireEvent.click(screen.getByRole('button',{name:'表示 Y'}));expect((slider as HTMLInputElement).value).toBe(position);
 expect(screen.getByText(/実プレイした表示: X。/)).toBeTruthy();
 fireEvent.click(screen.getByRole('checkbox',{name:'並べて比較する'}));
 expect(screen.getByTestId('replay-X').getAttribute('data-entry-count')).toBe(screen.getByTestId('replay-Y').getAttribute('data-entry-count'));
 expect(screen.getByTestId('replay-X').getAttribute('data-connected')).toBe(screen.getByTestId('replay-Y').getAttribute('data-connected'));
 expect(recognize).toHaveBeenCalledTimes(4);
 expect((screen.getByLabelText('X しずくらしいと感じた') as unknown as HTMLSelectElement).value).toBe('');
 expect((screen.getByRole('button',{name:'描画を含む再生JSONを保存'}) as HTMLButtonElement).disabled).toBe(true);
});
it('records only post-restore live exposure and preserves the partial-trial disclosure',async()=>{
 let state=gameReducer(createInitialState(),{type:'START',mode:'day',sessionKind:'ml',sketches:gameSketches('en')});
 for(const event of [{type:'BREATH_DONE'},{type:'PLAYBACK_DONE'},{type:'YOUR_TURN'}] as const)state=gameReducer(state,event);
 stored.read.mockResolvedValue(encodeSession(state,{}));
 render(<PremonitionStudyPage recognizer={{recognize:async()=>({guess:'circle',source:'ml'})}} initialAssignment={{X:'D',Y:'A',order:['X','Y']}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'CONTINUE DRAWING'}));
 await finish(true);
 expect(screen.getByText(/途中復元以後の部分記録/)).toBeTruthy();
 expect(screen.getByText(/実プレイした表示: X。/)).toBeTruthy();
});

it('runs C-fixed anonymous five-exchange comparison without extra inference or longer expressions',async()=>{
 const recognize=vi.fn(async()=>({guess:'circle',source:'ml' as const}));
 render(<PremonitionStudyPage recognizer={{recognize}} initialAssignment={{X:'D',Y:'A',order:['X','Y']}} tempoC/>);
 expect(screen.getByText(/Cの初期テンポに固定/)).toBeTruthy();
 await finish();expect(recognize).toHaveBeenCalledTimes(4);
 fireEvent.click(screen.getByRole('checkbox',{name:'並べて比較する'}));
 const x=screen.getByTestId('replay-X'),y=screen.getByTestId('replay-Y');
 for(const attribute of ['data-round','data-entry-count','data-connected'])expect(x.getAttribute(attribute)).toBe(y.getAttribute(attribute));
 expect(screen.getAllByText(/昼240ms・夜160ms/).length).toBeGreaterThan(0);
});
