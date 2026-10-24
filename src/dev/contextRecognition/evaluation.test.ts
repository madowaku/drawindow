import { describe,expect,it } from 'vitest';
import { compareContextRecognition,PINNED_LABELS } from './policies';
import { evaluateComparison,exportComparisonsCsv,exportComparisonsJson,summarizeComparisons } from './evaluation';
const candidates=[{label:'cat',score:.4},{label:'tree',score:.38},...PINNED_LABELS.filter(label=>!['cat','tree'].includes(label)).map(label=>({label,score:.001}))];
const comparison=()=>compareContextRecognition({language:'en',previousWord:'cat',candidates});
describe('post-result evaluation',()=>{
  it('separates benefit/harm from lexical continuation and actual observation',()=>{
    const benefit=evaluateComparison(comparison(),{intendedWord:'tree',intendedModelLabel:'tree',observedContinuation:{B:false}},[{word:'elephant'}]);
    expect(benefit.policies.B.relativeToA).toBe('benefit');
    expect(benefit.policies.B.lexicalContinuation).toBe(true);
    expect(benefit.policies.B.templateExists).toBe(true);
    expect(benefit.policies.B.observedContinuation).toBe(false);
    expect(benefit.policies.A.observedContinuation).toBe(null);
    const harm=evaluateComparison(comparison(),{intendedModelLabel:'cat'});
    expect(harm.policies.B.relativeToA).toBe('harm');
    expect(summarizeComparisons([benefit,harm]).B).toMatchObject({benefit:1,harm:1});
  });
  it('keeps Japanese homophones separate from exact semantic class',()=>{
    const ja=compareContextRecognition({language:'ja',previousWord:'このは',candidates:[{label:'flower',score:.4},...PINNED_LABELS.filter(label=>label!=='flower').map(label=>({label,score:.001}))]});
    const evaluated=evaluateComparison(ja,{intendedWord:'鼻',intendedModelLabel:'nose'});
    expect(evaluated.policies.A.readingMatch).toBe(true);
    expect(evaluated.policies.A.exactClassMatch).toBe(false);
    expect(evaluateComparison(ja,{intendedWord:'はな'}).policies.A.exactClassMatch).toBe(null);
  });
  it('scores out of vocabulary abstention separately from class accuracy',()=>{
    const evaluated=evaluateComparison(comparison(),{intendedModelLabel:'__out_of_vocabulary__'});
    expect(evaluated.policies.A.exactClassMatch).toBe(null);
    expect(evaluated.policies.A.outOfVocabularyAbstained).toBe(false);
    expect(summarizeComparisons([evaluated]).A).toMatchObject({exactEvaluated:0,outOfVocabularyEvaluated:1,outOfVocabularyFalseKnown:1});
    const unknown=compareContextRecognition({language:'en',previousWord:'cat',candidates:[]});
    expect(evaluateComparison(unknown,{intendedModelLabel:'__out_of_vocabulary__'}).policies.A.outOfVocabularyAbstained).toBe(true);
    expect(evaluateComparison(comparison(),{intendedModelLabel:'typo class'}).policies.A.exactClassMatch).toBe(null);
    expect(evaluateComparison(comparison(),{}).policies.B.relativeToA).toBe('unevaluated');
  });
  it('counts only actual playable nonterminal Japanese reply availability',()=>{
    const ja=compareContextRecognition({language:'ja',previousWord:'このは',candidates:[{label:'flower',score:.4},...PINNED_LABELS.filter(label=>label!=='flower').map(label=>({label,score:.001}))]});
    expect(evaluateComparison(ja,{},[{word:'なぽりたん',readability:'safe'},{word:'なす',readability:'review'}]).policies.A.templateExists).toBe(false);
    expect(evaluateComparison(ja,{},[{word:'なす',readability:'soft'}]).policies.A.templateExists).toBe(true);
  });
  it('exports only explicit sanitized fields, excludes image/stroke and formula injection',()=>{
    const result=evaluateComparison(comparison(),{intendedWord:'=HYPERLINK("bad")',imageDataUrl:'secret',strokes:[1]} as never);
    const json=exportComparisonsJson([result]);
    expect(json).not.toContain('secret'); expect(json).not.toContain('strokes');
    expect(JSON.parse(json).records[0].comparison.candidates).toHaveLength(345);
    expect(exportComparisonsCsv([result])).toContain("'=HYPERLINK");
  });
});
