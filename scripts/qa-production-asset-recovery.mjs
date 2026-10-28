import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { productionServer, watchContext, drawCircle, waitSnapshot } from './production-browser-helpers.mjs';

const folder = 'output/playwright/v012/asset-recovery';
await mkdir(folder, { recursive: true });
const result = { status: 'started', scope: 'Real Chromium asset failures and real local inference retry; synthetic pointer input, not human acceptance', checks: [], failures: [], external: [], posts: 0, errors: [] };
let server, browser, context, page;
async function check(name, run) {
  try { await run(); result.checks.push(name); }
  catch (error) {
    result.failures.push({ name, error: String(error) });
    if (page && !page.isClosed()) await page.screenshot({ path: `${folder}/${name}-failure.png`, fullPage: true });
  } finally { await context?.close(); context = undefined; }
}
async function open(mode) {
  context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  watchContext(context, server.origin, result);
  await context.addInitScript(mode => {
    if (location.protocol !== 'http:') return;
    localStorage.setItem('drawindow-language', 'en');
    localStorage.setItem('drawindow-mode', mode);
  }, mode);
  page = await context.newPage();
}
async function modeRoundTrip(mode) {
  await page.getByRole('button', { name: mode === 'night' ? 'DAY' : 'NIGHT', exact: true }).click();
  await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
}
try {
  server = await productionServer(4244);
  result.fingerprint = server.receipt.fingerprint;
  browser = await chromium.launch({ headless: true });
  for (const mode of ['day', 'night']) {
    await check(`${mode}-room-recovery`, async () => {
      await open(mode);
      const path = `**/art/shizuku/room-${mode}.webp`;
      let blocked = 0;
      await context.route(path, route => { blocked++; return route.abort(); });
      await page.goto(server.origin);
      const room = page.locator('.title-art .character-scene__room');
      await room.evaluate(image => new Promise(resolve => { if (image.hidden) resolve(); else image.addEventListener('error', () => setTimeout(resolve), { once: true }); }));
      assert(blocked > 0);
      assert(await room.evaluate(image => image.hidden));
      await page.screenshot({ path: `${folder}/${mode}-room-failed.png`, fullPage: true });
      await context.unroute(path);
      await modeRoundTrip(mode);
      await room.evaluate(image => image.decode());
      assert.equal(await room.evaluate(image => image.hidden), false, 'Recovered room retains hidden=true after mode change');
      assert(await room.isVisible());
      await page.screenshot({ path: `${folder}/${mode}-room-recovered.png`, fullPage: true });
    });
    await check(`${mode}-failed-neutral-hidden`, async () => {
      await open(mode);
      const path = `**/art/${mode === 'night' ? 'shizuku-night' : 'shizuku'}/neutral.webp`;
      await context.route(path, route => route.abort());
      await page.goto(server.origin);
      const active = page.locator('.title-art .character-scene__sprite[data-active=true]');
      await page.waitForFunction(() => document.querySelector('.title-art .character-scene__sprite[data-active=true]')?.hidden);
      assert.equal(await active.evaluate(image => getComputedStyle(image).display), 'none', 'Failed sprite overrides the HTML hidden attribute');
      await context.unroute(path);
      await modeRoundTrip(mode);
      await active.evaluate(image => image.decode());
      assert.equal(await active.evaluate(image => image.hidden), false);
      assert(await active.isVisible());
    });
    await check(`${mode}-pose-fallback`, async () => {
      await open(mode);
      await context.route(`**/art/${mode === 'night' ? 'shizuku-night' : 'shizuku'}/curious.webp`, route => route.abort());
      await page.goto(server.origin);
      await page.locator('.start-button').click();
      await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
      await drawCircle(page);
      const active = page.locator('.play-layout .character-scene__sprite[data-active=true]');
      await active.evaluate(image => image.decode());
      assert((await active.getAttribute('src')).includes(`/art/${mode === 'night' ? 'shizuku-night' : 'shizuku'}/neutral.webp`));
      assert.equal(await active.getAttribute('data-fallback-applied'), 'true');
      assert(await active.isVisible());
      await page.screenshot({ path: `${folder}/${mode}-neutral-fallback.png`, fullPage: true });
    });
  }
  // Existing unit coverage stubs LiteRT. Here the UI retry loads actual model bytes.
  for (const asset of ['quickdraw_model_static.tflite', 'labels.txt']) {
    await check(`retry-${asset.replaceAll('.', '-')}`, async () => {
      await open('night');
      const path = `**/local-ml/${asset}`;
      let failures = 0;
      await context.route(path, route => { failures++; return route.fulfill({ status: 503, body: 'Deliberate local QA failure' }); });
      await page.goto(server.origin);
      await page.locator('.start-button').click();
      await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
      await drawCircle(page);
      const before = await waitSnapshot(page, saved => saved.state.activeStrokes[0]?.points.length >= 49);
      await page.getByRole('button', { name: 'DONE', exact: true }).click();
      await page.locator('.error-actions').waitFor({ timeout: 60000 });
      assert(failures > 0);
      await page.screenshot({ path: `${folder}/${asset}-unavailable.png`, fullPage: true });
      await context.unroute(path);
      await page.getByRole('button', { name: 'TRY AGAIN', exact: true }).click();
      const after = await waitSnapshot(page, saved => saved.state.entries.some(entry => entry.actor === 'player' && entry.recognition?.source === 'ml' && !entry.recognition.errorCode));
      const player = after.state.entries.find(entry => entry.actor === 'player');
      assert.deepEqual(player.strokes, before.state.activeStrokes, 'Retry changed the drawing');
      assert.equal(after.state.sessionKind, 'ml');
      assert.equal(after.state.entries.filter(entry => entry.actor === 'player').length, 1);
      await page.getByRole('button', { name: 'YOUR TURN', exact: true }).waitFor();
      await page.screenshot({ path: `${folder}/${asset}-recovered.png`, fullPage: true });
    });
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.external, []);
  assert.equal(result.posts, 0);
  assert.deepEqual(result.failures, []);
  result.status = 'success';
} catch (error) { result.status = 'failure'; result.error = String(error); throw error; }
finally {
  await context?.close();
  await browser?.close();
  server?.close();
  await writeFile(`${folder}/report.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
