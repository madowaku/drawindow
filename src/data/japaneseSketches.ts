import type { GirlSketch, Language, Mode } from '../core/types';

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

/** Starter drawings whose final kana invite many recognizable, drawable replies.
 * One chosen drawing is moved to the front; the full catalogue remains available.
 * DAY and NIGHT have different opening pools without affecting English v0.4.
 */
export const easyJapaneseStarters: Readonly<Record<Mode, readonly string[]>> = {
  day: ['すいか', 'かさ', 'つき', 'ほし', 'ねこ', 'はな'],
  night: ['つき', 'ほし', 'とけい', 'かさ', 'ねこ', 'すいか'],
};

export function withJapaneseStarter(sketches: readonly GirlSketch[], mode: Mode, startIndex: number): GirlSketch[] {
  const choices = easyJapaneseStarters[mode].flatMap(word => {
    const eligible = sketches.find(sketch => sketch.word === word && (!sketch.readability || sketch.readability === 'safe'));
    return eligible ? [eligible] : [];
  });
  if (!choices.length) return [...sketches];
  const index = Number.isSafeInteger(startIndex) && startIndex >= 0 ? startIndex % choices.length : 0;
  const chosen = choices[index];
  return [chosen, ...sketches.filter(sketch => sketch.id !== chosen.id)];
}
