import type { DrawingEntry, Language, ScoreLink, ScoreResult } from '../core/types';
import { normalizeWord } from '../core/words';

export function closingLine(entries: readonly DrawingEntry[], score: ScoreResult, language: Language, wordLanguage: Language = language): string {
  const players = entries.filter(e => e.actor === 'player' && e.round < 5);
  const mismatch = players.some(e => e.intendedWord && e.recognition?.source === 'api' && e.recognition.guess && normalizeWord(e.intendedWord, wordLanguage) !== normalizeWord(e.recognition.guess, wordLanguage));
  if (mismatch) return language === 'ja' ? '同じものは見えなかった。それでも、描き続けた。' : "We didn't see the same things. But we kept drawing.";
  const unknown = entries.length !== 10 || score.knownPairCount < 9 || players.some(e => !e.recognition?.guess || e.recognition.source === 'mock');
  if (unknown) return language === 'ja' ? '言葉にならない想いもあった。それでも、描き続けた。' : 'Some meanings stayed unspoken. But we kept drawing.';
  return language === 'ja' ? '一枚ずつ、それぞれの想いで。それでも、描き続けた。' : 'Each picture held its own meaning. And we kept drawing.';
}

export function linkLabel(link: ScoreLink, language: Language): string {
  return language === 'ja'
    ? { connected: 'つながった', broken: 'ちがう道へ', unknown: 'まだわからない' }[link.status]
    : { connected: 'CONNECTED', broken: 'A DIFFERENT DIRECTION', unknown: 'UNKNOWN LINK' }[link.status];
}

export function entryNote(entry: DrawingEntry, language: Language): string | null {
  const t = (en: string, ja: string) => language === 'ja' ? ja : en;
  if (entry.chainRestart) return t('The chain ended in ん; a new drawing began.', '「ん」で途切れて、新しい絵から再開しました。');
  if (entry.nonComparableReason === 'uncovered_letter') return t('The catalogue had no next drawing. This is not a recognition mistake.', '次の音の絵が用意されていませんでした。認識の誤りではありません。');
  return null;
}

export function interpretation(entry: DrawingEntry, language: Language): string {
  const t = (en: string, ja: string) => language === 'ja' ? ja : en;
  if (entry.round === 5) return t('Final drawing · not sent for recognition', '最後の絵は認識していません');
  if (!entry.recognition?.guess) return t('Her interpretation: unknown', 'しずくの解釈：不明');
  return `${entry.recognition.source === 'mock' ? t('Demo interpretation', 'デモの解釈') : t('She thought', 'しずくには')}: ${entry.recognition.guess}`;
}
