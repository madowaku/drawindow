import { describe, expect, it, vi } from 'vitest';
import { createLocalRecognizer } from './localRecognizer';
import type { GirlSketch, Stroke } from '../core/types';

const line = (id: string, points: readonly [number, number][]): Stroke => ({
  id, points: points.map(([x,y], t) => ({ x, y, t })),
});
const horizontal = [line('h', [[.15,.5],[.85,.5]])];
const vertical = [line('v', [[.5,.15],[.5,.85]])];
const zigzag = [line('z', [[.15,.15],[.85,.85],[.15,.85],[.85,.15]])];
const sketch = (id: string, word: string, strokes: readonly Stroke[]): GirlSketch => ({id,word,strokes,readability:'safe'});
const input = (strokes: readonly Stroke[], requestId = '1:1:1') => ({requestId,strokes});

describe('offline local recognition lab', () => {
  it('recognizes actual stroke geometry rather than request IDs or round scripts', async () => {
    const factory = vi.fn(() => [sketch('a','apple',horizontal), sketch('b','banana',vertical)]);
    const local = createLocalRecognizer(factory);
    expect(await local.recognize(input(horizontal))).toEqual({ guess: 'apple', source: 'local' });
    expect(await local.recognize(input(vertical,'99:3:8'))).toEqual({ guess: 'banana', source: 'local' });
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it('uses Japanese labels with the same drawing, without translating arbitrary guesses', async () => {
    const local = createLocalRecognizer(lang => lang === 'ja'
      ? [sketch('a','りんご',horizontal), sketch('b','ばなな',vertical)]
      : [sketch('a','apple',horizontal), sketch('b','banana',vertical)]);
    expect(await local.recognize({ ...input(vertical), language: 'ja' })).toEqual({ guess: 'ばなな', source: 'local' });
    expect(await local.recognize(input(horizontal))).toEqual({ guess: 'apple', source: 'local' });
  });
  it('refuses genuinely indistinguishable labels instead of making up certainty', async () => {
    const local = createLocalRecognizer(() => [sketch('one','cat',horizontal), sketch('two','dog',horizontal)]);
    expect(await local.recognize(input(horizontal))).toMatchObject({guess:null,source:'local',errorCode:'invalid_response'});
  });
  it('rejects empty, malformed, ambiguous or aborted input without sending a request', async () => {
    const factory = vi.fn(() => [sketch('a','apple',horizontal), sketch('b','banana',vertical)]);
    const local = createLocalRecognizer(factory, {maxDistance:.01});
    expect(await local.recognize(input([]))).toMatchObject({guess:null,errorCode:'invalid_input'});
    expect(await local.recognize(input([line('bad',[[2,.4]])]))).toMatchObject({guess:null,errorCode:'invalid_input'});
    expect(await local.recognize(input(zigzag))).toMatchObject({guess:null,errorCode:'invalid_response'});
    const controller = new AbortController();controller.abort();
    expect(await local.recognize(input(horizontal),{signal:controller.signal})).toMatchObject({guess:null,errorCode:'unavailable'});
  });
  it('never requires global fetch or image uploads', async () => {
    const fetch = vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{throw new Error('NO NETWORK');});
    try {
      const local = createLocalRecognizer(() => [sketch('a','apple',horizontal)]);
      expect(await local.recognize(input(horizontal))).toMatchObject({guess:'apple',source:'local'});
      expect(fetch).not.toHaveBeenCalled();
    } finally {fetch.mockRestore();}
  });
});
