import { describe, expect, it } from 'vitest';
import vocabulary from '../../docs/vocabulary-coverage-v09.json';
import { quickDrawJapanese } from './quickDrawJapanese';
import { normalizeWord } from '../core/words';
import { imageOnlyQuickDrawResult } from './quickDrawScores';
import type { Language, RecognitionResult } from '../core/types';
const labels = vocabulary.model.labelsText.trim().split('\n');
const failure: RecognitionResult = { guess: null, source: 'ml', errorCode: 'invalid_response', error: 'The on-device sketch model could not recognize this drawing. No image was uploaded.' };
// Frozen v0.9 branch, intentionally independent of the extracted helper.
function legacy(ranked: { label: string; score: number }[], language: Language): RecognitionResult {
  const best = ranked[0];
  if (!best || best.score < .05) return failure;
  const mapped = language === 'ja' ? quickDrawJapanese[best.label] : best.label;
  const guess = normalizeWord(mapped, language);
  if (!guess) return failure;
  return { guess, source: 'ml', alternatives: ranked.slice(1,4).map(({ label }) => language === 'ja' ? quickDrawJapanese[label] ?? label : label) };
}
describe('A exactly reproduces frozen v0.9 result interpretation', () => {
  it.each(['en', 'ja'] as const)('matches rankings, ties, multiword labels, low floor and unmapped Top1 in %s', language => {
    for (let seed = 0; seed < 40; seed++) {
      const ranked = labels.map((label, i) => ({ label, score: seed === 0 ? .001 : seed === 1 ? .05 : ((i * 101 + seed * 29) % 359) / 359 })).sort((a,b) => b.score - a.score);
      expect({ ...imageOnlyQuickDrawResult(ranked, language), failureReason: undefined }).toEqual(legacy(ranked, language));
    }
  });
  it('keeps an unsupported Japanese Top1 unknown even if Top2 maps', () => {
    const ranked = labels.map(label => ({ label, score: label === 'aircraft carrier' ? .6 : label === 'dog' ? .3 : .0001 })).sort((a,b) => b.score-a.score);
    expect({ ...imageOnlyQuickDrawResult(ranked, 'ja'), failureReason: undefined }).toEqual(legacy(ranked,'ja'));
    expect(imageOnlyQuickDrawResult(ranked, 'ja').guess).toBeNull();
  });
  it('names why an image-only result failed without changing the decision', () => {
    const low = labels.map(label => ({ label, score: label === 'dog' ? .04 : .0001 })).sort((a,b) => b.score-a.score);
    expect(imageOnlyQuickDrawResult(low, 'en')).toMatchObject({ guess: null, errorCode: 'invalid_response', failureReason: 'low_score' });
    const unmapped = labels.map(label => ({ label, score: label === 'aircraft carrier' ? .6 : .0001 })).sort((a,b) => b.score-a.score);
    expect(imageOnlyQuickDrawResult(unmapped, 'ja')).toMatchObject({ guess: null, errorCode: 'invalid_response', failureReason: 'unmapped' });
    expect(imageOnlyQuickDrawResult(unmapped, 'en').failureReason).toBeUndefined();
  });
});
