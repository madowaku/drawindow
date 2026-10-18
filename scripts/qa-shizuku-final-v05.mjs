import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? { executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE } : {}) });
const folder = 'artifacts/qa/shizuku-final-v05';
const base = process.env.DRAWINDOW_QA_URL ?? 'http://localhost:5186/';
await mkdir(folder, { recursive: true });
const report = { scope: 'Chromium simulated viewports and shared game CharacterScene. No physical-device or independent human expression-recognition claim.', journeys: [] };
const assert = (v, m) => { if (!v) throw Error(m); };
try {
  for (const [width, height] of [[360, 800], [720, 1280]]) for (const mode of ['day', 'night']) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}?character-preview&expression-final`);
    await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
    const retained = await page.locator('[data-art-set=final] .character-scene__sprite').first().elementHandle();
    const samples = [];
    for (const pose of ['NEUTRAL', 'BREATH', 'THINKING', 'CURIOUS', 'SHY']) {
      await page.getByRole('button', { name: new RegExp(`^${pose} ·`) }).click();
      await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      assert(await retained.evaluate(e => e.isConnected), 'Pose change remounted sprite stack');
      const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, missing: [...document.images].filter(i => !i.naturalWidth || i.hidden).length, active: [...document.querySelectorAll('[data-art-set=final] .character-scene__sprite[data-active=true]')].map(i => ({ src: i.getAttribute('src'), width: i.naturalWidth, height: i.naturalHeight, transition: getComputedStyle(i).transitionDuration, scale: i.style.getPropertyValue('--pose-scale'), eyeX: i.style.getPropertyValue('--pose-eye-x'), eyeY: i.style.getPropertyValue('--pose-eye-y') })), blink: document.querySelector('[data-art-set=final]').getAttribute('data-blink-enabled') }));
      assert(!state.overflow && !state.missing, 'Layout or image failure');
      assert(await page.locator('.character-preview__window').last().evaluate(e => e.clientWidth >= 300), 'Comparison window too narrow to inspect expression');
      assert(state.active[0].width === 768 && state.active[0].height === 1024, 'Wrong dimensions');
      assert(state.active[0].transition === '0s' && state.blink === 'false', 'Reduced motion/blink failure');
      assert(state.active[0].src.includes(['THINKING', 'CURIOUS', 'SHY'].includes(pose) ? '/shizuku-expression-review/' : '/shizuku-v04/'), 'Wrong art source');
      samples.push({ pose, ...state });
      const stem = `${folder}/${width}-${mode}-${pose.toLowerCase()}`;
      await page.locator('.character-preview__window').last().screenshot({ path: `${stem}-glass.png` });
      await page.getByRole('button', { name: 'ガラス越し', exact: true }).click();
      await page.locator('.character-preview__window').last().screenshot({ path: `${stem}-clear.png` });
      await page.getByRole('button', { name: 'ガラス越し', exact: true }).click();
      if (['THINKING', 'CURIOUS', 'SHY'].includes(pose)) await page.screenshot({ path: `${stem}-current-vs-final.png`, fullPage: true });
    }
    assert(errors.length === 0, errors.join('; '));
    report.journeys.push({ viewport: [width, height], mode, samples, errors });
    // Restore motion and verify the same nodes crossfade, without the old blink layer.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'プレビューで動きを試す', exact: true }).click();
    await page.getByRole('button', { name: /^THINKING ·/ }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /^CURIOUS ·/ }).click();
    const fade = await page.locator('[data-art-set=final] .character-scene__sprite[data-active=true]').evaluate(i => getComputedStyle(i).transitionDuration);
    assert(fade === '0.18s', 'Missing crossfade');
    assert(await retained.evaluate(e => e.isConnected), 'Motion remounted sprite stack');
    await page.waitForTimeout(240);
    assert(await page.locator('[data-art-set=final] .character-scene__sprite[data-active=true]').evaluate(i => getComputedStyle(i).opacity) === '1', 'Crossfade did not settle');
    await context.close();
  }
  const page = await browser.newPage();
  const finalRequests = [];
  page.on('request', r => { if (r.url().includes('/shizuku-expression-review/')) finalRequests.push(r.url()); });
  await page.goto(base);
  await page.getByRole('button', { name: 'PLAY DEMO', exact: true }).click();
  await page.getByRole('button', { name: 'YOUR TURN', exact: true }).waitFor();
  assert(!finalRequests.length, 'Normal game loaded unapproved sprites');
  report.productionUnchanged = true;
} finally {
  await browser.close();
  await writeFile(`${folder}/browser-checks.json`, JSON.stringify(report, null, 2) + '\n');
}

const label = (text, width) => Buffer.from(`<svg width="${width}" height="24"><rect width="100%" height="100%" fill="#eaf0ed"/><text x="6" y="17" font-size="12" fill="#294e53">${text}</text></svg>`);
// Browser-rendered DAY/NIGHT game layers; one sheet per required viewport.
for (const width of [360, 720]) {
  const parts = [];
  for (const [row, mode] of ['day', 'night'].entries()) for (const [col, pose] of ['neutral', 'breath', 'thinking', 'curious', 'shy'].entries()) {
    parts.push({ input: await sharp(`${folder}/${width}-${mode}-${pose}-glass.png`).resize(240, 323, { fit: 'contain', background: '#eaf0ed' }).png().toBuffer(), left: col * 240, top: row * 347 + 24 }, { input: label(`${mode} / ${pose}`, 240), left: col * 240, top: row * 347 });
  }
  await sharp({ create: { width: 1200, height: 694, channels: 3, background: '#eaf0ed' } }).composite(parts).png().toFile(`${folder}/${width}-day-night.png`);
}
// Original v0.4 vs revised: raw sprite composites for identity and alpha inspection.
const root = 'assets/source/shizuku-expression-review';
const original = { thinking: `${root}/inputs/thinking-v04.png`, curious: `${root}/inputs/curious-v04.png`, shy: `${root}/shy.png` };
const parts = [];
for (const [row, color] of ['#eef1ed', '#172e46'].entries()) for (const [i, pose] of ['thinking', 'curious', 'shy'].entries()) for (const [side, filename] of [original[pose], `public/art/shizuku-expression-review/${pose}.webp`].entries()) {
  const col = i * 2 + side;
  const input = await sharp(filename).resize(240, 320).flatten({ background: color }).png().toBuffer();
  parts.push({ input, left: col * 240, top: row * 344 + 24 }, { input: label(`${pose} / ${side ? 'v0.5' : pose === 'shy' ? 'v0.1 reused' : 'v0.4'}`, 240), left: col * 240, top: row * 344 });
}
await sharp({ create: { width: 1440, height: 688, channels: 3, background: '#eaf0ed' } }).composite(parts).png().toFile(`${folder}/before-after.png`);
// 96px small-view check, plus a separate mouth-covered BREATH/THINKING comparison.
const small = [];
for (const [row, mode] of ['day', 'night'].entries()) for (const [col, pose] of ['breath', 'thinking', 'curious', 'shy'].entries()) {
  const tile = await sharp(`${folder}/360-${mode}-${pose}-clear.png`).resize(96, 129, { fit: 'fill' }).png().toBuffer();
  small.push({ input: tile, left: col * 96, top: row * 153 + 24 }, { input: label(pose, 96), left: col * 96, top: row * 153 });
}
await sharp({ create: { width: 384, height: 306, channels: 3, background: '#eaf0ed' } }).composite(small).png().toFile(`${folder}/96px-expressions.png`);
const masked = [];
for (const [row, mode] of ['day', 'night'].entries()) for (const [col, pose] of ['breath', 'thinking'].entries()) {
  const tile = await sharp(`${folder}/360-${mode}-${pose}-clear.png`).resize(96, 129, { fit: 'fill' }).png().toBuffer();
  const maskedTile = await sharp(tile).composite([{ input: Buffer.from('<svg width="96" height="129"><rect x="43" y="59" width="15" height="12" fill="#b7c9c7"/></svg>') }]).png().toBuffer();
  masked.push({ input: maskedTile, left: col * 96, top: row * 153 + 24 }, { input: label(pose, 96), left: col * 96, top: row * 153 });
}
await sharp({ create: { width: 192, height: 306, channels: 3, background: '#eaf0ed' } }).composite(masked).png().toFile(`${folder}/96px-mouth-covered.png`);
console.log(JSON.stringify({ journeys: report.journeys.length, samples: report.journeys.reduce((n, j) => n + j.samples.length, 0), productionUnchanged: report.productionUnchanged }));
