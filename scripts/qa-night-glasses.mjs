import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DRAWINDOW_QA_URL || 'http://127.0.0.1:5176/';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output = 'artifacts/qa/night-glasses';
await mkdir(output, { recursive: true });
const report = { scope: 'Automated Chromium, synthetic input. Not human or real-phone acceptance.', cases: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const settle = async page => {
  await page.locator('.character-scene img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.waitForTimeout(350);
};
const switchArt = async (page, glasses) => {
  await page.locator('.character-scene__sprite').evaluateAll((images, useGlasses) => {
    for (const image of images) image.src = image.src.replace(/shizuku-night(?:-glasses)?\//, useGlasses ? 'shizuku-night-glasses/' : 'shizuku-night/');
  }, glasses);
  await settle(page);
};
const shot = async (locator, filename) => locator.screenshot({ path: `${output}/${filename}.png`, animations: 'disabled' });
async function pair(before, after, filename) {
  const a = await sharp(before).metadata();
  const b = await sharp(after).metadata();
  await sharp({ create: { width: a.width + b.width, height: Math.max(a.height, b.height), channels: 4, background: '#14242b' } })
    .composite([{ input: before, left: 0, top: 0 }, { input: after, left: a.width, top: 0 }]).png().toFile(`${output}/${filename}.png`);
}
try {
  for (const width of [1280, 390]) for (const language of ['ja', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', locale: language });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: language === 'ja' ? '日本語' : 'English', exact: true }).click();
    await page.getByRole('button', { name: language === 'ja' ? '夜' : 'NIGHT', exact: true }).click();
    await settle(page);
    const key = `${width}-${language}`;
    await page.screenshot({ path: `${output}/${key}-title-full.png`, fullPage: true, animations: 'disabled' });
    const titleAfter = await shot(page.locator('.title-art'), `${key}-title-after`);
    await switchArt(page, false);
    const titleBefore = await shot(page.locator('.title-art'), `${key}-title-before`);
    await pair(titleBefore, titleAfter, `${key}-title-comparison`);
    await switchArt(page, true);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${key} horizontal overflow`);
    await page.locator('.start-button').click();
    await page.getByRole('button', { name: language === 'ja' ? 'あなたの番' : 'YOUR TURN', exact: true }).click({ timeout: 30000 });
    await page.locator('.window-canvas__drawing.is-interactive').waitFor({ timeout: 30000 });
    await settle(page);
    await shot(page.locator('.window-canvas'), `${key}-game-waiting`);
    const canvas = page.getByTestId('window-drawing-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .4);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) await page.mouse.move(box.x + box.width * (.2 + .6 * i / 24), box.y + box.height * .4);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    const pixels = () => page.locator('.window-canvas canvas').evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL()));
    const beforePixels = await pixels();
    const gameAfter = await shot(page.locator('.window-canvas'), `${key}-game-after`);
    await switchArt(page, false);
    const gameBefore = await shot(page.locator('.window-canvas'), `${key}-game-before`);
    assert.deepEqual(await pixels(), beforePixels, `${key}: fog and drawing canvases unchanged by art`);
    await pair(gameBefore, gameAfter, `${key}-game-comparison`);
    await page.goto(`${base}?character-preview`);
    await page.getByRole('button', { name: 'NIGHT', exact: true }).click();
    for (const pose of ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing']) {
      await page.getByRole('button', { name: new RegExp(`^${pose.toUpperCase()} ·`) }).click();
      await settle(page);
      const scene = page.locator('.character-preview__window');
      const after = await shot(scene, `${key}-${pose}-after`);
      await switchArt(page, false);
      const before = await shot(scene, `${key}-${pose}-before`);
      await pair(before, after, `${key}-${pose}-comparison`);
      await switchArt(page, true);
    }
    report.cases.push({ width, language, previewPoses: 7, title: true, gameSyntheticStroke: true, fogAndDrawingIdentical: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  // Review sheet assembled from actual preview screenshots, original above candidate.
  const layers = [];
  const poses = ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing'];
  for (let index = 0; index < poses.length; index++) {
    for (const [row, variant] of ['before', 'after'].entries()) {
      layers.push({ input: await sharp(`${output}/1280-ja-${poses[index]}-${variant}.png`).resize(200, 240, { fit: 'contain', background: '#14242b' }).toBuffer(), left: index * 200, top: row * 240 });
    }
  }
  await sharp({ create: { width: 1400, height: 480, channels: 4, background: '#14242b' } }).composite(layers).png().toFile(`${output}/seven-poses.png`);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
