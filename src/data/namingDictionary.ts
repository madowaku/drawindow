/** Curated word relationships, not image-recognition confidence or answer hints. */
export const NAMING_DICTIONARY_VERSION = 'ja-names-1';
export interface NamingTerm {
  id: string;
  concept: string;
  reading: string;
  forms: readonly string[];
}
export const namingTerms: readonly NamingTerm[] = [
  { id: 'pear', concept: 'pear', reading: 'なし', forms: ['なし', '梨'] },
  { id: 'european-pear', concept: 'european-pear', reading: 'ようなし', forms: ['ようなし', '洋梨', '洋なし'] },
  { id: 'la-france', concept: 'la-france', reading: 'らふらんす', forms: ['らふらんす', 'ラ・フランス', 'ら・ふらんす'] },
  { id: 'dog', concept: 'dog', reading: 'いぬ', forms: ['いぬ', '犬'] },
  { id: 'wanko', concept: 'dog', reading: 'わんこ', forms: ['わんこ'] },
  { id: 'shiba-inu', concept: 'shiba-inu', reading: 'しばいぬ', forms: ['しばいぬ', '柴犬'] },
  { id: 'bird', concept: 'bird', reading: 'とり', forms: ['とり', '鳥'] },
  { id: 'sparrow', concept: 'sparrow', reading: 'すずめ', forms: ['すずめ', '雀'] },
  { id: 'flower', concept: 'flower', reading: 'はな', forms: ['はな', '花'] },
  { id: 'nose', concept: 'nose', reading: 'はな', forms: ['はな', '鼻'] },
  { id: 'sunflower', concept: 'sunflower', reading: 'ひまわり', forms: ['ひまわり', '向日葵'] },
];
/** A narrower noun is related, never automatically equivalent to its parent. */
export const parentConcept: Readonly<Record<string, string>> = {
  'european-pear': 'pear', 'la-france': 'european-pear',
  'shiba-inu': 'dog', sparrow: 'bird', sunflower: 'flower',
};
/** Authored-art identity may disambiguate her own noun, never a player's guess. */
export const canonicalDrawingNames: Readonly<Record<string, string>> = {
  'shizuku-style-v01-pear': 'european-pear', 'shizuku-style-v01-dog': 'dog',
  'shizuku-style-v01-bird': 'bird', 'shizuku-style-v01-flower': 'flower',
  'shizuku-style-v01-sunflower': 'sunflower',
};
function surface(value: string): string {
  return value.normalize('NFKC').trim().replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
const byForm = new Map<string, NamingTerm[]>();
for (const term of namingTerms) for (const form of term.forms) {
  const key = surface(form);
  byForm.set(key, [...(byForm.get(key) ?? []).filter(candidate => candidate.id !== term.id), term]);
}
export function japaneseNameCandidates(value: unknown): readonly NamingTerm[] {
  return typeof value === 'string' && value.length <= 80 ? byForm.get(surface(value)) ?? [] : [];
}
export function lookupJapaneseName(value: unknown): NamingTerm | null {
  const matches = japaneseNameCandidates(value);
  return matches.length === 1 ? matches[0] : null;
}
