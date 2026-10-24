import { girlSketches } from './sketches';
import { localizeGirlSketches } from './japaneseSketches';
import { adoptShizukuSketches } from './shizuku-doodles/adopted';
import { japaneseExtraSketches } from './japaneseExtraSketches';
import { japaneseDoodlePack } from './japaneseDoodlePack';
import { japaneseClassicDoodles } from './japaneseClassicDoodles';
import { japaneseEverydayDoodles } from './japaneseEverydayDoodles';
import type { Language } from '../core/types';

/** Same production pool for starting and validating a saved session. */
export function gameSketches(language: Language) {
  const localized = localizeGirlSketches(girlSketches, language);
  return language === 'ja' ? adoptShizukuSketches([...localized, ...japaneseExtraSketches, ...japaneseDoodlePack, ...japaneseClassicDoodles, ...japaneseEverydayDoodles], 'ja') : localized;
}
