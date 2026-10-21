import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorker, type Env } from './index';
import { createApiRecognizer } from '../src/services/recognizer';

const origin = 'https://drawindow.example';
const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8X8AAAAASUVORK5CYII=';
const env: Env = { GEMINI_API_KEY: 'test-secret-never-return', ALLOWED_ORIGINS: origin, RATE_LIMITER: { limit: async () => ({ success: true }) } };
const request = (body: unknown = { requestId: '1:1:1', imageDataUrl }, headers: Record<string, string> = {}) => new Request(`${origin}/api/recognize`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

it.each([['花', 'はな'], ['ラ・フランス', 'らふらんす']])('preserves the validated provider name %s through Worker and browser reading %s', async (name, reading) => {
  const worker = createWorker({ fetch: async () => providerResponse(name) });
  const browser = createApiRecognizer({ fetch: async (_url, options) => worker.fetch(request(JSON.parse(String(options?.body))), env) });
  const result = await browser.recognize({ requestId: '1:1:1', imageDataUrl, strokes: [], language: 'ja' });
  expect(result).toEqual({ guess: reading, label: name, source: 'api' });
  expect(JSON.stringify(result)).not.toContain('test-secret');
});
const providerResponse = (guess: unknown = 'cat') => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ guess }) }] }, finishReason: 'STOP' }] });
afterEach(() => vi.useRealTimers());

describe('recognition worker security and genuine-provider boundary', () => {
  it('forwards opaque auth keys unchanged in exactly one header without leaking them', async () => {
    const fixtures = ['AQ.' + 'fixture', 'AQ.' + 'fixture'.repeat(40), 'AIza' + 'fixture'.repeat(8)];
    for (const key of fixtures) {
      let headerMatches = false;
      let hasAlternateCredential = false;
      const worker = createWorker({ fetch: async (url, init) => {
        const sentHeaders = new Headers(init?.headers);
        headerMatches = sentHeaders.get('x-goog-api-key') === key;
        hasAlternateCredential = sentHeaders.has('Authorization') || new URL(String(url)).searchParams.has('key');
        return providerResponse('cat');
      } });
      const response = await worker.fetch(request(), { ...env, GEMINI_API_KEY: key });
      expect(headerMatches).toBe(true);
      expect(hasAlternateCredential).toBe(false);
      expect(response.status).toBe(200);
      expect((await response.text()).includes(key)).toBe(false);

      const failedWorker = createWorker({ fetch: async () => Response.json({ error:{ message:key } }, { status:401 }) });
      const failure = await failedWorker.fetch(request(), { ...env, GEMINI_API_KEY: key });
      expect(failure.status).toBe(503);
      expect((await failure.text()).includes(key)).toBe(false);
    }
  });

  it('sends the neutral PNG to Gemini and returns only its validated genuine guess', async () => {
    let sent: Record<string, unknown> = {};
    const worker = createWorker({ fetch: async (url, init) => {
      expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe(env.GEMINI_API_KEY);
      sent = JSON.parse(String(init?.body));
      return providerResponse(' FOX! ');
    } });
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ guess: 'fox', source: 'api' });
    expect(JSON.stringify(sent)).toContain('inlineData');
    expect(JSON.stringify(sent)).not.toContain('intendedWord');
  });
  it('rejects unauthorized, null and absent origins before any provider request', async () => {
    let calls = 0;
    const worker = createWorker({ fetch: async () => { calls++; return providerResponse(); } });
    for (const badOrigin of ['https://evil.example', 'null', '']) {
      const response = await worker.fetch(request(undefined, { Origin: badOrigin }), env);
      expect(response.status).toBe(403);
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    }
    expect(calls).toBe(0);
  });
  it('handles trusted preflight and rejects unrelated paths or methods', async () => {
    const worker = createWorker();
    expect((await worker.fetch(new Request(`${origin}/api/recognize`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } }), env)).status).toBe(204);
    expect((await worker.fetch(new Request(`${origin}/api/recognize`, { headers: { Origin: origin } }), env)).status).toBe(405);
    expect((await worker.fetch(new Request(`${origin}/elsewhere`, { headers: { Origin: origin } }), env)).status).toBe(404);
  });
  it('fails closed without key, origins or configured rate limiting', async () => {
    const worker = createWorker();
    for (const invalidEnv of [{ ...env, GEMINI_API_KEY: undefined }, { ...env, RATE_LIMITER: undefined }]) {
      const response = await worker.fetch(request(), invalidEnv);
      expect(response.status).toBe(503);
      const text = await response.text();
      expect(text).not.toContain('test-secret');
      expect(JSON.parse(text)).toMatchObject({ guess: null, source: 'api', errorCode: 'unavailable' });
    }
    expect((await worker.fetch(request(), { ...env, ALLOWED_ORIGINS: '*' })).status).toBe(403);
  });
  it('rejects rate-limited requests before paying the provider', async () => {
    let calls = 0;
    const worker = createWorker({ fetch: async () => { calls++; return providerResponse(); } });
    const response = await worker.fetch(request(), { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } });
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(calls).toBe(0);
  });
  it.each([
    [{ imageDataUrl: 'data:image/jpeg;base64,aGVsbG8=' }, 400],
    [{ imageDataUrl: 'data:image/png;base64,aGVsbG8=' }, 400],
    [{ imageDataUrl, requestId: 'bad id' }, 400],
    [{ imageDataUrl, intendedWord: 'cat', requestId: '1:1:1' }, 400],
    [{ imageDataUrl: `data:image/png;base64,${'A'.repeat(360000)}`, requestId: '1:1:1' }, 413],
  ])('validates MIME, PNG bytes, identity, extra fields and image size for %j', async (body, status) => {
    expect((await createWorker().fetch(request(body), env)).status).toBe(status);
  });
  it('rejects wrong content type, oversized streamed bodies and invalid JSON', async () => {
    const worker = createWorker();
    expect((await worker.fetch(request({}, { 'Content-Type': 'text/plain' }), env)).status).toBe(415);
    expect((await worker.fetch(new Request(`${origin}/api/recognize`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'x'.repeat(400001) }), env)).status).toBe(413);
    expect((await worker.fetch(new Request(`${origin}/api/recognize`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{bad' }), env)).status).toBe(400);
  });
  it.each([null, '', 'a cat', 'cat123', 'I cannot tell', '<script>', 'cat'.repeat(30)])('rejects unexpected provider output %j', async guess => {
    const response = await createWorker({ fetch: async () => providerResponse(guess) }).fetch(request(), env);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ guess: null, source: 'api', errorCode: 'invalid_response' });
  });
  it('handles blocked/invalid JSON responses and provider rate limits without fabricating results', async () => {
    for (const response of [Response.json({ candidates: [] }), new Response('not JSON'), Response.json({ error: 'rate' }, { status: 429 })]) {
      const result = await createWorker({ fetch: async () => response }).fetch(request(), env);
      expect([429, 502]).toContain(result.status);
      expect(await result.json()).toMatchObject({ guess: null, source: 'api' });
    }
  });
  it('bounds provider timeout even if its fetch ignores the abort signal', async () => {
    vi.useFakeTimers();
    const result = createWorker({ timeoutMs: 20, fetch: () => new Promise(() => {}) }).fetch(request(), env);
    await vi.advanceTimersByTimeAsync(30);
    const response = await result;
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ guess: null, source: 'api', errorCode: 'timeout' });
  });
});

describe('Japanese worker contract', () => {
  it('prompts for Japanese kana and returns a normalized label', async () => {
    let prompt = '';
    const worker = createWorker({ fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      prompt = body.contents[0].parts[1].text;
      return providerResponse('ネコ');
    } });
    const response = await worker.fetch(request({ requestId: '1:1:1', imageDataUrl, language: 'ja' }), env);
    expect(response.status).toBe(200);
    expect((await response.json() as { guess?: string }).guess).toBe('ねこ');
    expect(prompt).toMatch(/ひらがな/);
  });
  it('rejects unknown language tags and kanji guesses', async () => {
    let calls = 0;
    const worker = createWorker({ fetch: async () => { calls++; return providerResponse('猫'); } });
    expect((await worker.fetch(request({ requestId: '1:1:1', imageDataUrl, language: 'fr' }), env)).status).toBe(400);
    expect(calls).toBe(0);
    expect((await worker.fetch(request({ requestId: '1:1:1', imageDataUrl, language: 'ja' }), env)).status).toBe(502);
  });
});
