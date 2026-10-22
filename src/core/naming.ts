import { canonicalDrawingNames, japaneseNameCandidates, lookupJapaneseName, NAMING_DICTIONARY_VERSION, namingTerms, parentConcept } from '../data/namingDictionary';
import { normalizeWord } from './words';
import type { DrawingEntry, GirlSketch, Language, MeaningRecord, NameObservation, RecognitionResult } from './types';

export function observeName(value: unknown, language: Language): NameObservation {
  const reading = normalizeWord(value, language);
  const term = language === 'ja' && reading ? lookupJapaneseName(value) ?? lookupJapaneseName(reading) : null;
  const ambiguous = language === 'ja' && reading && new Set(japaneseNameCandidates(value).map(candidate => candidate.concept)).size > 1;
  return { label: reading && typeof value === 'string' ? value.trim() : null, reading, termId: term?.id ?? null, conceptId: term?.concept ?? null, ...(ambiguous ? { ambiguous: true } : {}), dictionaryVersion: NAMING_DICTIONARY_VERSION };
}
export function observeCanonicalName(sketch: GirlSketch, language: Language): NameObservation {
  const observed = observeName(sketch.word, language);
  const term = language === 'ja' ? namingTerms.find(candidate => candidate.id === canonicalDrawingNames[sketch.id]) : null;
  return term && term.reading === observed.reading
    ? { label: observed.label, reading: observed.reading, termId: term.id, conceptId: term.concept, dictionaryVersion: NAMING_DICTIONARY_VERSION }
    : observed;
}

/** Preserve the actual top guess. Alternatives cannot be selected to repair a link. */
export function recognitionDetails(result: RecognitionResult, language: Language): RecognitionResult {
  const guess = normalizeWord(result.guess, language);
  const label = result.label ?? result.guess;
  const alternatives = Array.isArray(result.alternatives)
    ? result.alternatives.slice(0, 5).flatMap(value => { const word = normalizeWord(value, language); return word ? [word] : []; }) : [];
  return { guess, source: result.source,
    ...(language === 'ja' && typeof label === 'string' && label !== guess && normalizeWord(label, language) === guess ? { label } : {}),
    ...(result.uncertain === true ? { uncertain: true } : {}),
    ...(alternatives.length ? { alternatives } : {}),
  };
}
function descendsFrom(child: string, ancestor: string): boolean {
  const visited = new Set<string>();
  for (let next = parentConcept[child]; next && !visited.has(next); next = parentConcept[next]) {
    if (next === ancestor) return true;
    visited.add(next);
  }
  return false;
}
export function assessMeaning(entry: DrawingEntry, language: Language): MeaningRecord {
  const intention = entry.naming?.intention ?? observeName(entry.intendedWord, language);
  const recognized = entry.naming?.recognition ?? observeName(entry.recognition?.label ?? entry.recognition?.guess, language);
  const result = entry.recognition;
  const certainty = !result?.guess || result.error || entry.round === 5 ? 'unavailable'
    : result.source === 'mock' ? 'simulated'
    : result.uncertain || intention.ambiguous || recognized.ambiguous || result.alternatives?.some(word => normalizeWord(word, language) !== normalizeWord(result.guess, language)) ? 'uncertain' : 'unverified';
  const a = intention.conceptId, b = recognized.conceptId;
  const relation = !a || !b ? 'unknown' : a === b ? 'equivalent'
    : descendsFrom(b, a) ? 'narrower' : descendsFrom(a, b) ? 'broader' : 'different';
  return { relation, certainty, dictionaryVersion: NAMING_DICTIONARY_VERSION };
}

export function recordRecognition(entry: DrawingEntry, result: RecognitionResult, language: Language): DrawingEntry {
  const next = { ...entry, recognition: result };
  if (language !== 'ja') return next;
  const named = { ...next, naming: { ...entry.naming, recognition: observeName(result.label ?? result.guess, language) } };
  return { ...named, naming: { ...named.naming, meaning: assessMeaning(named, language) } };
}
export function recordIntention(entry: DrawingEntry, label: string, language: Language): DrawingEntry {
  const next = { ...entry, intendedWord: normalizeWord(label, language) };
  if (language !== 'ja') return next;
  const named = { ...next, naming: { ...entry.naming, intention: observeName(label, language) } };
  return { ...named, naming: { ...named.naming, meaning: assessMeaning(named, language) } };
}

/** Lexical compatibility is not proof that an uncertain model saw the right object. */
export function meaningNote(entry: DrawingEntry, language: Language): string | null {
  if (entry.actor !== 'player' || entry.round === 5) return null;
  const result = entry.naming?.meaning ?? assessMeaning(entry, 'ja');
  if (result.certainty === 'simulated' || result.certainty === 'unavailable') return null;
  if (result.certainty === 'uncertain') return language === 'ja'
    ? 'しずくの推測はまだ確かではありません。呼び名を並べて、絵を見返してみよう。'
    : 'Her guess is still uncertain. We can look at the drawing and both names again.';
  if (!['equivalent', 'narrower', 'broader'].includes(result.relation)) return null;
  const intended = entry.naming?.intention?.label ?? entry.intendedWord;
  const recognized = entry.naming?.recognition?.label ?? entry.recognition?.label ?? entry.recognition?.guess;
  if (intended === recognized) return null;
  return result.relation === 'equivalent'
    ? language === 'ja' ? '呼び方は違っても、同じものを思い描いていたのかもしれません。' : 'Different names may have held the same little thought.'
    : language === 'ja' ? '違う呼び名の向こうに、近いイメージがあったのかもしれません。' : 'Behind the different names, there may have been a similar little thought.';
}
