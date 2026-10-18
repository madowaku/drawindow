import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { inspectGeminiCredential } from './gemini-key.mjs';
import { verifyImageRecognition } from './verify-gemini.mjs';

const fixtures = ['AQ.fixture', 'AQ.' + 'fixture'.repeat(80) + '/+=', 'AIza' + 'fixture'.repeat(8), 'future.opaque-token'];
const unsafeFixtures = ['', 'with space', 'with\nnewline', 'with\rreturn', 'with\ttab', 'with"quote', 'with\\slash', 'with\0nul'];

test('credentials are opaque; no prefix or fixed length proves authentication', () => {
  for (const value of fixtures) {
    const report = inspectGeminiCredential(value);
    assert.equal(report.keySafeToStoreAndSend, true);
    assert.equal(report.authenticationVerified, false);
    assert.equal(JSON.stringify(report).includes(value), false);
  }
});

test('reject unsafe dotenv/header characters without returning the input', () => {
  for (const value of unsafeFixtures) assert.equal(inspectGeminiCredential(value).keySafeToStoreAndSend, false);
});

test('real-request verifier sends only a neutral image and reports allowlisted fields', async () => {
  let payload;
  const receipt = await verifyImageRecognition({ imageDataUrl: 'data:image/png;base64,fixture', fetchImpl: async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:8787/api/recognize');
    assert.equal(new Headers(init.headers).has('x-goog-api-key'), false);
    assert.equal(init.redirect, 'error');
    payload = JSON.parse(init.body);
    return Response.json({ guess: 'house', source: 'api', ignoredExtra: fixtures[0] });
  } });
  assert.deepEqual(Object.keys(payload).sort(), ['imageDataUrl', 'requestId']);
  assert.equal(receipt.authenticationVerified, true);
  assert.equal(receipt.recognizedObjectPresent, true);
  assert.equal(JSON.stringify(receipt).includes(fixtures[0]), false);
});

test('provider failure bodies and exception text cannot enter receipts', async () => {
  for (const fetchImpl of [
    async () => Response.json({ source: 'api', errorCode: 'unavailable', error: fixtures[0] }, { status: 503 }),
    async () => { throw new Error(fixtures[0]); },
  ]) {
    const receipt = await verifyImageRecognition({ imageDataUrl: 'fixture', fetchImpl });
    assert.equal(receipt.authenticationVerified, false);
    assert.equal(JSON.stringify(receipt).includes(fixtures[0]), false);
  }
});

test('diagnostics cannot be pointed at remote or credential-bearing URLs', async () => {
  for (const endpoint of ['https://example.com/api/recognize', 'http://user:pass@localhost/api/recognize', 'http://localhost/api/recognize?key=fixture']) {
    let called = false;
    await assert.rejects(verifyImageRecognition({ endpoint, imageDataUrl: 'fixture', fetchImpl: async () => { called = true; } }));
    assert.equal(called, false);
  }
});

test('masked PowerShell setup safely stores opaque credentials, preserves settings and enforces Git exclusion', async () => {
  const tempRoot = fileURLToPath(new URL('../artifacts/qa/temp/', import.meta.url));
  await mkdir(tempRoot, { recursive: true });
  const taskDir = await mkdtemp(join(tempRoot, 'gemini-auth-'));
  const scriptsDir = join(taskDir, 'scripts');
  const secretPath = join(taskDir, '.dev.vars');
  const scriptPath = join(scriptsDir, 'setup-gemini.ps1');
  const fixturePath = join(taskDir, 'fixture.json');
  await mkdir(scriptsDir);
  await copyFile(new URL('./setup-gemini.ps1', import.meta.url), scriptPath);
  const harness = fileURLToPath(new URL('./tests/setup-gemini.harness.ps1', import.meta.url));
  const initial = 'OTHER_SETTING="keep-me"\r\nexport GEMINI_API_KEY = "old-fixture"\r\nAFTER_SETTING="also-keep"\r\n';
  async function run(key, ignored = true) {
    await writeFile(secretPath, initial);
    await writeFile(fixturePath, JSON.stringify({ key, ignored }));
    const result = spawnSync('powershell', ['-NoProfile', '-File', harness, '-FixturePath', fixturePath, '-ScriptPath', scriptPath], { encoding: 'utf8', timeout: 15000 });
    const output = result.stdout + result.stderr;
    if (key) assert.equal(output.includes(key), false);
    return { status: result.status, diagnostic: output, stored: await readFile(secretPath, 'utf8') };
  }
  try {
    for (const key of fixtures) {
      const result = await run(key);
      assert.equal(result.status, 0, result.diagnostic);
      const parsed = parseEnv(result.stored);
      assert.equal(parsed.GEMINI_API_KEY === key, true);
      assert.equal(parsed.OTHER_SETTING, 'keep-me');
      assert.equal(parsed.AFTER_SETTING, 'also-keep');
    }
    for (const key of unsafeFixtures) {
      const result = await run(key);
      assert.equal(result.status, 1);
      assert.equal(result.stored === initial, true);
    }
    const excluded = await run(fixtures[0], false);
    assert.equal(excluded.status, 1);
    assert.equal(excluded.stored === initial, true);
  } finally {
    const absoluteTaskDir = await realpath(taskDir);
    const boundary = await realpath(tempRoot);
    const inside = relative(boundary, absoluteTaskDir);
    assert.equal(inside.length > 0, true);
    assert.equal(inside.startsWith('..') || resolve(boundary, inside) !== absoluteTaskDir, false);
    await rm(absoluteTaskDir, { recursive: true, force: true });
  }
});
