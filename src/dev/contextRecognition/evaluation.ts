import { chainLettersMatch, firstLetter, lastLetter, normalizeWord } from '../../core/words';
import { PINNED_LABELS } from './policies';
import type { ContextComparison, EvaluatedComparison, EvaluationInput, PolicyEvaluation, PolicyId } from './types';

const ids:PolicyId[]=['A','B','C'];
export const OUT_OF_VOCABULARY='__out_of_vocabulary__';
const text=(value:unknown):string|undefined=>typeof value==='string'?value.slice(0,200):undefined;
const rating=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=1&&value<=5?value:undefined;
function safeEvaluation(input:EvaluationInput):EvaluationInput {
  const observedContinuation:Partial<Record<PolicyId,boolean>>={};
  for(const id of ids)if(typeof input.observedContinuation?.[id]==='boolean')observedContinuation[id]=input.observedContinuation[id];
  return {intendedWord:text(input.intendedWord),perceivedPreviousWord:text(input.perceivedPreviousWord),
    intendedModelLabel:text(input.intendedModelLabel),observedContinuation,
    enjoyment:rating(input.enjoyment),replayIntent:rating(input.replayIntent),shizukuFeeling:rating(input.shizukuFeeling)};
}
/** Evaluation is deliberately downstream: its annotations cannot affect selection. */
export function evaluateComparison(comparison:ContextComparison,input:EvaluationInput,templates:readonly {word:string;readability?:string}[]=[]):EvaluatedComparison {
  const evaluation=safeEvaluation(input);
  const {language}=comparison;
  const intendedReading=normalizeWord(evaluation.intendedWord,language);
  const semanticKnown=!!evaluation.intendedModelLabel&&PINNED_LABELS.includes(evaluation.intendedModelLabel);
  const outOfVocabulary=evaluation.intendedModelLabel===OUT_OF_VOCABULARY;
  const exact=(id:PolicyId)=>semanticKnown?comparison.selections[id].selectedLabel===evaluation.intendedModelLabel:false;
  const policies={} as Record<PolicyId,PolicyEvaluation>;
  for(const id of ids){
    const guess=comparison.selections[id].result.guess;
    const ending=lastLetter(guess,language);
    const lexicalContinuation=!!guess&&chainLettersMatch(comparison.expectedFirst,firstLetter(guess,language),language);
    policies[id]={exactClassMatch:semanticKnown?exact(id):null,
      outOfVocabularyAbstained:outOfVocabulary?comparison.selections[id].unknown:null,
      readingMatch:intendedReading?normalizeWord(guess,language)===intendedReading:null,
      lexicalContinuation,
      templateExists:!!ending&&!(language==='ja'&&ending==='ん')&&templates.some(template=>
        (!template.readability||['safe','soft'].includes(template.readability))&&
        !(language==='ja'&&lastLetter(template.word,language)==='ん')&&
        chainLettersMatch(ending,firstLetter(template.word,language),language)),
      observedContinuation:evaluation.observedContinuation?.[id]??null,
      relativeToA:!semanticKnown?'unevaluated':exact(id)===exact('A')?'unchanged':exact(id)?'benefit':'harm'};
  }
  const perceived=normalizeWord(evaluation.perceivedPreviousWord,language);
  return {comparison,evaluation,policies,perceivedPreviousMatches:perceived?perceived===normalizeWord(comparison.previousWord,language):null};
}
export function summarizeComparisons(records:readonly EvaluatedComparison[]){
  const summary={} as Record<PolicyId,{total:number;benefit:number;harm:number;unchanged:number;unevaluated:number;unknown:number;exactCorrect:number;exactEvaluated:number;readingCorrect:number;readingEvaluated:number;outOfVocabularyEvaluated:number;outOfVocabularyAbstained:number;outOfVocabularyFalseKnown:number;lexicalContinuation:number;templateExists:number;observedContinued:number;observedEvaluated:number}>;
  for(const id of ids){
    const values=records.map(record=>record.policies[id]);
    summary[id]={total:records.length,benefit:0,harm:0,unchanged:0,unevaluated:0,
      unknown:records.filter(record=>record.comparison.selections[id].unknown).length,
      outOfVocabularyEvaluated:values.filter(value=>value.outOfVocabularyAbstained!==null).length,
      outOfVocabularyAbstained:values.filter(value=>value.outOfVocabularyAbstained===true).length,
      outOfVocabularyFalseKnown:values.filter(value=>value.outOfVocabularyAbstained===false).length,
      exactCorrect:values.filter(value=>value.exactClassMatch===true).length,exactEvaluated:values.filter(value=>value.exactClassMatch!==null).length,
      readingCorrect:values.filter(value=>value.readingMatch===true).length,readingEvaluated:values.filter(value=>value.readingMatch!==null).length,
      lexicalContinuation:values.filter(value=>value.lexicalContinuation).length,templateExists:values.filter(value=>value.templateExists).length,
      observedContinued:values.filter(value=>value.observedContinuation===true).length,observedEvaluated:values.filter(value=>value.observedContinuation!==null).length};
    for(const value of values)summary[id][value.relativeToA]++;
  }
  return summary;
}
/** Explicit projections prevent accidental strokes/images/provider fields from escaping. */
function sanitized(record:EvaluatedComparison){
  const c=record.comparison;
  return {comparison:{language:c.language,previousWord:text(c.previousWord),expectedFirst:c.expectedFirst,validFrame:c.validFrame,
    config:{variant:c.config.variant,maxRank:c.config.maxRank,maxGap:c.config.maxGap,strength:c.config.strength},
    candidates:c.candidates.map(value=>({rank:value.rank,label:text(value.label),word:text(value.word),score:value.score,contextMatch:value.contextMatch})),
    selections:Object.fromEntries(ids.map(id=>{const value=c.selections[id];return [id,{policy:id,selectedRank:value.selectedRank,selectedLabel:text(value.selectedLabel),reason:text(value.reason),changed:value.changed,unknown:value.unknown,correctionMs:value.correctionMs,
      result:{guess:text(value.result.guess)??null,source:value.result.source,errorCode:value.result.errorCode,alternatives:value.result.alternatives?.map(text)}}];}))},
    evaluation:safeEvaluation(record.evaluation),policies:Object.fromEntries(ids.map(id=>{const value=record.policies[id];return [id,{exactClassMatch:value.exactClassMatch,outOfVocabularyAbstained:value.outOfVocabularyAbstained,readingMatch:value.readingMatch,lexicalContinuation:value.lexicalContinuation,templateExists:value.templateExists,observedContinuation:value.observedContinuation,relativeToA:value.relativeToA}];})),perceivedPreviousMatches:record.perceivedPreviousMatches};
}
export function exportComparisonsJson(records:readonly EvaluatedComparison[]):string {
  return JSON.stringify({schemaVersion:1,evidence:'developer experiment; no human accuracy claim',modelLabels:PINNED_LABELS.length,records:records.map(sanitized)},null,2);
}
function csv(value:unknown):string {
  let valueText=value===null||value===undefined?'':String(value);
  if(/^[\s]*[=+@-]/.test(valueText))valueText="'"+valueText;
  return '"'+valueText.replaceAll('"','""')+'"';
}
export function exportComparisonsCsv(records:readonly EvaluatedComparison[]):string {
  const columns=['sample','language','previousWord','expectedFirst','intendedWord','intendedModelLabel','perceivedPreviousWord','policy','variant','maxRank','maxGap','strength','selectedLabel','selectedRank','guess','reason','changed','unknown','correctionMs','exactClassMatch','outOfVocabularyAbstained','readingMatch','relativeToA','lexicalContinuation','templateExists','observedContinuation','rawCandidates'];
  const rows=records.flatMap((record,index)=>ids.map(id=>{
    const safe=sanitized(record); const c=safe.comparison; const selection=record.comparison.selections[id]; const e=record.policies[id];
    return [index+1,c.language,c.previousWord,c.expectedFirst,safe.evaluation.intendedWord,safe.evaluation.intendedModelLabel,safe.evaluation.perceivedPreviousWord,id,c.config.variant,c.config.maxRank,c.config.maxGap,c.config.strength,
      selection.selectedLabel,selection.selectedRank,selection.result.guess,selection.reason,selection.changed,selection.unknown,selection.correctionMs,e.exactClassMatch,e.outOfVocabularyAbstained,e.readingMatch,e.relativeToA,e.lexicalContinuation,e.templateExists,e.observedContinuation,JSON.stringify(c.candidates)].map(csv).join(',');
  }));
  return [columns.map(csv).join(','),...rows].join('\r\n');
}
