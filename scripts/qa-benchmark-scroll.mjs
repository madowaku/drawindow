import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Reuse a running local preview. Wheel input, rather than scrollIntoView or a
// full-page screenshot, proves the controls are reachable by a person.
const origin = process.env.DRAWINDOW_QA_ORIGIN ?? 'http://127.0.0.1:4253';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 360, height: 640 }, { width: 478, height: 855 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto(origin + '/?recognition-benchmark');
    for (const mode of ['fixed', 'freehand']) {
      if (mode === 'freehand') {
        await page.getByRole('button', { name: 'Export sanitized CSV', exact: true }).press('Control+Home');
        await page.getByRole('button', { name: '自由描画・前処理比較', exact: true }).click();
      }
      const metrics = await page.locator('.benchmark').evaluate(element => ({ height: element.clientHeight, content: element.scrollHeight, overflow: getComputedStyle(element).overflowY }));
      assert.equal(metrics.height, viewport.height);
      assert(metrics.content > metrics.height);
      assert.equal(metrics.overflow, 'auto');
      await page.mouse.move(viewport.width - 20, viewport.height / 2);
      for (let i = 0; i < 25; i++) {
        await page.mouse.wheel(0, 650);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (await page.locator('.benchmark').evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 2)) break;
      }
      const top = await page.locator('.benchmark').evaluate(e => e.scrollTop);
      assert(top > 0, 'wheel must move the actual scroll container');
      const button = page.getByRole('button', { name: mode === 'fixed' ? 'Export sanitized CSV' : '自由描画CSV', exact: true });
      const box = await button.boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= viewport.height, 'export must fit inside the visible viewport');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      // Tab focus must also be able to reach controls in the scroll container.
      await button.press('Control+Home');
      await page.waitForFunction(() => document.querySelector('.benchmark').scrollTop === 0, null, { timeout: 2000 });
      results.push({ viewport, mode, wheelScroll: true, bottomButtonVisible: true, keyboardHome: true });
    }
    await page.close();
  }
  await mkdir('artifacts/release', { recursive: true });
  await writeFile('artifacts/release/v013-benchmark-scroll.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ status: 'pass', checks: results }));
} finally { await browser.close(); }
