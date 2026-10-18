import type { GirlSketch, Language } from '../core/types';

/** Reading labels for the existing 64 art candidates. No image data or attribution is changed. */
export const japaneseLabelByEnglish: Readonly<Record<string, string>> = Object.freeze({
  acorn: 'どんぐり', apple: 'りんご', balloon: 'ふうせん', banana: 'ばなな',
  carrot: 'にんじん', cat: 'ねこ', dog: 'いぬ', duck: 'あひる',
  egg: 'たまご', elephant: 'ぞう', fish: 'さかな', flower: 'はな',
  gift: 'ぷれぜんと', grapes: 'ぶどう', guitar: 'ぎたー', heart: 'はーと',
  house: 'いえ', 'ice cream': 'あいすくりーむ', igloo: 'いぐるー',
  jacket: 'じゃけっと', jellyfish: 'くらげ', kettle: 'やかん',
  key: 'かぎ', kite: 'たこ', leaf: 'はっぱ', lion: 'らいおん',
  moon: 'つき', mushroom: 'きのこ', nest: 'す', nose: 'はな',
  notebook: 'のーと', octopus: 'たこ', orange: 'おれんじ',
  owl: 'ふくろう', pear: 'なし', penguin: 'ぺんぎん',
  pizza: 'ぴざ', quail: 'うずら', queen: 'じょおう',
  quilt: 'きると', rabbit: 'うさぎ', rocket: 'ろけっと',
  snake: 'へび', star: 'ほし', teapot: 'きゅうす',
  tree: 'き', ufo: 'ゆーふぉー', umbrella: 'かさ',
  unicorn: 'ゆにこーん', van: 'くるま', vase: 'かびん',
  volcano: 'かざん', watch: 'とけい', watermelon: 'すいか',
  whale: 'くじら', 'x-ray': 'れんとげん', xylophone: 'もっきん',
  yacht: 'よっと', yarn: 'けいと', zebra: 'しまうま', zipper: 'ふぁすなー',
});

/** Keep IDs, source, strokes and readability intact; only switch the spoken name. */
export function localizeGirlSketches(sketches: readonly GirlSketch[], language: Language): GirlSketch[] {
  if (language === 'en') return [...sketches];
  return sketches.flatMap(sketch => {
    const word = japaneseLabelByEnglish[sketch.word];
    return word ? [{ ...sketch, word }] : [];
  });
}
