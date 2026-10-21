import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer, selectVisibleStrokes } from './gameMachine';
import type { GameState, GirlSketch } from './types';
import { selectJapaneseSlip } from './words';
const ink = [{id:'ink',points:[{x:.2,y:.3,t:0},{x:.6,y:.7,t:100}]}];
const picture = (word:string): GirlSketch => ({ id:word,word,readability:'safe',strokes:ink });
const sketches = ['ねこ','らいおん','らっぱ','はな'].map(picture);
function reply(language: 'ja'|'en' = 'ja', used = false, guess = 'くじら', sessionId = 1): GameState {
  let state = {...createInitialState('day',language),sessionId,phase:'recognizing' as const,round:1,sketches,girlSlipUsed:used,
    entries:[{id:'girl',actor:'girl' as const,round:1,strokes:ink,intendedWord:'ねこ',recognition:null,comparable:false},
      {id:'player',actor:'player' as const,round:1,strokes:ink,intendedWord:null,recognition:null,comparable:false}],
    recognitionRequest:{requestId:'r',playerEntryId:'player',strokes:ink,round:1,attempt:1,sessionKind:'demo' as const}};
  return gameReducer(state,{type:'RECOGNITION_RESOLVED',requestId:'r',result:{source:'mock',guess}});
}
const beat = (s: GameState) => gameReducer(s,{type:'GIRL_OOPS_BEAT_DONE',sessionId:s.sessionId,round:s.round,phase:s.phase as 'girl_notice'|'girl_flustered'});
describe('Shizuku catches her own terminal-ん slip',()=>{
  it('finishes the mistaken drawing, realizes, blushes, refogs, then draws the valid replacement in the same round',()=>{
    let s = reply();
    expect(s.entries.at(-1)?.intendedWord).toBe('らいおん');
    expect(s.entries[1].recognition?.guess).toBe('くじら');
    expect(s.girlCorrection?.word).toBe('らっぱ');
    s=gameReducer(s,{type:'BREATH_DONE'}); s=gameReducer(s,{type:'PLAYBACK_DONE'});
    expect(s.phase).toBe('girl_notice'); expect(selectVisibleStrokes(s)).toEqual(ink);
    expect(gameReducer(s,{type:'YOUR_TURN'})).toBe(s);
    s=beat(s); expect(s.phase).toBe('girl_flustered');
    s=beat(s); expect(s.phase).toBe('girl_breath');
    expect(s.entries).toHaveLength(3); expect(s.round).toBe(2);
    expect(s.entries.at(-1)?.falseStart?.word).toBe('らいおん');
    expect(s.entries.at(-1)?.intendedWord).toBe('らっぱ');
    expect(selectVisibleStrokes(s)).toEqual([]);
    s=gameReducer(s,{type:'BREATH_DONE'}); s=gameReducer(s,{type:'PLAYBACK_DONE'});
    expect(s.phase).toBe('girl_holding'); expect(s.girlCorrection).toBeNull();
  });
  it('bounds frequency, ignores stale timers and keeps the starter/reset safe',()=>{
    expect(reply('ja',true).entries.at(-1)?.intendedWord).toBe('らっぱ');
    expect(reply('ja',false,'くじら',2).entries.at(-1)?.intendedWord).toBe('らっぱ');
    const s=gameReducer(gameReducer(reply(),{type:'BREATH_DONE'}),{type:'PLAYBACK_DONE'});
    expect(gameReducer(s,{type:'GIRL_OOPS_BEAT_DONE',sessionId:999,round:2,phase:'girl_notice'})).toBe(s);
    const reset=gameReducer(s,{type:'RETURN_TO_TITLE'});
    expect(beat(reset)).toBe(reset); expect(reset.girlCorrection).toBeUndefined();
  });
  it('does not manufacture a matching word or a slip after a player terminal-ん break',()=>{
    expect(selectJapaneseSlip(sketches,'き',[])).toBeNull();
    expect(selectJapaneseSlip(sketches,'ら',['らいおん'])).toBeNull();
    expect(reply('ja',false,'らいおん').girlCorrection).toBeNull();
    expect(reply('en',false,'cat').girlCorrection).toBeUndefined();
    const noRedraw={...reply(),sketches:[picture('らいおん')],phase:'recognizing' as const,recognitionRequest:{requestId:'r',playerEntryId:'player',strokes:ink,round:1,attempt:1,sessionKind:'demo' as const},girlSlipUsed:false,girlCorrection:null};
    expect(gameReducer(noRedraw,{type:'RECOGNITION_RESOLVED',requestId:'r',result:{source:'mock',guess:'くじら'}}).girlCorrection).toBeNull();
  });
});
