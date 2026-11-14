import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DRAWINDOW_QA_URL || 'http://127.0.0.1:5176/';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const folder = 'artifacts/qa/night-glasses/acting';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { scope: 'Actual NIGHT game phases, automated Chromium, normal motion.', captures: [], errors: [] };
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'NIGHT', exact: true }).click();
    await page.locator('.title-art img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.locator('.start-button').click();
    for (const phase of ['girl_breath', 'girl_drawing', 'girl_holding']) {
      const scene = page.locator(`.window-canvas .character-scene[data-phase="${phase}"]`);
      await scene.waitFor({ timeout: 30000 });
      const pose = await scene.getAttribute('data-pose');
      await page.locator('.window-canvas').screenshot({ path: `${folder}/${width}-${phase}.png` });
      report.captures.push({ width, phase, pose });
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
