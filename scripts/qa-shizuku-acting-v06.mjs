import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? { executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE } : {}) });
const base = process.env.DRAWINDOW_QA_URL ?? 'http://localhost:5186/';
const fixtureBase = process.env.DRAWINDOW_FIXTURE_QA_URL;
const folder = 'artifacts/qa/shizuku-acting-v06';
await mkdir(folder, { recursive: true });
const report = { scope: 'Automated browser interaction, synthetic drawings, disclosed DEMO and optionally intercepted HTTP fixtures. Not live recognition, physical-device or human playtest evidence.', journeys: [], previews: [], errors: [] };
const assert = (v, m) => { if (!v) throw Error(m); };
const scene = page => page.locator('[data-testid=character-scene]').first();
const pose = async (page, id) => page.waitForFunction(id => document.querySelector('[data-testid=character-scene]')?.getAttribute('data-pose') === id, id);
async function ready(page) { await page.getByRole('button', { name: 'YOUR TURN', exact: true }).waitFor(); }
async function draw(page) {
  const canvas = page.getByTestId('window-drawing-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  assert(box?.width > 0, 'Missing canvas');
  const x = box.x + box.width * .3, y = box.y + box.height * .55;
  assert(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid') === 'window-drawing-canvas', { x, y }), 'Portrait intercepts drawing');
  await page.mouse.move(x, y); await page.mouse.down();
  await pose(page, 'curious'); // First point, before pointerup.
  await page.mouse.move(x + box.width * .35, y - box.height * .2, { steps: 12 });
  await page.mouse.up();
}
async function monitor(context) {
  await context.addInitScript(() => {
    window.qaTrace = []; window.qaGestures = [];
    const animate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (this.classList.contains('character-scene__gesture')) window.qaGestures.push({ frames, options, animation });
      return animation;
    };
    new MutationObserver(() => {
      const main = document.querySelector('main'), scene = document.querySelector('[data-testid=character-scene]');
      const entry = { phase: main?.dataset.phase, pose: scene?.dataset.pose };
      if (entry.phase && entry.pose && JSON.stringify(entry) !== JSON.stringify(window.qaTrace.at(-1))) window.qaTrace.push(entry);
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase', 'data-pose'] });
  });
}
async function visibility(page) {
  // Synthetic visibility event against real browser Animation objects.
  await page.evaluate(() => {
    const animation = window.qaGestures.at(-1).animation;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.qaGestures.at(-1).animation.playState === 'paused');
  const before = await page.evaluate(() => ({ count: window.qaGestures.length, time: window.qaGestures.at(-1).animation.currentTime }));
  await page.waitForTimeout(80);
  const paused = await page.evaluate(() => ({ state: window.qaGestures.at(-1).animation.playState, time: window.qaGestures.at(-1).animation.currentTime, running: document.querySelector('[data-testid=character-scene]').dataset.running, breathing: getComputedStyle(document.querySelector('.character-scene__breathing')).animationPlayState }));
  assert(paused.state === 'paused' && paused.running === 'false' && paused.breathing === 'paused', 'Hidden animation not paused');
  assert(Math.abs(paused.time - before.time) < 25, 'Hidden gesture clock advanced');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(700);
  const finishedTime = await page.evaluate(() => window.qaGestures.at(-1).animation.currentTime);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(40);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  const resumed = await page.evaluate(() => ({ count: window.qaGestures.length, time: window.qaGestures.at(-1).animation.currentTime, state: window.qaGestures.at(-1).animation.playState }));
  assert(resumed.count === before.count && resumed.state === 'finished' && resumed.time === finishedTime, 'Finished gesture replayed');
  return { syntheticVisibility: true, paused, resumed };
}
try {
  for (const [width, height] of [[360, 800], [720, 1280], [1280, 800]]) for (const mode of ['day', 'night']) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', hasTouch: width < 1000 });
    await monitor(context);
    const page = await context.newPage(), errors = [], rejected = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { if (/\/art\/shizuku-(v04|expression-review)/.test(r.url())) rejected.push(r.url()); });
    await page.goto(`${base}?character-preview`);
    await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
    const poses = ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing'];
    for (const id of poses) {
      await page.getByRole('button', { name: new RegExp(`^${id.toUpperCase()} ·`) }).click();
      await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      const sprites = await page.locator('.character-scene__sprite').evaluateAll(images => images.map(i => ({ src: i.getAttribute('src'), width: i.naturalWidth, height: i.naturalHeight })));
      assert(sprites.length === 7 && sprites.every(i => /\/art\/shizuku\//.test(i.src) && i.width === 384 && i.height === 512), 'Default preview mixed A and B');
      const eyeOffset = await page.locator('.character-scene__sprite[data-active=true]').evaluate(i => {
        const rect = i.getBoundingClientRect(), target = i.closest('.character-scene__portrait').getBoundingClientRect();
        return [rect.left + rect.width * parseFloat(i.style.getPropertyValue('--pose-eye-x')) / 100 - target.left - target.width * .5, rect.top + rect.height * parseFloat(i.style.getPropertyValue('--pose-eye-y')) / 100 - target.top - target.height * .392];
      });
      assert(eyeOffset.every(n => Math.abs(n) < .1), 'Registered eye target shifted');
      await page.locator('.character-preview__window').screenshot({ path: `${folder}/${width}-${mode}-pose-${id}.png` });
    }
    report.previews.push({ viewport: [width, height], mode, poses });
    await page.goto(base);
    await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
    await pose(page, 'neutral');
    await page.getByRole('button', { name: 'PLAY DEMO', exact: true }).click();
    let hiddenCheck;
    for (let round = 1; round <= 5; round++) {
      if (round === 1) {
        await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'girl_drawing' && document.querySelector('[data-testid=character-scene]')?.dataset.pose === 'thinking');
        await page.screenshot({ path: `${folder}/${width}-${mode}-hesitation.png` });
        await pose(page, 'drawing');
        await page.waitForTimeout(90);
        await page.screenshot({ path: `${folder}/${width}-${mode}-drawing-crossfade.png` });
        await page.waitForTimeout(150);
        await page.screenshot({ path: `${folder}/${width}-${mode}-drawing.png` });
      }
      await ready(page);
      await pose(page, round % 2 === 0 ? 'smile' : 'neutral');
      await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
      await pose(page, 'neutral');
      await draw(page);
      if (round === 1) {
        if (width === 360) hiddenCheck = await visibility(page);
        const count = await page.evaluate(() => window.qaGestures.length);
        await draw(page); // A second stroke must not restart the watch beat.
        assert(await page.evaluate(() => window.qaGestures.length) === count, 'Every stroke restarts approach');
        await page.getByRole('button', { name: 'Undo last edit' }).click();
        await pose(page, 'curious');
        await page.getByRole('button', { name: 'Undo last edit' }).click();
        await pose(page, 'neutral');
        await draw(page);
        await page.getByRole('button', { name: 'CLEAR', exact: true }).click();
        await pose(page, 'neutral');
        assert(await page.getByRole('button', { name: 'DONE', exact: true }).isDisabled(), 'Empty drawing finish enabled');
        await draw(page);
        const beforeInfo = await page.evaluate(() => window.qaGestures.length);
        await page.getByRole('button', { name: 'How to play and credits' }).click();
        await page.getByRole('button', { name: 'Close dialog' }).click();
        assert(await page.evaluate(() => window.qaGestures.length) === beforeInfo, 'Info modal triggered acting');
        await page.screenshot({ path: `${folder}/${width}-${mode}-first-mark.png` });
      }
      await page.getByRole('button', { name: 'DONE', exact: true }).click();
    }
    await page.getByRole('heading', { name: 'What did you mean?' }).waitFor();
    await pose(page, 'neutral');
    assert(await page.getByRole('textbox').count() === 5, 'Lost drawing review state');
    for (const [i, word] of ['tree', 'egg', 'goat', 'rain', 'nest'].entries()) await page.getByRole('textbox').nth(i).fill(word);
    await page.getByRole('button', { name: 'REVEAL OUR CHAIN', exact: true }).click();
    await pose(page, mode === 'day' ? 'smile' : 'shy');
    assert(await page.locator('.result-drawing').count() === 10 && await page.locator('.chain-link').count() === 9, 'Five-exchange chain changed');
    await page.screenshot({ path: `${folder}/${width}-${mode}-results.png` });
    const trace = await page.evaluate(() => window.qaTrace);
    assert(trace.filter(e => e.phase === 'girl_breath').length === 5, 'Wrong number of exchanges');
    assert(!rejected.length && !errors.length, `B assets or errors: ${JSON.stringify({ rejected, errors })}`);
    assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Horizontal overflow');
    report.journeys.push({ viewport: [width, height], mode, fiveExchanges: true, trace, hiddenCheck, rejectedRequests: rejected, errors });
    console.log(JSON.stringify({ passed: [width, mode], exchanges: 5 }));
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.goto(base);
  await page.getByRole('button', { name: 'PLAY DEMO', exact: true }).click(); await ready(page);
  await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click(); await draw(page);
  assert(await scene(page).getAttribute('data-running') === 'false', 'Reduced motion enabled acting');
  const reduced = await scene(page).evaluate(e => ({ animations: e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length, fade: getComputedStyle(e.querySelector('.character-scene__sprite')).transitionDuration }));
  assert(reduced.animations === 0 && reduced.fade === '0s', 'Reduced motion did not stop motion');
  report.reducedMotion = reduced; await context.close();

  if (fixtureBase) for (const mode of ['day', 'night']) {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'no-preference' });
    const page = await context.newPage(); let requests = 0;
    await page.route('**/api/recognize', async route => {
      requests++;
      await new Promise(resolve => setTimeout(resolve, 650));
      await route.fulfill({ status: requests === 1 ? 502 : 200, contentType: 'application/json', body: JSON.stringify(requests === 1 ? { error: 'fixture error', source: 'api' } : { guess: 'cat', source: 'api' }) });
    });
    await page.goto(fixtureBase); await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
    await page.getByRole('button', { name: /Use live API/ }).click(); await page.getByRole('button', { name: 'START GAME', exact: true }).click();
    await ready(page); await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click(); await draw(page);
    const ink = await page.getByTestId('window-drawing-canvas').evaluate(c => c.toDataURL());
    await page.getByRole('button', { name: 'DONE', exact: true }).click(); await pose(page, 'thinking');
    await page.screenshot({ path: `${folder}/360-${mode}-recognizing-fixture.png` });
    await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'recognition_error');
    await pose(page, 'neutral');
    await page.waitForTimeout(220);
    assert(await page.getByTestId('window-drawing-canvas').evaluate(c => c.toDataURL()) === ink, 'Error changed retained ink');
    await page.screenshot({ path: `${folder}/360-${mode}-error-fixture.png` });
    await page.getByRole('button', { name: 'ADD OR CHANGE LINES', exact: true }).click(); await pose(page, 'curious');
    assert(await page.getByRole('button', { name: 'DONE', exact: true }).isEnabled(), 'Error/back lost drawing');
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'girl_breath');
    assert(requests === 2, 'Unexpected recognition retry');
    report.errors.push({ mode, source: 'intercepted HTTP fixture, zero provider calls', requests, inkPreserved: true, recoveredToRound2: true });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${folder}/browser-checks.json`, JSON.stringify(report, null, 2) + '\n');
}
const label = (text, width) => Buffer.from(`<svg width="${width}" height="24"><rect width="100%" height="100%" fill="#eaf0ed"/><text x="6" y="17" font-size="12" fill="#294e53">${text}</text></svg>`);
for (const width of [360, 720, 1280]) {
  const parts = [];
  for (const [row, mode] of ['day', 'night'].entries()) for (const [col, id] of ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing'].entries()) {
    parts.push({ input: await sharp(`${folder}/${width}-${mode}-pose-${id}.png`).resize(180, 240, { fit: 'contain', background: '#eaf0ed' }).png().toBuffer(), left: col * 180, top: row * 264 + 24 }, { input: label(`${mode} / ${id}`, 180), left: col * 180, top: row * 264 });
  }
  await sharp({ create: { width: 1260, height: 528, channels: 3, background: '#eaf0ed' } }).composite(parts).png().toFile(`${folder}/${width}-A-seven-day-night.png`);
}
console.log(JSON.stringify({ completedJourneys: report.journeys.length, sevenPosePreviews: report.previews.length, errorFixtures: report.errors.length, reducedMotion: report.reducedMotion }));
