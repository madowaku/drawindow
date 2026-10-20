import {describe,expect,it} from 'vitest';
import {eshiritoriV08Words,getEshiritoriV08Doodles} from './eshiritoriV08Pack';
import {girlSketches} from './sketches';
import {localizeGirlSketches} from './japaneseSketches';
import {japaneseExtraSketches} from './japaneseExtraSketches';
import {japaneseDoodlePack} from './japaneseDoodlePack';
import {japaneseClassicDoodles} from './japaneseClassicDoodles';
import {japaneseEverydayDoodles} from './japaneseEverydayDoodles';
import {getBilingualV08Doodles} from './bilingualV08Doodles';
import {firstLetter,lastLetter,selectGirlSketch,chainLettersMatch} from '../core/words';
const priorJa=[...localizeGirlSketches(girlSketches,'ja'),...japaneseExtraSketches,...japaneseDoodlePack,...japaneseClassicDoodles,...japaneseEverydayDoodles,...getBilingualV08Doodles('ja')];
const ja=getEshiritoriV08Doodles('ja'),en=getEshiritoriV08Doodles('en');
describe('v0.8 picture shiritori pack',()=>{
 it('adds 14 unique localized words sharing the same original drawing strokes',()=>{
  expect(eshiritoriV08Words).toHaveLength(14);expect(ja).toHaveLength(14);expect(en).toHaveLength(14);
  expect(new Set(ja.map(s=>s.word)).size).toBe(14);expect(new Set(en.map(s=>s.word)).size).toBe(14);
  expect(new Set([...priorJa,...ja].map(s=>s.id)).size).toBe(priorJa.length+14);
  for(let i=0;i<14;i++){
   expect(priorJa.some(s=>s.word===ja[i].word),ja[i].word).toBe(false);
   expect([...girlSketches,...getBilingualV08Doodles('en')].some(s=>s.word===en[i].word),en[i].word).toBe(false);
   expect(ja[i].id).toBe(en[i].id);expect(ja[i].strokes).toEqual(en[i].strokes);
  }
 });
 it('keeps 14 readable-size monochrome drawings valid, timed, and nonterminal',()=>{
  for(const s of ja){
   expect(s.word).toMatch(/^[ぁ-ゖー]+$/);expect(lastLetter(s.word,'ja')).not.toBe('ん');
   expect(s.strokes.length).toBeGreaterThanOrEqual(3);expect(s.strokes.length).toBeLessThanOrEqual(16);
   const pts=s.strokes.flatMap(st=>st.points);
   expect(pts.every((p,i)=>Number.isFinite(p.x)&&p.x>=.02&&p.x<=.98&&p.y>=.02&&p.y<=.98&&Number.isFinite(p.t)&&p.t>=0&&p.t<=1200.001&&(!i||p.t>=pts[i-1].t))).toBe(true);
  }
 });
 it('supplies a nonterminal Japanese continuation for each addition, including る and に',()=>{
  const pool=[...priorJa,...ja].filter(s=>lastLetter(s.word,'ja')!=='ん');
  for(const s of ja){const last=lastLetter(s.word,'ja')!;const next=selectGirlSketch(pool,last,[s.id],'ja');
   expect(next,s.word+' -> '+last).not.toBeNull();
   expect(chainLettersMatch(last,firstLetter(next?.word,'ja'),'ja')).toBe(true);
  }
  expect(selectGirlSketch(pool,'に',[],'ja')?.word).toBe('にじ');
  expect(ja.find(s=>s.word==='るびー')?.readability).toBe('soft');
 });
});
