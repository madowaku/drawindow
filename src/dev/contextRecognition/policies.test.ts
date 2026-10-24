import { describe, expect, it } from 'vitest';
import { compareContextRecognition, PINNED_LABELS } from './policies';

function frame(top: [string,number][]) {
  return [...top.map(([label,score])=>({label,score})), ...PINNED_LABELS.filter(label=>!top.some(([name])=>name===label)).map(label=>({label,score:.001}))];
}
describe('same-frame context experiment',()=>{
  it('keeps A image-only and lets B rescue a close context candidate',()=>{
    const result=compareContextRecognition({language:'en',previousWord:'cat',candidates:frame([['cat',.4],['tree',.38]])});
    expect(result.selections.A.result.guess).toBe('cat');
    expect(result.selections.B.selectedLabel).toBe('tree');
    expect(result.selections.C.selectedRank).toBe(2);
  });
  it('B may harm a clear leader while C preserves it',()=>{
    const result=compareContextRecognition({language:'en',previousWord:'cat',candidates:frame([['cat',.8],['tree',.1]])});
    expect(result.selections.B.changed).toBe(true);
    expect(result.selections.C.changed).toBe(false);
  });
  it('gap and bonus have explicit boundaries and stable tie behavior',()=>{
    const input={language:'en' as const,previousWord:'cat',candidates:frame([['cat',.4],['tree',.35]])};
    expect(compareContextRecognition(input).selections.C.changed).toBe(false);
    expect(compareContextRecognition(input,{strength:.06}).selections.C.changed).toBe(true);
    expect(compareContextRecognition(input,{variant:'bonus',strength:.05}).selections.C.changed).toBe(false);
    expect(compareContextRecognition(input,{variant:'bonus',strength:.06}).selections.C.changed).toBe(true);
    const tied={...input,candidates:frame([['cat',.4],['tree',.4]])};
    expect(compareContextRecognition(tied,{strength:0,variant:'bonus'}).selections.C.selectedLabel).toBe('cat');
    const off=compareContextRecognition(tied,{strength:0,variant:'gap'});
    expect(off.selections.C.selectedLabel).toBe('cat');
    expect(off.selections.C.reason).toBe('correction_disabled');
    expect(off.selections.B.selectedLabel).toBe('tree');
  });
  it('uses Japanese readings and refuses terminal ん / invalid context',()=>{
    const candidates=frame([['cat',.4],['flower',.38]]);
    expect(compareContextRecognition({language:'ja',previousWord:'このは',candidates}).selections.C.result.guess).toBe('はな');
    for(const previousWord of ['みかん','<invalid>']) expect(compareContextRecognition({language:'ja',previousWord,candidates}).selections.B.changed).toBe(false);
  });
  it.each([
    ['ja','りんご','coffee cup'],
    ['ja','らっぱ','leaf'],
    ['ja','ちょうちょ','yoga'],
    ['ja','コーヒー','dog'],
    ['en',' “CAT!” ','tree'],
  ] as const)('uses existing context normalization for %s %s → %s',(language,previousWord,label)=>{
    const compared=compareContextRecognition({language,previousWord,candidates:frame([['cat',.4],[label,.38]])});
    expect(compared.selections.A.selectedLabel).toBe('cat');
    expect(compared.candidates[1].contextMatch).toBe(true);
    expect(compared.selections.B.selectedLabel).toBe(label);
    expect(compared.selections.C.selectedLabel).toBe(label);
  });
  it('never rescues A unknown, including unmapped Japanese and score floor',()=>{
    for(const candidates of [frame([['aircraft carrier',.8],['flower',.7]]),frame([['cat',.04],['flower',.03]])]) {
      const result=compareContextRecognition({language:'ja',previousWord:'このは',candidates});
      expect(Object.values(result.selections).every(value=>value.unknown)).toBe(true);
    }
  });
  it('requires all 345 distinct exact pinned labels and finite scores',()=>{
    const candidates=frame([['cat',.4]]);
    for(const broken of [candidates.slice(1),[...candidates.slice(1),candidates[1]],[{label:'fictional class',score:.8},...candidates.slice(1)],[{...candidates[0],score:NaN},...candidates.slice(1)]]) {
      const result=compareContextRecognition({language:'en',previousWord:'cat',candidates:broken});
      expect(result.validFrame).toBe(false);
      expect(Object.values(result.selections).every(value=>value.unknown)).toBe(true);
    }
  });
  it('rank and score guards exclude weak, distant and deep candidates',()=>{
    const candidates=frame([['cat',.5],['dog',.49],['apple',.48],['tree',.47]]);
    expect(compareContextRecognition({language:'en',previousWord:'cat',candidates}).selections.C.changed).toBe(false);
    expect(compareContextRecognition({language:'en',previousWord:'cat',candidates},{maxRank:4}).selections.C.changed).toBe(true);
    expect(compareContextRecognition({language:'en',previousWord:'cat',candidates},{maxRank:4,maxGap:.01,strength:1}).selections.C.changed).toBe(false);
  });
  it('cannot force distant C corrections with extreme config',()=>{
    const result=compareContextRecognition({language:'en',previousWord:'cat',candidates:frame([['cat',.8],['tree',.1]])},{maxRank:345,maxGap:1,strength:1});
    expect(result.config).toMatchObject({maxRank:5,maxGap:.08,strength:.08});
    expect(result.selections.C.changed).toBe(false);
  });
  it('rejects malformed runtime frames and failure payloads without accepting guesses',()=>{
    for(const candidates of [null,[null],Array(345).fill(null)])expect(compareContextRecognition({language:'en',previousWord:'cat',candidates} as never).selections.A.unknown).toBe(true);
    const result=compareContextRecognition({language:'en',previousWord:'cat',candidates:frame([['cat',.4]]),failure:{source:'mock',guess:'tree'} as never});
    expect(result.selections.A.result).toMatchObject({source:'ml',guess:null,errorCode:'invalid_response'});
  });
});
