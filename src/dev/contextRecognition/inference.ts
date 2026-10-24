import type { RecognitionInput, RecognitionResult } from '../../core/types';
import type { ScoredLabel } from '../../services/quickDrawScores';
import { createQuickDrawRecognizer } from '../../services/quickDrawRecognizer';

/** Expected prepared asset identity, not a runtime file-hash measurement. */
export const MODEL_METADATA = Object.freeze({
  revision: 'b02fde8d8732aed32bc9d8176c3dc4efda0333fb',
  expectedStaticModelSha256: 'ec16e54af69fb3f5b5a35c8e737301c5440022dbaa95c83130eb10f8d7baab34',
  expectedLabelsSha256: '2ed0dac4ba018854a3e3166f9862e5529bc5f58a80d157d57eee22ca731895d5',
  engine: '@litertjs/core@2.5.3',
  preprocessing: 'v0.9 production defaults; background 0, strokes 1',
});
export interface ContextInference {
  candidates: readonly ScoredLabel[];
  baseline: RecognitionResult;
  inferenceMs: number;
}
/** Runtime inputs deliberately exclude previous word and evaluation gold. */
export async function inferContextDrawing(input: Pick<RecognitionInput, 'requestId' | 'language' | 'strokes'>, options?: { signal?: AbortSignal }): Promise<ContextInference> {
  let candidates: readonly ScoredLabel[] = [];
  const recognizer = createQuickDrawRecognizer({ onRanking: ranked => { candidates = ranked.map(candidate => ({ ...candidate })); } });
  const started = performance.now();
  const baseline = await recognizer.recognize({ requestId: input.requestId, language: input.language, strokes: input.strokes }, options);
  return { candidates, baseline, inferenceMs: Math.max(0, performance.now() - started) };
}
