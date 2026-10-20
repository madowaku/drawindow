import type { GirlSketch, Language, Mode } from '../core/types';

/** Gentle preference, never a hard separation. Unillustrated words are inert. */
const preferred: Readonly<Record<Language, Readonly<Record<Mode, readonly string[]>>>> = {
  ja: {
    day: ['すいか','はな','ひまわり','あさがお','とんぼ','すずめ','うちわ','とり',
      'かめ','いちご','きゅうり','たけのこ','そり','きつね','かえる',
      'たんぽぽ','てんとうむし','ぶらんこ','ちゅーりっぷ','ひよこ','さくらんぼ','すべりだい','あり'],
    night: ['つき','ほし','こうもり','ふくろう','ろうそく','とけい',
      'らんぷ','おばけ','ぼうえんきょう','ほたる','ぱじゃま','べっど',
      'かぼちゃ','まじょ','くものす','しろ','ほね'],
  },
  en: {
    day: ['apple','flower','butterfly','tree','watermelon','banana','rabbit',
      'mushroom','carrot','fish','grapes','orange','ladybug','dandelion',
      'swing','chick','cherry','tulip','pinwheel','caterpillar','slide','ant'],
    night: ['moon','star','rocket','watch','owl','house','ghost','lamp','telescope',
      'firefly','pajamas','bed','pumpkin','witch','spiderweb','castle','bone'],
  },
};
export const prefersThemeWord = (word: string, language: Language, mode: Mode): boolean =>
  preferred[language][mode].includes(word);

export const easyEnglishStarters: Readonly<Record<Mode, readonly string[]>> = {
  day: ['apple','flower','banana','tree','watermelon'],
  night: ['moon','star','rocket','watch','house'],
};
/** Only choose an actual, drawn, provisionally readable opening. */
export function withEnglishStarter(sketches: readonly GirlSketch[], mode: Mode, startIndex: number): GirlSketch[] {
  const choices = easyEnglishStarters[mode].flatMap(word => {
    const match = sketches.find(s => s.word === word &&
      (!s.readability || s.readability === 'safe') && s.strokes.length > 0);
    return match ? [match] : [];
  });
  if (!choices.length) return [...sketches];
  const index = Number.isSafeInteger(startIndex) && startIndex >= 0 ? startIndex % choices.length : 0;
  const chosen = choices[index];
  return [chosen, ...sketches.filter(s => s.id !== chosen.id)];
}
