import type { GirlSketch, Language, Mode } from './types';
import { lookupJapaneseName } from '../data/namingDictionary';

/** English v0.4 labels stay valid; Japanese gameplay stores phonetic kana labels. */
export function normalizeWord(value: unknown, language: Language = 'en'): string | null {
  if (typeof value !== 'string' || value.length > 80 || /[0-9<>{}\[\]\/\\]/.test(value)) return null;
  if (language === 'ja') {
    const named = lookupJapaneseName(value);
    if (named) return named.reading;
    const normalized = value.normalize('NFKC').trim().replace(/^[\s「」『』（）、。！？!?.]+|[\s「」『』（）、。！？!?.]+$/g, '')
      .replace(/[\u30a1-\u30f6]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60));
    return normalized.length > 0 && normalized.length <= 64 && /^[ぁ-ゖー]+$/.test(normalized) ? normalized : null;
  }
  const normalized = value.toLowerCase().trim().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/\s+/g, ' ');
  return normalized.length <= 64 && /^[a-z]+(?:[ '-][a-z]+)*$/.test(normalized) ? normalized : null;
}

const smallKana: Readonly<Record<string, string>> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'っ': 'つ', 'ゎ': 'わ', 'ゕ': 'か', 'ゖ': 'け',
};
const vowelRows: readonly [string, string][] = [
  ['あかがさざただなはばぱまやらわぁゃゎ', 'あ'],
  ['いきぎしじちぢにひびぴみりゐぃ', 'い'],
  ['うくぐすずつづぬふぶぷむゆるゔぅゅっ', 'う'],
  ['えけげせぜてでねへべぺめれゑぇゖ', 'え'],
  ['おこごそぞとどのほぼぽもよろをぉょ', 'お'],
];
function kanaUnit(character: string): string { return smallKana[character] ?? character; }

/** Friendly Japanese house rule: voiced/semi-voiced syllables share a base.
 * Keep the visible kana unchanged: results can show ご → こ as connected.
 */
const unvoicedKana: Readonly<Record<string, string>> = {
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
  'ゔ': 'う',
};
export function chainLettersMatch(from: string | null, to: string | null, language: Language = 'en'): boolean {
  if (!from || !to) return false;
  if (language === 'en') return from === to;
  const base = (kana: string) => unvoicedKana[kanaUnit(kana)] ?? kanaUnit(kana);
  return base(from) === base(to);
}

export function firstLetter(value: unknown, language: Language = 'en'): string | null {
  const normalized = normalizeWord(value, language);
  return normalized ? (language === 'ja' ? kanaUnit(normalized[0]) : normalized[0]) : null;
}

export function lastLetter(value: unknown, language: Language = 'en'): string | null {
  const normalized = normalizeWord(value, language);
  if (!normalized) return null;
  if (language === 'en') return normalized.slice(-1);
  const last = normalized.slice(-1);
  if (last !== 'ー') return kanaUnit(last);
  // Japanese long sound: コーヒー -> い, ケーキ -> き.
  const preceding = [...normalized].reverse().find(character => character !== 'ー');
  if (!preceding) return null;
  return vowelRows.find(([characters]) => characters.includes(preceding))?.[1] ?? null;
}

/** Catalogue connectivity is a maker heuristic, not measured human vocabulary.
 * Count distinct readable, nonterminal replies; alternate drawings of one noun
 * must not inflate its score. A small mood tie-break never beats one more exit. */
const moodWords: Readonly<Record<Mode, readonly string[]>> = {
  day: ['すいか', 'はな', 'ひまわり', 'あさがお', 'とんぼ', 'すずめ', 'うちわ'],
  night: ['つき', 'ほし', 'こうもり', 'ふくろう', 'ろうそく', 'とけい'],
};
function japaneseContinuationScore(sketch: GirlSketch, playable: readonly GirlSketch[], mode?: Mode): number {
  const ending = lastLetter(sketch.word, 'ja');
  if (!ending || ending === 'ん') return -2;
  const replies = playable.filter(candidate => candidate.word !== sketch.word &&
    chainLettersMatch(ending, firstLetter(candidate.word, 'ja'), 'ja'));
  if (!replies.length) return -1;
  const readableWords = new Set(replies.filter(candidate =>
    (!candidate.readability || candidate.readability === 'safe') &&
    lastLetter(candidate.word, 'ja') !== 'ん').map(candidate => normalizeWord(candidate.word, 'ja')));
  return Math.min(3, readableWords.size) + (mode && moodWords[mode].includes(sketch.word) ? .25 : 0);
}

export function selectGirlSketch(
  sketches: readonly GirlSketch[],
  requiredFirstLetter: string,
  usedTemplateIds: readonly string[] = [],
  language: Language = 'en',
  mode?: Mode,
): GirlSketch | null {
  const letter = normalizeWord(requiredFirstLetter, language);
  if (!letter || letter.length !== 1) return null;
  const playable = sketches.filter(sketch => !sketch.readability || sketch.readability === 'safe' || sketch.readability === 'soft');
  // Exact phonetic start and SAFE drawings win. Only then allow ぎ→き, ご→こ etc.
  const exact = playable.filter(sketch => firstLetter(sketch.word, language) === letter);
  const relaxed = playable.filter(sketch => chainLettersMatch(letter, firstLetter(sketch.word, language), language));
  const safe = (items: readonly GirlSketch[]) => items.filter(sketch => !sketch.readability || sketch.readability === 'safe');
  const pool = safe(exact).length ? safe(exact) : safe(relaxed).length ? safe(relaxed) : exact.length ? exact : relaxed;
  const byId = new Map(sketches.map(sketch => [sketch.id, normalizeWord(sketch.word, language)]));
  const recentWords = usedTemplateIds.map(id => byId.get(id));
  // Japanese-only: do not hand the player an accidental dead end when a
  // similarly readable picture keeps the chain alive. No words are hinted.
  const exitPenalty = (sketch: GirlSketch) => {
    if (language !== 'ja') return 0;
    const ending = lastLetter(sketch.word, language);
    if (!ending || ending === 'ん') return 2;
    return playable.some(candidate => chainLettersMatch(ending, firstLetter(candidate.word, language), language)) ? 0 : 1;
  };
  const scores = new Map(pool.map(sketch => [sketch.id,
    language === 'ja' ? japaneseContinuationScore(sketch, playable, mode) : 0]));
  const seen = (sketch: GirlSketch) => recentWords.includes(normalizeWord(sketch.word, language));
  return [...pool].sort((a, b) =>
    exitPenalty(a) - exitPenalty(b) ||
    (language === 'ja' ? Number(seen(a)) - Number(seen(b)) : 0) ||
    (!seen(a) && !seen(b) ? scores.get(b.id)! - scores.get(a.id)! : 0) ||
    recentWords.lastIndexOf(normalizeWord(a.word, language)) - recentWords.lastIndexOf(normalizeWord(b.word, language)) ||
    usedTemplateIds.lastIndexOf(a.id) - usedTemplateIds.lastIndexOf(b.id))[0] ?? null;
}

/** After an honest terminal-ん break, draw a different easy-to-continue picture.
 * All choices remain curated SAFE art; the broken link is still recorded.
 */
export function selectJapaneseFreshSketch(sketches: readonly GirlSketch[], usedTemplateIds: readonly string[]): GirlSketch | null {
  const easyEndings = new Set(['こ', 'な', 'き', 'か', 'し', 'さ', 'ま', 'い', 'う']);
  const candidates = sketches.filter(sketch =>
    (!sketch.readability || sketch.readability === 'safe') &&
    easyEndings.has(lastLetter(sketch.word, 'ja') ?? ''));
  return candidates.find(sketch => !usedTemplateIds.includes(sketch.id)) ?? candidates[0] ?? null;
}

/** A deliberate, occasional character slip. Only readable art with a genuinely
 * matching starting sound can be drawn; the recognizer's guess never changes. */
export function selectJapaneseSlip(sketches: readonly GirlSketch[], start: string, usedIds: readonly string[]): GirlSketch | null {
  return sketches.filter(sketch => (!sketch.readability || sketch.readability === 'safe') &&
    lastLetter(sketch.word, 'ja') === 'ん' && !usedIds.includes(sketch.id) &&
    chainLettersMatch(start, firstLetter(sketch.word, 'ja'), 'ja'))
    .sort((a,b) => Number(firstLetter(b.word, 'ja') === start) - Number(firstLetter(a.word, 'ja') === start))[0] ?? null;
}
