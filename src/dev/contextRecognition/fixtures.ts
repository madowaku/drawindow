import { PINNED_LABELS } from './policies';
import type { ContextInput,EvaluationInput,ContextConfig } from './types';
export interface ContextFixture {id:string;scenario:string;input:ContextInput;evaluation:EvaluationInput;config?:Partial<ContextConfig>;}
/** Fabricated score vectors only. These are not model inference or human drawings. */
export function fixtureFrame(top:readonly (readonly [string,number])[]){
  return [...top.map(([label,score])=>({label,score})),...PINNED_LABELS.filter(label=>!top.some(([name])=>name===label)).map(label=>({label,score:.001}))];
}
export const CONTEXT_FIXTURES:readonly ContextFixture[]=[
  {id:'en-help',scenario:'context corrects ambiguous image',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.38]])},evaluation:{intendedWord:'tree',intendedModelLabel:'tree'}},
  {id:'en-previous-misread',scenario:'player read the previous picture differently',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['grapes',.4],['tree',.38]])},evaluation:{perceivedPreviousWord:'dog',intendedWord:'grapes',intendedModelLabel:'grapes'}},
  {id:'en-chain-mistake',scenario:'player intended a word that does not follow the link',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.38]])},evaluation:{intendedWord:'cat',intendedModelLabel:'cat'}},
  {id:'en-outside-vocabulary',scenario:'intended concept is outside the 345 classes',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.38]])},evaluation:{intendedWord:'telescope',intendedModelLabel:'__out_of_vocabulary__'}},
  {id:'en-destroy-clear-correct',scenario:'context destroys a clearly correct image leader in B',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.9],['tree',.08]])},evaluation:{intendedWord:'cat',intendedModelLabel:'cat'}},
  {id:'ja-help',scenario:'clock context corrects ambiguous image',input:{language:'ja',previousWord:'とけい',candidates:fixtureFrame([['bear',.4],['dog',.38]])},evaluation:{intendedWord:'いぬ',intendedModelLabel:'dog'}},
  {id:'ja-previous-misread',scenario:'player read the clock as the sun',input:{language:'ja',previousWord:'とけい',candidates:fixtureFrame([['rabbit',.4],['dog',.38]])},evaluation:{perceivedPreviousWord:'たいよう',intendedWord:'うさぎ',intendedModelLabel:'rabbit'}},
  {id:'ja-chain-mistake',scenario:'player intended a word that does not follow clock',input:{language:'ja',previousWord:'とけい',candidates:fixtureFrame([['cat',.4],['dog',.38]])},evaluation:{intendedWord:'ねこ',intendedModelLabel:'cat'}},
  {id:'ja-outside-vocabulary',scenario:'caterpillar intent is outside the 345 classes',input:{language:'ja',previousWord:'とけい',candidates:fixtureFrame([['cat',.4],['dog',.38]])},evaluation:{intendedWord:'いもむし',intendedModelLabel:'__out_of_vocabulary__'}},
  {id:'ja-destroy-clear-correct',scenario:'clock context destroys a clearly correct image leader in B',input:{language:'ja',previousWord:'とけい',candidates:fixtureFrame([['cat',.9],['dog',.08]])},evaluation:{intendedWord:'ねこ',intendedModelLabel:'cat'}},
  {id:'ja-unmapped',scenario:'unmapped A remains unknown despite mapped context candidate',input:{language:'ja',previousWord:'このは',candidates:fixtureFrame([['aircraft carrier',.5],['flower',.4]])},evaluation:{}},
  {id:'ja-terminal',scenario:'terminal ん disables context',input:{language:'ja',previousWord:'みかん',candidates:fixtureFrame([['cat',.4],['flower',.38]])},evaluation:{intendedModelLabel:'cat'}},
  {id:'en-tie',scenario:'stable raw ordering on a score tie',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.4]])},evaluation:{}},
  {id:'en-bonus-tie',scenario:'bonus tied with leader preserves leader',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.35]])},config:{variant:'bonus',strength:.05},evaluation:{}},
  {id:'en-bonus-close',scenario:'bonus wins only within rank and gap guard',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4],['tree',.38]])},config:{variant:'bonus'},evaluation:{}},
  {id:'en-low-score',scenario:'A below .05 floor remains unknown',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.04],['tree',.03]])},evaluation:{}},
  {id:'en-outside-vocabulary-abstain',scenario:'low-score image abstains on an out-of-vocabulary concept',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.04],['tree',.03]])},evaluation:{intendedWord:'telescope',intendedModelLabel:'__out_of_vocabulary__'}},
  {id:'en-nonfinite',scenario:'nonfinite score rejects entire frame',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',Number.NaN],['tree',.4]])},evaluation:{}},
  {id:'en-label-mismatch',scenario:'invented label rejects entire frame',input:{language:'en',previousWord:'cat',candidates:fixtureFrame([['cat',.4]]).map((value,index)=>index===0?{...value,label:'invented'}:value)},evaluation:{}},
  {id:'ja-homophone',scenario:'reading match is not semantic class match',input:{language:'ja',previousWord:'このは',candidates:fixtureFrame([['flower',.4],['nose',.38]])},evaluation:{intendedWord:'鼻',intendedModelLabel:'nose'}},
];
