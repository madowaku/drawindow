import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiRecognizer, createDemoRecognizer, createRecognitionRunner } from './recognizer';
import type { RecognitionInput } from '../core/types';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8X8AAAAASUVORK5CYII=';
const input: RecognitionInput = { requestId: '1:1:1', strokes: [{ id: 's', points: [{ x: .5, y: .5, t: 0 }] }], imageDataUrl: image };
afterEach(() => vi.useRealTimers());

describe('browser recognition boundary', () => {
  it('sends only the neutral image and identity, accepts a genuine normalized API word', async () => {
    let sent: Record<string, unknown> | undefined;
    const recognizer = createApiRecognizer({ fetch: async (url, init) => {
      expect(url).toBe('/api/recognize');
      sent = JSON.parse(String(init?.body));
      return Response.json({ guess: ' FOX! ', source: 'api' });
    } });
    expect(await recognizer.recognize(input)).toEqual({ guess: 'fox', source: 'api' });
    expect(sent).toEqual({ requestId: '1:1:1', imageDataUrl: image });
  });
  it.each([
    [403, { errorCode: 'unavailable' }, 'unavailable'],
    [429, { error: 'rate_limit' }, 'rate_limit'],
    [502, { errorCode: 'invalid_response' }, 'invalid_response'],
    [503, { errorCode: 'unavailable' }, 'unavailable'],
    [504, { errorCode: 'timeout' }, 'timeout'],
    [200, { guess: 'cat', source: 'mock' }, 'invalid_response'],
    [200, { guess: 'I think a cat', source: 'api' }, 'invalid_response'],
    [200, { guess: null, source: 'api' }, 'invalid_response'],
  ])('returns explicit failure for %s %j', async (status, body, code) => {
    const result = await createApiRecognizer({ fetch: async () => Response.json(body, { status }) }).recognize(input);
    expect(result).toMatchObject({ guess: null, source: 'api', errorCode: code });
    expect(result.error).toBeTruthy();
  });
  it('handles invalid JSON and rejects missing/unsupported image without calling a provider', async () => {
    expect(await createApiRecognizer({ fetch: async () => new Response('<html>missing worker</html>') }).recognize(input)).toMatchObject({ guess: null, errorCode: 'invalid_response' });
    let calls = 0;
    const recognizer = createApiRecognizer({ fetch: async () => { calls++; return Response.json({}); }, imageRenderer: () => { throw Error('no canvas'); } });
    expect(await recognizer.recognize({ ...input, imageDataUrl: undefined })).toMatchObject({ guess: null, errorCode: 'invalid_input' });
    expect(calls).toBe(0);
    expect(await recognizer.recognize({ ...input, imageDataUrl: 'data:image/jpeg;base64,aGVsbG8=' })).toMatchObject({ guess: null, errorCode: 'invalid_input' });
  });
  it('preserves Worker abstention as invalid_response and reports only safe HTTP metadata', async () => {
    const onResponse = vi.fn();
    const result = await createApiRecognizer({ onResponse, fetch: async () => Response.json({ errorCode: 'invalid_response' }, { status: 502 }) }).recognize(input);
    expect(result).toMatchObject({ guess: null, errorCode: 'invalid_response' });
    expect(onResponse).toHaveBeenCalledWith({ httpStatus: 502, retryAfterMs: null });
  });
  it('reports Retry-After without resending a rate limited request', async () => {
    const fetch = vi.fn(async () => Response.json({}, { status: 429, headers: { 'Retry-After': '75' } }));
    const onResponse = vi.fn();
    expect(await createApiRecognizer({ fetch, onResponse }).recognize(input)).toMatchObject({ errorCode: 'rate_limit' });
    expect(onResponse).toHaveBeenCalledWith({ httpStatus: 429, retryAfterMs: 75000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('times out even when a transport ignores AbortSignal', async () => {
    vi.useFakeTimers();
    const promise = createApiRecognizer({ timeoutMs: 20, fetch: () => new Promise(() => {}) }).recognize(input);
    await vi.advanceTimersByTimeAsync(25);
    expect(await promise).toMatchObject({ guess: null, source: 'api', errorCode: 'timeout' });
  });
  it('coalesces concurrent and completed duplicate requests without affecting a different id', async () => {
    let calls = 0;
    const runner = createRecognitionRunner({ recognize: async () => { calls++; return { guess: 'cat', source: 'api' }; } });
    expect(await Promise.all([runner.recognize(input), runner.recognize(input)])).toEqual([{ guess: 'cat', source: 'api' }, { guess: 'cat', source: 'api' }]);
    await runner.recognize(input);
    expect(calls).toBe(1);
    await runner.recognize({ ...input, requestId: '1:1:2' });
    expect(calls).toBe(2);
  });
  it('bounds a broken adapter and converts throws into explicit failure', async () => {
    vi.useFakeTimers();
    const runner = createRecognitionRunner({ recognize: () => new Promise(() => {}) }, { timeoutMs: 20 });
    const result = runner.recognize(input);
    await vi.advanceTimersByTimeAsync(25);
    expect(await result).toMatchObject({ guess: null, errorCode: 'timeout' });
    expect(await createRecognitionRunner({ recognize: async () => { throw Error('oops'); } }).recognize(input)).toMatchObject({ guess: null, errorCode: 'network' });
  });
  it('labels deterministic simulation mock and chooses round guesses independently of drawn meaning', async () => {
    const demo = createDemoRecognizer();
    const result = await demo.recognize(input);
    expect(result).toEqual({ guess: 'cat', source: 'mock' });
    expect(await demo.recognize({ ...input, strokes: [] })).toEqual(result);
    expect(await demo.recognize({ ...input, requestId: '1:2:8' })).toEqual({ guess: 'tree', source: 'mock' });
  });
});

describe('Japanese browser recognition', () => {
  it('sends an explicit Japanese language tag and accepts kana only', async () => {
    let payload: any;
    const recognizer = createApiRecognizer({ fetch: async (_url, init) => {
      payload = JSON.parse(String(init?.body));
      return Response.json({ guess: 'ネコ', source: 'api' });
    } });
    expect(await recognizer.recognize({ ...input, language: 'ja' })).toEqual({ guess: 'ねこ', source: 'api' });
    expect(payload).toEqual({ requestId: input.requestId, imageDataUrl: image, language: 'ja' });
    expect(await createApiRecognizer({ fetch: async () => Response.json({ guess: '猫', source: 'api' }) }).recognize({ ...input, language: 'ja' })).toMatchObject({ guess: null, errorCode: 'invalid_response' });
  });
  it('has an independent non-recognition Japanese demo script', async () => {
    const demo = createDemoRecognizer();
    expect(await demo.recognize({ ...input, language: 'ja' })).toMatchObject({ guess: 'くじら', source: 'mock' });
    expect(await demo.recognize({ ...input, language: 'ja', requestId: '1:2:2' })).toMatchObject({ guess: 'うさぎ', source: 'mock' });
  });
});
