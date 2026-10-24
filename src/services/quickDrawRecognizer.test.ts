// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import vocabulary from '../../docs/vocabulary-coverage-v09.json';
const { run, tensorDelete, outputDelete, runtime } = vi.hoisted(() => ({ run: vi.fn(), tensorDelete: vi.fn(), outputDelete: vi.fn(), runtime: { scores: [] as number[] } }));
vi.mock('@litertjs/core', () => ({
  loadLiteRt: vi.fn(async () => {}),
  loadAndCompile: vi.fn(async () => ({ getInputDetails: () => [{ shape: [1,28,28,1] }], getOutputDetails: () => [{ shape: [1,345] }], run: async () => { run(); return [{ data: async () => new Float32Array(runtime.scores), delete: outputDelete }]; } })),
  Tensor: class { delete = tensorDelete; },
}));
const labels = vocabulary.model.labelsText.trim().split('\n');
const strokes = [{ id: 'synthetic', points: [{ x: .2, y: .2, t: 0 }, { x: .7, y: .7, t: 10 }] }];
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => labels.join('\n') })));
  runtime.scores = labels.map(label => label === 'cat' ? .7 : label === 'dog' ? .2 : .0001);
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('one complete model run and unchanged production A', () => {
  it('returns full DEV ranking with a single model invocation, and isolates diagnostic mutation', async () => {
    const { createQuickDrawRecognizer } = await import('./quickDrawRecognizer');
    let size = 0;
    const recognizer = createQuickDrawRecognizer({ onRanking: candidates => { size = candidates.length; (candidates[0] as {label:string}).label = 'dog'; } });
    const result = await recognizer.recognize({ requestId: 'synthetic', language: 'en', strokes });
    expect(run).toHaveBeenCalledTimes(1);
    expect(size).toBe(345);
    expect(result).toMatchObject({ guess: 'cat', source: 'ml', alternatives: expect.arrayContaining(['dog']) });
    expect(tensorDelete).toHaveBeenCalledTimes(1); expect(outputDelete).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete or nonfinite tensors without creating research candidates', async () => {
    const { createQuickDrawRecognizer } = await import('./quickDrawRecognizer');
    const ranking = vi.fn();
    const recognizer = createQuickDrawRecognizer({ onRanking: ranking });
    for (const scores of [[1,2,3], labels.map((_, i) => i === 0 ? Infinity : .1)]) {
      runtime.scores = scores;
      expect(await recognizer.recognize({ requestId: 'invalid', strokes })).toMatchObject({ guess: null, errorCode: 'invalid_response' });
    }
    expect(run).toHaveBeenCalledTimes(2); expect(ranking).not.toHaveBeenCalled();
  });
});
