import { describe, expect, it, vi } from 'vitest';
import { BenchmarkSession, BENCHMARK_PROMPTS, summarize, exportJson, exportCsv } from './recognitionBenchmark';
import type { RecognitionInput, Stroke } from '../core/types';

const strokes: readonly Stroke[] = [{ id: 'human-input-test-only', points: [{ x: .2, y: .3, t: 0 }, { x: .7, y: .8, t: 12 }] }];
const image = 'data:image/png;base64,aGVsbG8=';
const identity = { drawerId: 'P01', device: 'desktop' as const, inputTypes: ['mouse' as const] };
function session(result = { guess: 'apple', source: 'api' as const }) {
  let now = 10000;
  const recognize = vi.fn(async (_input: RecognitionInput) => result);
  const imageRenderer = vi.fn(() => image);
  const value = new BenchmarkSession({ recognizer: { recognize }, imageRenderer, now: () => now });
  return { value, recognize, imageRenderer, advance: (ms = 6000) => { now += ms; } };
}

describe('human freehand benchmark protocol (fixtures are not benchmark evidence)', () => {
  it('predeclares eleven recognizable intentions and a twelfth negative sample', () => {
    expect(BENCHMARK_PROMPTS.map(p => p.intent)).toEqual(['apple', 'cat', 'tree', 'house', 'fish', 'clock', 'elephant', 'guitar', 'umbrella', 'tissue box', 'mouse (animal)', 'human-drawn unrecognizable scribble']);
    expect(BENCHMARK_PROMPTS.filter(p => p.recognizable)).toHaveLength(11);
  });
  it('blocks empty, nonfinite, out of bounds and oversized raw drawings before rendering or transport', async () => {
    const { value, recognize, imageRenderer } = session();
    for (const drawing of [[], [{ id: 'bad', points: [{ x: NaN, y: .3, t: 0 }] }], [{ id: 'bad', points: [{ x: 2, y: .3, t: 0 }] }], [{ id: 'large', points: Array(16001).fill(strokes[0].points[0]) }]]) {
      expect(await value.send(0, drawing, identity)).toBeNull();
      expect(value.validationError).toBe('invalid_input');
    }
    expect(recognize).not.toHaveBeenCalled();
    expect(imageRenderer).not.toHaveBeenCalled();
    expect(value.checkZeroStrokes()).toMatchObject({ result: 'invalid_input', apiCalls: 0 });
  });
  it('makes one call with image and request identity, prevents double clicks, and requires explicit paced retries', async () => {
    const { value, recognize, advance } = session();
    const first = value.send(0, strokes, identity);
    expect(await value.send(0, strokes, identity)).toBeNull();
    const record = await first;
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(Object.keys(recognize.mock.calls[0][0]).sort()).toEqual(['imageDataUrl', 'requestId', 'strokes']);
    expect(record).toMatchObject({ sampleId: '01', attempt: 1, intent: 'apple', rawPointCount: 2, guess: 'apple', httpStatus: null });
    expect(record?.requestId).toMatch(/^\d+:1:1$/);
    expect(await value.send(0, strokes, identity)).toBeNull();
    advance();
    expect(await value.send(0, strokes, identity)).toBeNull();
    expect(await value.send(0, strokes, identity, true)).toMatchObject({ attempt: 2 });
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(summarize(value.attempts)).toMatchObject({ firstAttempts: 1, retries: 1, exact: 0, denominator: 11 });
  });
  it('rejects DEMO source and thrown provider details without fallback or leaking bodies', async () => {
    const recognize = vi.fn().mockResolvedValueOnce({ source: 'mock', guess: 'cat' }).mockRejectedValueOnce(Error('AQ.secret-provider-body'));
    const value = new BenchmarkSession({ recognizer: { recognize }, imageRenderer: () => image, now: () => 100000 });
    expect(await value.send(0, strokes, identity)).toMatchObject({ source: 'mock', guess: null, errorCode: 'invalid_response' });
    const other = new BenchmarkSession({ recognizer: { recognize }, imageRenderer: () => image });
    expect(await other.send(0, strokes, identity)).toMatchObject({ errorCode: 'network' });
    expect(exportJson(other)).not.toContain('secret-provider-body');
    expect(recognize).toHaveBeenCalledTimes(2);
  });
  it('accepts normalized multiword local labels and preserves unknown as failure', async () => {
    const { value } = session({ guess: 'alarm clock', source: 'ml' } as any);
    expect(await value.send(0, strokes, identity)).toMatchObject({ guess: 'alarm clock', source: 'ml', errorCode: null });
    expect(summarize(value.attempts)).toMatchObject({ errorCount: 0, unknown: 0, chainObserved: 0 });
    const missing = session({ guess: null, source: 'ml', errorCode: 'invalid_response' } as any).value;
    expect(await missing.send(0, strokes, identity)).toMatchObject({ guess: null, source: 'ml', errorCode: 'invalid_response', top3MatchesIntent: null });
    expect(summarize(missing.attempts)).toMatchObject({ errorCount: 1, unknown: 1 });
  });
  it('holds rate limits for at least sixty seconds and never automatically retries', async () => {
    const { value, recognize, advance } = session({ guess: null, source: 'api', errorCode: 'rate_limit' } as any);
    await value.send(0, strokes, identity);
    advance(59000);
    expect(await value.send(0, strokes, identity, true)).toBeNull();
    advance(1000);
    expect(await value.send(0, strokes, identity, true)).toMatchObject({ attempt: 2 });
    expect(recognize).toHaveBeenCalledTimes(2);
  });
  it('computes first-pass counts, nearest-rank p90, median and actual next-template coverage independently of retries', async () => {
    const { value, advance } = session();
    for (let i = 0; i < 12; i++) {
      const record = await value.send(i, strokes, identity);
      value.judge(record!.requestId, i === 11 ? 'unrelated' : i < 8 ? 'exact' : 'plausible_alternative', 'Visible marks support this judgement.');
      value.attempts[i].elapsedMs = (i + 1) * 100;
      advance();
    }
    await value.send(0, strokes, identity, true);
    expect(summarize(value.attempts)).toMatchObject({ firstAttempts: 12, retries: 1, exact: 8, plausibleOrExact: 11, errorCount: 0, denominator: 11, latency: { min: 100, median: 650, p90: 1100, max: 1200 }, nextInitials: ['e'] });
  });
  it('exports only sanitized allowlisted values and protects spreadsheet cells from formulas', async () => {
    const { value } = session();
    const record = await value.send(0, strokes, identity);
    value.judge(record!.requestId, 'exact', '=HYPERLINK("bad") AQ.private-token');
    Object.assign(value.attempts[0], { headers: { authorization: 'secret' }, imageDataUrl: image, strokes, confidence: .99 });
    const json = exportJson(value);
    expect(json).not.toMatch(/private-token|authorization|confidence|imageDataUrl|human-input-test-only/);
    expect(JSON.parse(json).summary).toMatchObject({ exact: 1, firstAttempts: 1 });
    expect(exportCsv(value)).toContain("'=HYPERLINK");
  });
  it('keeps whitespace-only human rationale unevaluated and includes actual confusion notes in the report', async () => {
    const { value } = session({ guess: 'shovel', source: 'api' });
    const record = await value.send(7, strokes, identity);
    value.judge(record!.requestId, 'plausible_alternative', '   ');
    expect(summarize(value.attempts).judged).toBe(0);
    value.judge(record!.requestId, 'plausible_alternative', 'Long neck and broad end also resemble a shovel.');
    expect(summarize(value.attempts).confusionExamples).toEqual([{ sampleId: '08', intent: 'guitar', guess: 'shovel', judgement: 'plausible_alternative', rationale: 'Long neck and broad end also resemble a shovel.' }]);
  });
});
