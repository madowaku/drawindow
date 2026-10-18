import type { GirlSketch, Language } from './types';

/** English v0.4 labels stay valid; Japanese gameplay stores phonetic kana labels. */
export function normalizeWord(value: unknown, language: Language = 'en'): string | null {
  if (typeof value !== 'string' || value.length > 80 || /[0-9<>{}\[\]\/\\]/.test(value)) return null;
  if (language === 'ja') {
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

export function selectGirlSketch(
  sketches: readonly GirlSketch[],
  requiredFirstLetter: string,
  usedTemplateIds: readonly string[] = [],
  language: Language = 'en',
): GirlSketch | null {
  const letter = normalizeWord(requiredFirstLetter, language);
  if (!letter || letter.length !== 1) return null;
  const playable = sketches.filter(sketch => !sketch.readability || sketch.readability === 'safe' || sketch.readability === 'soft');
  // Exact phonetic start and SAFE drawings win. Only then allow ぎ→き, ご→こ etc.
  const exact = playable.filter(sketch => firstLetter(sketch.word, language) === letter);
  const relaxed = playable.filter(sketch => chainLettersMatch(letter, firstLetter(sketch.word, language), language));
  const safe = (items: readonly GirlSketch[]) => items.filter(sketch => !sketch.readability || sketch.readability === 'safe');
  const pool = safe(exact).length ? safe(exact) : exact.length ? exact : safe(relaxed).length ? safe(relaxed) : relaxed;
  const byId = new Map(sketches.map(sketch => [sketch.id, normalizeWord(sketch.word, language)]));
  const recentWords = usedTemplateIds.map(id => byId.get(id));
  return [...pool].sort((a, b) =>
    recentWords.lastIndexOf(normalizeWord(a.word, language)) - recentWords.lastIndexOf(normalizeWord(b.word, language)) ||
    usedTemplateIds.lastIndexOf(a.id) - usedTemplateIds.lastIndexOf(b.id))[0] ?? null;
}
