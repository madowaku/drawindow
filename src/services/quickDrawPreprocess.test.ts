import {describe,expect,it} from 'vitest';
import {preprocessQuickDraw} from './quickDrawPreprocess';
import {quickDrawJapanese} from './quickDrawJapanese';

const stroke=(pts:readonly[number,number][])=>[{id:'test',points:pts.map(([x,y],t)=>({x,y,t}))}];

describe('28x28 offline QuickDraw neural input contract',()=>{
  it('rejects empty, malformed or nearly blank drawings',()=>{
    expect(preprocessQuickDraw([])).toBeNull();
    expect(preprocessQuickDraw(stroke([[.5,.5]]))).toBeNull();
    expect(preprocessQuickDraw(stroke([[1.5,.5],[.6,.6]]))).toBeNull();
    expect(preprocessQuickDraw(stroke([[.51,.5],[.511,.5]]))).toBeNull();
    expect(preprocessQuickDraw(stroke([[.2,.2],[.8,.8]]),{strokeRadiusHiRes:Infinity})).toBeNull();
    expect(preprocessQuickDraw(stroke([[.2,.2],[.8,.8]]),{paddingPx:-1})).toBeNull();
  });
  it('matches the actual QuickDraw training code: dark background, bright strokes',()=>{
    const pixels=preprocessQuickDraw(stroke([[.1,.5],[.9,.5]]));
    expect(pixels).toBeInstanceOf(Float32Array);
    expect(pixels).toHaveLength(784);
    expect(pixels!.every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);
    expect(pixels![0]).toBe(0);
    expect(pixels![14*28+14]).toBeGreaterThan(.5);
    expect(pixels!.some(n=>n>0&&n<1)).toBe(true);
  });
  it('preserves the legacy inversion only as a controlled A/B comparator',()=>{
    const lines=stroke([[.1,.5],[.9,.5]]);
    const updated=preprocessQuickDraw(lines,{strokeRadiusHiRes:4})!;
    const legacy=preprocessQuickDraw(lines,{polarity:'legacy',strokeRadiusHiRes:4})!;
    expect(legacy[0]).toBe(1);
    expect(updated[0]).toBe(0);
    for(let i=0;i<784;i++) expect(updated[i]+legacy[i]).toBeCloseTo(1);
  });
  it('centers translated identical drawings',()=>{
    const left=preprocessQuickDraw(stroke([[.1,.2],[.4,.2]]))!;
    const right=preprocessQuickDraw(stroke([[.5,.8],[.8,.8]]))!;
    expect([...left]).toEqual([...right]);
  });
  it('preserves image aspect ratio without imposing a square distortion',()=>{
    const wide=preprocessQuickDraw(stroke([[.1,.1],[.9,.1]]))!;
    const tall=preprocessQuickDraw(stroke([[.1,.1],[.1,.9]]))!;
    const area=(p:Float32Array,byAxis:'x'|'y')=>new Set([...p].flatMap((n,i)=>n>.5?[byAxis==='x'?i%28:Math.floor(i/28)]:[])).size;
    expect(area(wide,'x')).toBeGreaterThan(area(wide,'y')*3);
    expect(area(tall,'y')).toBeGreaterThan(area(tall,'x')*3);
  });
  it('uses actual semantically supported labels, not invented exact classes',()=>{
    expect(quickDrawJapanese['bat']).toBe('こうもり');
    expect(quickDrawJapanese['fish']).toBe('さかな');
    expect(quickDrawJapanese['t-shirt']).toBe('しゃつ');
    expect(quickDrawJapanese['gorilla']).toBeUndefined();
    expect(quickDrawJapanese['chicken']).toBeUndefined();
    expect(quickDrawJapanese['monkey']).not.toBe('ごりら');
  });
});
