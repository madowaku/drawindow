import {describe,expect,it} from 'vitest';
import {preprocessQuickDraw} from './quickDrawPreprocess';
import {quickDrawJapanese} from './quickDrawJapanese';

const stroke=(pts:readonly[number,number][])=>[{id:'test',points:pts.map(([x,y],t)=>({x,y,t}))}];

describe('28x28 offline QuickDraw neural input contract',()=>{
  it('rejects empty or invalid drawings',()=>{
    expect(preprocessQuickDraw([])).toBeNull();
    expect(preprocessQuickDraw(stroke([[.5,.5]]))).toBeNull();
    expect(preprocessQuickDraw(stroke([[1.5,.5],[.6,.6]]))).toBeNull();
  });
  it('normalizes stroke geometry into grayscale floats without a canvas',()=>{
    const pixels=preprocessQuickDraw(stroke([[.1,.5],[.9,.5]]));
    expect(pixels).toBeInstanceOf(Float32Array);
    expect(pixels).toHaveLength(784);
    expect(pixels!.every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);
    expect(pixels!.some(n=>n<.9)).toBe(true);
    expect(pixels![0]).toBe(1);
  });
  it('centers drawings regardless of their original location',()=>{
    const left=preprocessQuickDraw(stroke([[.1,.2],[.4,.2]]))!;
    const right=preprocessQuickDraw(stroke([[.5,.8],[.8,.8]]))!;
    expect([...left]).toEqual([...right]);
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
