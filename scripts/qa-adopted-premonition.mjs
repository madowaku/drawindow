import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { observeLiveDrawing } from './premonition-drawing-proof.mjs';
import { productionServer, watchContext, snapshot, waitSnapshot, drawCircle } from './production-browser-helpers.mjs';
import { glassProof, settle, fogImage } from './production-glass-proof.mjs';

// Extend the existing production matrix instead of adding another demo journey.
const folder = 'output/playwright/v012/journeys';
await mkdir(folder, { recursive: true });
await mkdir('artifacts/local', { recursive: true });
const result = { status: 'started', scope: 'Compiled C + cosmetic D, synthetic strokes and actual on-device ML; graceful Chromium restart, not physical-device or human acceptance', plays: [], external: [], posts: 0, errors: [] };
let server, context, last;
const entryContent = entries => entries.map(({ actor, round, strokes, recognition, templateId }) => ({ actor, round, strokes, recognition, templateId }));

async function open(profile, viewport, offline = false) {
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport, reducedMotion: 'no-preference', serviceWorkers: 'allow' });
  watchContext(context, server.origin, result);
  await context.setOffline(offline);
  const page = context.pages()[0] ?? await context.newPage(); last = page;
  page.on('dialog', dialog => dialog.accept());
  await page.goto(server.origin + '?window-time-premonition');
  await page.locator('.start-button').waitFor();
  await page.locator('.offline-status[data-status=ready]').waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole('region', { name: '匿名の比較設定' }).count(), 0);
  assert.equal(await page.evaluate(() => navigator.onLine), !offline);
  return page;
}
async function observePoses(page) {
  await page.evaluate(() => {
    window.__poses = [];
    const note = () => {
      const app = document.querySelector('.app'), scene = app?.querySelector('.play-layout .character-scene');
      if (scene) window.__poses.push({ at: performance.now(), phase: app.dataset.phase, pose: scene.dataset.pose });
    };
    new MutationObserver(note).observe(document.querySelector('.app'), { subtree: true, attributes: true, attributeFilter: ['data-pose', 'data-phase'] });
  });
}
const poses = page => page.evaluate(() => window.__poses.filter(p => p.phase === 'girl_breath' && ['smile', 'curious', 'thinking'].includes(p.pose)));

try {
  server = await productionServer(4243); result.fingerprint = server.receipt.fingerprint;
  for (const language of (process.env.ADOPTED_ONE ? ['en'] : ['en', 'ja'])) for (const mode of (process.env.ADOPTED_ONE ? ['day'] : ['day', 'night'])) {
    console.log('production', language, mode);
    const prefix = `${folder}/${language}-${mode}`, profile = await mkdtemp('artifacts/local/adopted-profile-');
    const viewport = { width: language === 'en' ? 1440 : 390, height: 900 };
    let page = await open(profile, viewport);
    const t = (en, ja) => language === 'ja' ? ja : en;
    await page.getByRole('button', { name: t('English', '日本語'), exact: true }).click();
    await page.getByRole('button', { name: t(mode.toUpperCase(), mode === 'day' ? '昼' : '夜'), exact: true }).click();
    const titleScene = page.locator('.title-art .character-scene'); await titleScene.scrollIntoViewIfNeeded();
    const title = await titleScene.evaluate(async scene => {
      await Promise.all([...scene.querySelectorAll('img')].map(image => image.decode()));
      const body = scene.querySelector('.character-scene__breathing'), active = scene.querySelector('.character-scene__sprite[data-active=true]'), animation = body.getAnimations()[0];
      if (!animation) throw Error('Missing quiet title breath');
      animation.pause(); const samples = [];
      for (const time of [0, 1000, 4000, 7250, 7350, 7400, 7500, 8500]) {
        animation.currentTime = time;
        samples.push({ time, transform: getComputedStyle(body).transform, source: active.src, visible: [...scene.querySelectorAll('.character-scene__sprite')].filter(image => getComputedStyle(image).opacity === '1').length });
      }
      animation.play();
      return { name: getComputedStyle(body).animationName, duration: getComputedStyle(body).animationDuration, blink: scene.querySelectorAll('.character-scene__blink').length, mist: getComputedStyle(scene, '::after').backgroundColor, sprites: [...scene.querySelectorAll('.character-scene__sprite')].map(image => image.getAttribute('src')), samples };
    });
    assert.equal(title.name, 'character-wait'); assert.equal(title.duration, mode === 'day' ? '9s' : '11s'); assert.equal(title.blink, 0);
    assert(title.samples.every(sample => sample.source === title.samples[0].source && sample.visible === 1));
    assert.equal(title.sprites.length, 7);
    assert(title.sprites.every(src => src.includes(`/art/${mode === 'night' ? 'shizuku-night' : 'shizuku'}/`)));
    if (mode === 'night') assert.equal(title.mist, 'rgba(156, 181, 211, 0.22)');
    await page.screenshot({ path: `${prefix}-title.png`, fullPage: true });
    await observePoses(page); await page.locator('.start-button').click();
    const drawings = [], reactions = []; let glass, recovery;
    for (let round = 1; round <= 5; round++) {
      console.log('round', round);
      assert.equal(await page.locator('.tempo-canvas-host').getAttribute('data-tempo'), 'C');
      const started = Date.now(); drawings.push(await observeLiveDrawing(page, true));
      assert(Date.now() - started > 2000, 'Production reverted to fast A playback');
      await page.getByRole('button', { name: t('YOUR TURN', 'あなたの番'), exact: true }).click();
      assert.equal(await page.getByTestId('window-drawing-hint').count(), 0);
      assert((await page.getByTestId('window-drawing-canvas').evaluate(element => getComputedStyle(element).cursor)).includes('8 4'));
      if (round === 1) glass = await glassProof(page, language, mode, prefix);
      await drawCircle(page);
      if (round === 2) {
        const drawn = await waitSnapshot(page, s => s.state.round === 2 && s.state.activeStrokes[0]?.points.length >= 49);
        await settle(page); const beforeFog = await fogImage(page);
        await page.locator('.clear-tool').click();
        const cleared = await waitSnapshot(page, s => s.state.round === 2 && !s.state.activeStrokes.length && s.state.drawingHistory.past.length > 0);
        reactions.push(...await poses(page));
        // Disconnect BEFORE ending the process, then reuse its actual disk profile.
        await context.setOffline(true); await context.close(); context = undefined;
        page = await open(profile, viewport, true); await page.locator('.resume-button').click(); await observePoses(page);
        assert.equal(await page.locator('.app').getAttribute('data-phase'), 'player_drawing');
        assert.equal(await page.locator('.app').getAttribute('data-mode'), mode);
        assert.equal(await page.locator('.app').getAttribute('data-language'), language);
        const resumed = await waitSnapshot(page, s => s.state.phase === 'player_drawing');
        assert.deepEqual(resumed.state.drawingHistory, cleared.state.drawingHistory);
        assert.deepEqual(entryContent(resumed.state.entries), entryContent(drawn.state.entries));
        await page.getByRole('button', { name: t('Undo last edit', '元に戻す'), exact: true }).click();
        const restored = await waitSnapshot(page, s => s.state.activeStrokes.length === 1);
        assert.deepEqual(restored.state.activeStrokes, drawn.state.activeStrokes);
        await page.getByTestId('window-drawing-canvas').scrollIntoViewIfNeeded(); await settle(page);
        assert.equal(await fogImage(page), beforeFog, 'Restart must retain the same cleared glass');
        await page.screenshot({ path: `${prefix}-offline-resumed.png`, fullPage: true });
        recovery = { offlineBeforeClose: true, newBrowserProcess: true, drawingExact: true, historyExact: true, fogExact: true };
      }
      await page.getByRole('button', { name: t('DONE', 'できた'), exact: true }).click();
    }
    await page.locator('.review-list').waitFor({ timeout: 60000 });
    reactions.push(...await poses(page)); assert(reactions.length > 0, 'Production never showed D reaction');
    const values = Array.from({ length: 5 }, (_, i) => i === 0 ? t(' circle  ', ' まる  ') : t('circle', 'まる'));
    for (const [i, input] of (await page.locator('.review-field input').all()).entries()) await input.fill(values[i]);
    await waitSnapshot(page, s => Object.values(s.intentDrafts).length === 5 && Object.values(s.intentDrafts).includes(values[0]));
    await page.reload(); await page.locator('.resume-button').click();
    assert.deepEqual(await page.locator('.review-field input').evaluateAll(inputs => inputs.map(input => input.value)), values);
    await page.screenshot({ path: `${prefix}-naming-restored.png`, fullPage: true });
    await page.getByRole('button', { name: t('REVEAL OUR CHAIN', '答えあわせ'), exact: true }).click();
    // Restored sessions deliberately skip the diary/reveal introduction.
    assert.equal(await page.locator('.ending').getAttribute('data-act'), 'reveal');
    assert.equal(await page.locator('.ending-diary>li').count(), 10); assert.equal(await page.locator('.chain-link').count(), 9);
    assert.equal(await page.locator('.ending').getAttribute('data-study-tempo'), 'true');
    assert((await page.locator('.ending').getAttribute('style')).includes('6000ms'));
    const saved = await waitSnapshot(page, s => s.state.phase === 'results');
    const recognitions = saved.state.entries.filter(e => e.actor === 'player' && e.recognition);
    assert.equal(recognitions.length, 4); assert(recognitions.every(e => e.recognition.source === 'ml' && !e.recognition.errorCode));
    assert.equal(saved.state.sessionKind, 'ml');
    await page.screenshot({ path: `${prefix}-diary-links.png`, fullPage: true });
    await page.getByRole('button', { name: t('A little goodbye', '窓の向こうへ、またね'), exact: true }).click();
    assert.equal(await page.locator('.ending-refog').evaluate(element => getComputedStyle(element).animationDuration), '6s');
    await page.getByRole('button', { name: t('Look at our drawings again', 'もう一度、10枚を眺める'), exact: true }).click();
    assert.equal(await page.locator('.ending-diary>li').count(), 10);
    await page.getByRole('button', { name: t('SAVE TODAY’S WINDOW', '今日の窓を残す'), exact: true }).click();
    await page.locator('.souvenir>img').waitFor(); await page.locator('.souvenir>img').evaluate(image => image.decode());
    assert.deepEqual(await page.locator('.souvenir>img').evaluate(image => [image.naturalWidth, image.naturalHeight]), [1200, 3000]);
    const downloadPromise = page.waitForEvent('download'); await page.locator('.souvenir a[download]').click();
    const download = await downloadPromise; await download.saveAs(`${prefix}-souvenir.png`);
    const png = await readFile(`${prefix}-souvenir.png`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 3000]);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    result.plays.push({ language, mode, viewport, title, drawings, recognitions: recognitions.map(e => e.recognition), pictures: 10, links: 9, poses: reactions, glass, recovery, namingRestored: true, restoredIntroSkipped: true, souvenir: [1200, 3000], downloadedBytes: png.length });
    await context.close(); context = undefined;
  }
  assert.deepEqual(result.external, []); assert.deepEqual(result.errors, []); assert.equal(result.posts, 0); result.status = 'success';
} catch (error) {
  result.status = 'failure'; result.error = String(error);
  if (last && !last.isClosed()) {
    try { result.failureText = await last.locator('body').innerText(); result.failedSnapshot = await snapshot(last); await last.screenshot({ path: `${folder}/failure.png`, fullPage: true }); }
    catch (diagnosticError) { result.diagnosticError = String(diagnosticError); }
  }
  throw error;
} finally {
  await context?.close(); server?.close();
  await writeFile(`${folder}/report.json`, JSON.stringify(result, null, 2));
  await writeFile('artifacts/release/offline-adopted-D-C-browser.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, error: result.error, plays: result.plays.length }));
}
