import vocabulary from '../../../docs/vocabulary-coverage-v09.json';
import { chainLettersMatch, firstLetter, lastLetter, normalizeWord } from '../../core/words';
import type { RecognitionResult } from '../../core/types';
import { quickDrawJapanese } from '../../services/quickDrawJapanese';
import { imageOnlyQuickDrawResult } from '../../services/quickDrawScores';
import type { ContextComparison, ContextConfig, ContextInput, PolicyId, PolicySelection } from './types';

/** Exact snapshot of the pinned model, DEV only; no invented classes. */
export const PINNED_LABELS: readonly string[] = Object.freeze(vocabulary.model.labelsText.trim().split(/\r?\n/));
const pinned = new Set(PINNED_LABELS);
export const DEFAULT_CONTEXT_CONFIG: Readonly<ContextConfig> = Object.freeze({variant:'gap',maxRank:3,maxGap:.08,strength:.04});
const finiteClamp=(value:number|undefined,fallback:number,min:number,max:number)=>Number.isFinite(value)?Math.min(max,Math.max(min,value!)):fallback;

/** Pure selection: no intended word, catalogue availability or human outcome enters here. */
export function compareContextRecognition(input: ContextInput, options: Partial<ContextConfig> = {}): ContextComparison {
  input=input??{language:'en',previousWord:'',candidates:[]};
  options=options??{};
  const config:ContextConfig={
    variant:options.variant==='bonus'?'bonus':'gap',
    maxRank:Math.floor(finiteClamp(options.maxRank,3,1,5)),
    maxGap:finiteClamp(options.maxGap,.08,0,.08),
    strength:finiteClamp(options.strength,.04,0,.08),
  };
  const validFrame=(input.language==='en'||input.language==='ja')&&Array.isArray(input.candidates)&&input.candidates.length===345 &&
    input.candidates.every(value=>value&&typeof value.label==='string'&&pinned.has(value.label)&&typeof value.score==='number'&&Number.isFinite(value.score))&&
    new Set(input.candidates.map(value=>value.label)).size===345;
  const ordered=validFrame?[...input.candidates].sort((a,b)=>b.score-a.score):[];
  const ending=lastLetter(input.previousWord,input.language);
  const expectedFirst=ending && !(input.language==='ja'&&ending==='ん')?ending:null;
  const candidates=ordered.map(({label,score},index)=>{
    const word=normalizeWord(input.language==='ja'?quickDrawJapanese[label]:label,input.language);
    return {rank:index+1,label,score,word,contextMatch:!!word&&chainLettersMatch(expectedFirst,firstLetter(word,input.language),input.language)};
  });
  const invalid:RecognitionResult={guess:null,source:'ml',errorCode:'invalid_response',error:'Invalid full model frame.'};
  // Shared production transformation is authoritative, including unknown/alternatives.
  const failure=input.failure;
  const validFailure=failure&&failure.source==='ml'&&failure.guess===null&&
    ['invalid_input','invalid_response','unavailable','timeout'].includes(failure.errorCode??'');
  const imageOnly=failure?(validFailure?{guess:null,source:'ml' as const,errorCode:failure.errorCode,error:typeof failure.error==='string'?failure.error.slice(0,200):undefined}:invalid)
    :validFrame?imageOnlyQuickDrawResult(ordered,input.language,.05):invalid;
  const baseline=candidates[0];
  const selection=(policy:PolicyId,rank:number|null,reason:string,started:number):PolicySelection=>{
    const chosen=rank===null?undefined:candidates[rank-1];
    const changed=!!imageOnly.guess&&!!chosen&&chosen.rank!==1;
    const result=changed?imageOnlyQuickDrawResult([ordered[chosen!.rank-1],...ordered.filter((_,index)=>index!==chosen!.rank-1)],input.language,.05):imageOnly;
    return {policy,result,selectedRank:result.guess?chosen?.rank??null:null,selectedLabel:result.guess?chosen?.label??null:null,
      reason,changed,unknown:!result.guess,correctionMs:Math.max(0,performance.now()-started)};
  };
  const started=performance.now();
  const a=selection('A',imageOnly.guess?1:null,!validFrame?'invalid_frame':imageOnly.guess?'image_top1':'image_unknown',started);
  function contextual(policy:'B'|'C'):PolicySelection {
    const started=performance.now();
    if(a.unknown)return selection(policy,null,'preserve_image_unknown',started);
    if(policy==='C'&&config.strength===0)return selection(policy,1,'correction_disabled',started);
    if(!expectedFirst)return selection(policy,1,'context_unavailable',started);
    const eligible=candidates.filter(candidate=>candidate.word&&candidate.score>=.05&&candidate.contextMatch&&candidate.rank<=(policy==='B'?10:config.maxRank));
    if(policy==='B')return selection(policy,eligible[0]?.rank??1,eligible[0]?'top10_context_match':'no_context_candidate',started);
    const guarded=eligible.filter(candidate=>baseline.score-candidate.score<=config.maxGap+1e-12);
    const chosen=config.variant==='gap'
      ?guarded.find(candidate=>baseline.score-candidate.score<=config.strength+1e-12)
      :guarded.filter(candidate=>candidate.score+config.strength>baseline.score+1e-12)
        .sort((a,b)=>b.score-a.score||a.rank-b.rank)[0];
    // Keep an already context-matching leader, including adjusted-score ties.
    const rank=baseline.contextMatch?1:chosen?.rank??1;
    return selection(policy,rank,rank===1?'image_leader_preserved':`context_${config.variant}_within_guard`,started);
  }
  return {language:input.language,previousWord:typeof input.previousWord==='string'?input.previousWord:'',expectedFirst,config,validFrame,candidates,selections:{A:a,B:contextual('B'),C:contextual('C')}};
}
