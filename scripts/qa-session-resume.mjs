import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Synthetic input proves persistence, never human drawing accuracy or enjoyment.
const origin = 'http://127.0.0.1:4180/';
await mkdir('artifacts/local', { recursive: true });
await mkdir('artifacts/release', { recursive: true });
const profile = await mkdtemp('artifacts/local/resume-profile-');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4180', '--strictPort'], { stdio: 'pipe' });
let logs = ''; server.stderr.on('data', d => logs += String(d));
const result = { scope: 'Synthetic Chromium persistence and graceful browser-process restart, not Android/crash/human acceptance', status: 'started', external: [], posts: 0, errors: [], checks: [] };
let context;
async function open(offline = false) {
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 }, locale: 'en-US', reducedMotion: 'reduce', serviceWorkers: 'allow' });
  context.on('request', request => {
    if (!request.url().startsWith(origin)) result.external.push(request.url());
    if (request.method() === 'POST') result.posts++;
  });
  await context.setOffline(offline);
  const page = context.pages()[0] ?? await context.newPage();
  page.on('pageerror', error => result.errors.push(String(error)));
  await page.goto(origin, { waitUntil: 'load' });
  await page.locator('.start-button').waitFor();
  return page;
}
async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('drawindow-session', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const read = db.transaction('sessions', 'readonly').objectStore('sessions').get('current');
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }));
}
async function waitSnapshot(page, test) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const value = await snapshot(page);
    if (value && test(value)) return value;
    await new Promise(r => setTimeout(r, 100));
  }
  throw Error('Saved checkpoint not reached');
}
async function replace(page, value) {
  await page.evaluate(value => new Promise((resolve, reject) => {
    const req = indexedDB.open('drawindow-session', 1);
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').put(value, 'current'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    req.onerror = () => reject(req.error);
  }), value);
}
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (server.exitCode !== null) throw Error(logs);
    await new Promise(r => setTimeout(r, 100));
  }
  let page = await open();
  await page.locator('.offline-status[data-status="ready"]').waitFor();
  await page.getByRole('button', { name: /NIGHT/, exact: true }).click();
  await page.locator('.start-button').click();
  await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
  const canvas = page.getByTestId('window-drawing-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .7, { steps: 10 });
  await page.mouse.up();
  await waitSnapshot(page, s => s.state.phase === 'player_drawing' && s.state.activeStrokes.length === 1);
  await page.getByRole('button', { name: 'CLEAR', exact: true }).click();
  const cleared = await waitSnapshot(page, s => !s.state.activeStrokes.length && s.state.drawingHistory.past.length > 0);
  // Graceful close ends this Chromium browser process; reuse its actual disk profile offline.
  await context.close(); context = undefined;
  page = await open(true);
  await page.locator('.resume-button').click();
  assert.equal(await page.locator('main').getAttribute('data-phase'), 'player_drawing');
  assert.equal(await page.locator('main').getAttribute('data-mode'), 'night');
  assert.equal(await page.locator('main').getAttribute('data-language'), 'en');
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await waitSnapshot(page, s => s.state.activeStrokes.length === 1);
  await page.getByRole('button', { name: 'Redo last edit' }).click();
  await waitSnapshot(page, s => s.state.activeStrokes.length === 0);
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  const ink = await waitSnapshot(page, s => s.state.activeStrokes.length === 1);
  await page.screenshot({ path: 'artifacts/release/offline-resume-mobile.png', fullPage: true });
  result.checks.push('browser process restart offline: night/en, active drawing, CLEAR undo/redo');

  // Install an explicitly synthetic interrupted checkpoint; no model response is fabricated.
  const pending = structuredClone(ink);
  pending.state.phase = 'recognizing'; pending.requestAttempt = 1;
  pending.state.entries.push({ id: `${pending.state.sessionId}:player:1`, actor: 'player', round: 1, strokes: ink.state.activeStrokes, intendedWord: null, recognition: null, comparable: false });
  await replace(page, pending);
  await page.reload();
  await page.locator('.resume-button').click();
  assert.equal(await page.locator('main').getAttribute('data-phase'), 'recognition_error');
  await page.getByRole('button', { name: 'ADD OR CHANGE LINES', exact: true }).click();
  assert.equal(await page.locator('main').getAttribute('data-phase'), 'player_drawing');
  result.checks.push('interrupted inference waits for explicit retry/back; drawing retained');

  // Valid production catalogue entries, synthetic completion; tests raw draft storage only.
  const review = structuredClone(ink);
  review.state.phase = 'review_intents'; review.state.round = 5;
  const girl = review.state.entries[0];
  review.state.entries = Array.from({ length: 10 }, (_, i) => i % 2 ? { id: `fixture:player:${i}`, actor: 'player', round: Math.floor(i / 2) + 1, strokes: ink.state.activeStrokes, intendedWord: null, recognition: i < 9 ? { guess: 'cat', source: 'ml' } : null, comparable: false } : { ...girl, id: `fixture:girl:${i}`, round: Math.floor(i / 2) + 1 });
  review.intentDrafts = {};
  await replace(page, review); await page.reload(); await page.locator('.resume-button').click();
  await page.getByRole('textbox').first().fill(' Ice cream  ');
  await waitSnapshot(page, s => Object.values(s.intentDrafts).includes(' Ice cream  '));
  await page.reload(); await page.locator('.resume-button').click();
  assert.equal(await page.getByRole('textbox').first().inputValue(), ' Ice cream  ');
  assert.equal(await page.getByRole('textbox').count(), 5);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'artifacts/release/offline-resume-naming-desktop.png', fullPage: true });
  result.checks.push('raw naming draft, all five inputs, full 10-picture record survive offline reload');

  const corrupt = structuredClone(review); corrupt.version = 99;
  await replace(page, corrupt); await page.reload();
  await page.getByText(/saved game could not be read/).waitFor();
  assert.equal(await page.locator('.resume-button').count(), 0);
  result.checks.push('unknown schema rejected safely at title');
  assert.equal(result.posts, 0); assert.deepEqual(result.external, []); assert.deepEqual(result.errors, []);
  result.status = 'success';
} catch (error) { result.status = 'failure'; result.error = String(error); throw error; }
finally {
  if (context) await context.close();
  server.kill();
  await writeFile('artifacts/release/offline-session-resume.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
