import type { DrawingEntry, ScoreLink, ScoreResult, SessionKind, Language } from './types';
import { chainLettersMatch, firstLetter, lastLetter } from './words';

export function calculateScore(entries: readonly DrawingEntry[], sessionKind: SessionKind = 'api', language: Language = 'en'): ScoreResult {
  const validSession = entries.length === 10 && entries.every((entry, index) =>
    entry.actor === (index % 2 ? 'player' : 'girl') && entry.round === Math.floor(index / 2) + 1,
  );
  const entryComparable = (entry?: DrawingEntry) => Boolean(entry?.comparable && entry.recognition?.source !== 'mock');
  const links: ScoreLink[] = Array.from({ length: 9 }, (_, index) => {
    const from = entries[index], to = entries[index + 1];
    const fromLetter = lastLetter(from?.intendedWord, language), toLetter = firstLetter(to?.intendedWord, language);
    return {
      index, fromEntryId: from?.id ?? null, toEntryId: to?.id ?? null, fromLetter, toLetter,
      status: !fromLetter || !toLetter ? 'unknown' : !to?.chainRestart && !(language === 'ja' && fromLetter === 'ん') && chainLettersMatch(fromLetter, toLetter, language) ? 'connected' : 'broken',
      comparable: sessionKind === 'api' && entryComparable(from) && entryComparable(to),
    };
  });
  let bestChain = 0, run = 0, connectedCount = 0, knownPairCount = 0;
  for (const link of links) {
    if (link.status !== 'unknown') knownPairCount++;
    if (link.status === 'connected') { connectedCount++; run++; bestChain = Math.max(bestChain, run); }
    else run = 0;
  }
  const comparable = validSession && sessionKind === 'api' && entries.every(entryComparable);
  return {
    links, connectedCount, knownPairCount, possiblePairCount: 9,
    linkScore: knownPairCount ? connectedCount / knownPairCount : null, bestChain, comparable,
    perfect: comparable && knownPairCount === 9 && connectedCount === 9,
  };
}
