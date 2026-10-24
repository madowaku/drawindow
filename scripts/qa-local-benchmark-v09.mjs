import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4190/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4190', '--strictPort'], { stdio: 'pipe' });
let browser;
const result = { scope: 'Synthetic developer UI/inference/export smoke; no human judgements or accuracy result', status: 'started', external: [], posts: 0, errors: [] };
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('request', r => { if (!r.url().startsWith(origin)) result.external.push(r.url()); if (r.method() === 'POST') result.posts++; });
  page.on('pageerror', e => result.errors.push(String(e)));
  await page.goto(origin + '?recognition-benchmark');
  await page.getByRole('button', { name: 'ZERO-STROKE CHECK' }).click();
  await page.getByText('invalid_input · API calls: 0', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: '匿名の描き手ID' }).fill('SYNTHETIC_QA');
  const canvas = page.getByTestId('window-drawing-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  for (let i = 0; i <= 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    await page.mouse.move(box.x + box.width * (.5 + .25 * Math.cos(angle)), box.y + box.height * (.5 + .25 * Math.sin(angle)));
    if (i === 0) await page.mouse.down();
  }
  await page.mouse.up(); await page.getByRole('button', { name: 'SEND ONCE', exact: true }).click();
  await page.getByTestId('guess-1').waitFor({ timeout: 60000 });
  await page.getByText(/Top 3: circle/).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Top 3 · attempt 1' }).inputValue(), '');
  assert.equal(await page.getByRole('combobox', { name: '続行 · attempt 1' }).inputValue(), '');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sanitized JSON' }).click();
  const download = await downloadEvent;
  const record = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(record.attempts.length, 1);
  assert.equal(record.attempts[0].source, 'ml'); assert.equal(record.attempts[0].top3.length, 3);
  assert.equal(record.attempts[0].judgement, null); assert.equal(record.attempts[0].chainContinued, null);
  assert.equal(record.feedback.fun, null); assert.equal(record.feedback.replay, null);
  assert.equal(record.attempts[0].strokes, undefined); assert.equal(record.attempts[0].imageDataUrl, undefined);
  assert.equal(result.posts, 0); assert.deepEqual(result.external, []); assert.deepEqual(result.errors, []);
  await mkdir('artifacts/release', { recursive: true });
  await page.screenshot({ path: 'artifacts/release/offline-benchmark-mobile.png', fullPage: true });
  result.status = 'success'; result.rankCount = 3; result.unreviewedPreserved = true; result.userInitiatedExport = true;
} catch (error) { result.status = 'failure'; result.error = String(error); throw error; }
finally { await browser?.close(); server.kill(); await writeFile('artifacts/release/offline-benchmark-smoke.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result)); }
