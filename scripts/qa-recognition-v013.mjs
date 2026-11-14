import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const origin = 'http://127.0.0.1:4253/';
const server = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', '4253', '--strictPort'], { stdio: 'pipe' });
const receipt = { scope: 'Synthetic UI/inference/regression evidence only; no human recognition accuracy or enjoyment results.', status: 'started', external: [], posts: 0, errors: [], freehand: null, journeys: [] };
const delay = ms => new Promise(r => setTimeout(r, ms));
let browser;
function watch(page) {
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => receipt.errors.push(String(e)));
  page.on('request', r => { if (!r.url().startsWith(origin) && !/^(blob:|data:)/.test(r.url())) receipt.external.push(r.url()); if (r.method() === 'POST') receipt.posts++; });
}
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow'); }
async function draw(page, circle = false) {
  const canvas = page.getByTestId('window-drawing-canvas').filter({ visible: true });
  await canvas.scrollIntoViewIfNeeded(); const b = await canvas.boundingBox();
  if (circle) {
    for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; await page.mouse.move(b.x + b.width * (.5 + .25 * Math.cos(a)), b.y + b.height * (.5 + .25 * Math.sin(a))); if (!i) await page.mouse.down(); }
    await page.mouse.up();
  } else { await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
}
async function exported(page, name) { const p = page.waitForEvent('download'); await page.getByRole('button', { name, exact: true }).click(); return JSON.parse(await readFile(await (await p).path(), 'utf8')); }
try {
  await mkdir('artifacts/release', { recursive: true });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await delay(100); }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' }); watch(page);
  await page.goto(origin + '?recognition-benchmark');
  await page.getByRole('button', { name: '自由描画・前処理比較', exact: true }).click();
  await page.getByRole('textbox', { name: '描くつもりの物', exact: true }).fill('synthetic circle · not human');
  await page.getByLabel('入力の出所').selectOption('synthetic');
  await draw(page, true);
  await page.getByRole('button', { name: '同じ絵を6条件で比較', exact: true }).click();
  await page.getByText('結果を残しました。各条件を人間が評価してください。', { exact: true }).waitFor({ timeout: 60000 });
  const data = await exported(page, '自由描画JSON');
  assert.equal(data.samples.length, 1); assert.equal(data.samples[0].variants.length, 6);
  assert.equal(data.samples[0].variants[0].top3[0].label, 'circle');
  assert.equal(data.samples[0].strokes, undefined); assert.equal(data.summary.development[0].drawings, 0);
  assert(data.samples[0].variants.every(v => v.judgement === null && v.top3MatchesIntent === null));
  await noOverflow(page);
  await page.screenshot({ path: 'artifacts/release/v013-freehand-mobile.png', fullPage: true });
  receipt.freehand = data;
  await page.getByRole('button', { name: '次の自由描画へ', exact: true }).click();
  await page.getByRole('textbox', { name: '描くつもりの物', exact: true }).fill('synthetic with explicit stroke export');
  await page.getByLabel(/比較時に筆跡を保持/).check(); await draw(page, true);
  await page.getByRole('button', { name: '同じ絵を6条件で比較', exact: true }).click();
  await page.getByText('結果を残しました。各条件を人間が評価してください。', { exact: true }).waitFor({ timeout: 60000 });
  const optIn = await exported(page, '自由描画JSON'); assert.equal(optIn.samples[0].strokes, undefined); assert(optIn.samples[1].strokes.length > 0);
  await page.getByLabel(/比較時に筆跡を保持/).uncheck();
  const revoked = await exported(page, '自由描画JSON'); assert(revoked.samples.every(s => s.strokes === undefined));
  await page.setViewportSize({ width: 1440, height: 900 }); await noOverflow(page); await page.screenshot({ path: 'artifacts/release/v013-freehand-desktop.png', fullPage: true });
  await page.close();
  for (const language of ['en', 'ja']) for (const mode of ['day', 'night']) {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    const p = await context.newPage(); watch(p); await p.goto(origin + '?recognition-recovery');
    await p.getByRole('button', { name: language === 'ja' ? '日本語' : 'English', exact: true }).click();
    await p.getByRole('button', { name: mode === 'night' ? language === 'ja' ? '夜' : 'NIGHT' : language === 'ja' ? '昼' : 'DAY', exact: true }).click();
    await p.getByRole('button', { name: language === 'ja' ? '音を出す' : 'Enable sound', exact: true }).click();
    await p.locator('.start-button').click();
    for (let round = 1; round <= 5; round++) {
      await p.getByRole('button', { name: language === 'ja' ? 'あなたの番' : 'YOUR TURN', exact: true }).click({ timeout: 20000 });
      await draw(p);
      const inkBefore = await p.getByTestId('window-drawing-canvas').evaluate(c => c.toDataURL());
      await p.getByRole('button', { name: language === 'ja' ? 'できた' : 'DONE', exact: true }).click();
      if (round === 5) break;
      await p.locator('.error-actions').waitFor();
      assert.equal(await p.getByRole('button', { name: language === 'ja' ? 'もう一度' : 'TRY AGAIN', exact: true }).count(), 0);
      assert.equal(await p.getByTestId('window-drawing-canvas').evaluate(c => c.toDataURL()), inkBefore);
      await noOverflow(p);
      if (round === 1) {
        await p.getByRole('button', { name: language === 'ja' ? '線を足す・描き直す' : 'ADD OR CHANGE LINES', exact: true }).click();
        await p.getByRole('button', { name: language === 'ja' ? 'できた' : 'DONE', exact: true }).click();
        await p.locator('.error-actions').waitFor();
        assert.equal(await p.getByTestId('window-drawing-canvas').evaluate(c => c.toDataURL()), inkBefore);
        await p.screenshot({ path: `artifacts/release/v013-recovery-${language}-${mode}.png`, fullPage: true });
      }
      await p.getByRole('button', { name: language === 'ja' ? 'わからないまま、次の一枚へ' : 'Keep this picture and start a new one', exact: true }).click();
      if (round === 2) {
        await delay(800); await p.reload();
        await p.getByRole('button', { name: language === 'ja' ? '続きから遊ぶ' : 'CONTINUE DRAWING', exact: true }).click();
      }
    }
    await p.getByRole('button', { name: language === 'ja' ? '答えあわせ' : 'REVEAL OUR CHAIN', exact: true }).click();
    const reveal = p.getByRole('button', { name: language === 'ja' ? '答え合わせをする' : 'See what we meant', exact: true });
    if (await reveal.count()) await reveal.click();
    assert.equal(await p.locator('.ending-diary > li').count(), 10); assert.equal(await p.locator('.chain-link').count(), 9); assert.equal(await p.locator('.achievement').count(), 0);
    assert.equal(await p.locator('.ending-entry-note').filter({ hasText: language === 'ja' ? 'わからないまま' : 'could not understand' }).count(), 4);
    const json = await exported(p, 'Export continuation JSON · 絵・筆跡なし');
    assert.equal(json.completed, true); assert.equal(json.recoveries, 4); assert.equal(json.score.perfect, false); assert.equal(json.redraws, 1);
    await p.getByRole('button', { name: language === 'ja' ? '今日の窓を残す' : 'SAVE TODAY’S WINDOW', exact: true }).click();
    const image = p.locator('.souvenir img'); await image.waitFor(); assert.equal(await image.getAttribute('width'), '1200');
    assert.equal(await image.getAttribute('height'), '3000');
    await p.getByRole('button', { name: language === 'ja' ? '窓の向こうへ、またね' : 'A little goodbye', exact: true }).click();
    await p.locator('.ending-goodbye').waitFor(); await noOverflow(p);
    receipt.journeys.push({ language, mode, images: 10, links: 9, recoveries: 4, restore: true, png: true, goodbye: true });
    await context.close();
  }
  assert.deepEqual(receipt.errors, []); assert.deepEqual(receipt.external, []); assert.equal(receipt.posts, 0);
  receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.error = String(error); throw error; }
finally { await browser?.close(); server.kill(); await writeFile('artifacts/release/v013-browser.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ ...receipt, freehand: receipt.freehand ? 'see local receipt' : null })); }
