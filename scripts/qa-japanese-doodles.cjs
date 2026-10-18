async (page) => {
  // Run through playwright-cli run-code --filename=scripts/qa-japanese-doodles.cjs
  // Requires a dev server at the current page origin; never calls recognition.
  const base = new URL(page.url()).origin;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const report = { scope: 'Browser layout and review controls; no human recognition or physical-device claim.', journeys: [] };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [360, 1280]) for (const mode of ['day', 'night']) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${base}/?japanese-doodle-preview`);
    await page.getByRole('button', { name: '1枚ずつ見る', exact: true }).waitFor();
    await page.evaluate(() => localStorage.removeItem('drawindow-ja-doodle-review-v1'));
    await page.reload();
    if (mode === 'night') await page.getByRole('button', { name: '☾ 夜', exact: true }).click();
    await page.getByRole('button', { name: '1枚ずつ見る', exact: true }).click();
    const classic = [];
    for (let index = 0; index < 16; index++) {
      const result = await page.evaluate(() => {
        const card = document.querySelector('.ja-catalog-card');
        const canvases = [...card.querySelectorAll('canvas')];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          bottom: card.getBoundingClientRect().bottom,
          images: canvases.length,
          widths: canvases.map(c => c.getBoundingClientRect().width),
          ink: canvases.every(c => c.getContext('2d').getImageData(0,0,200,200).data.some((n,i) => i % 4 === 3 && n > 0)),
          changed: canvases[0].toDataURL() !== canvases[1].toDataURL(),
          leaked: /ごりら|gorilla|ちくわ|chikuwa|ねぎ|negi|すずめ|sparrow|せみ|cicada|あさがお|morning-glory/.test(card.outerHTML),
        };
      });
      assert(!result.overflow && result.ink && !result.leaked && result.images === 2, `Classic ${index}: invalid image or blind layout`);
      assert(Math.abs(result.widths[0] - result.widths[1]) < 1, 'Comparison scales differ');
      if (width === 360) assert(result.bottom <= 800, 'Review card below 800px viewport');
      assert(result.changed === [0,6,7,12,13,15].includes(index), `Wrong v02 comparison at ${index}`);
      await page.getByRole('button', { name: '保留', exact: true }).click();
      assert(await page.getByRole('button', { name: '保留', exact: true }).getAttribute('aria-pressed') === 'true', 'Mark lost');
      classic.push(result);
      if (index < 15) await page.getByRole('button', { name: '次の絵', exact: true }).click();
    }
    assert(await page.getByRole('button', { name: '次の絵', exact: true }).isDisabled(), 'Last item not bounded');
    if (width === 360) await page.screenshot({ path: `output/playwright/mobile-${mode}-classic.png` });
    await page.reload();
    await page.getByRole('button', { name: '1枚ずつ見る', exact: true }).click();
    assert(await page.getByRole('button', { name: '保留', exact: true }).getAttribute('aria-pressed') === 'true', 'Mark did not persist');
    await page.locator('summary').click();
    if (mode === 'night') await page.getByRole('button', { name: '☾ 夜', exact: true }).click();
    await page.getByRole('button', { name: '今回追加12枚', exact: true }).click();
    await page.locator('summary').click();
    for (let index = 0; index < 12; index++) {
      assert(await page.getByRole('img').count() === 1, 'New noun unexpectedly has a baseline');
      assert(await page.locator('.ja-catalog-card strong').count() === 0, 'New noun leaks its name');
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.ja-catalog-card').getBoundingClientRect().bottom <= 800);
      if (width === 360) assert(fits, 'New noun mobile overflow');
      if (index < 11) await page.getByRole('button', { name: '次の絵', exact: true }).click();
    }
    await page.getByRole('button', { name: '名前を表示', exact: true }).click();
    assert(await page.getByText('たけのこ', { exact: true }).count() === 1, 'Explicit reveal failed');
    await page.getByRole('button', { name: '名前を隠す', exact: true }).click();
    await page.getByRole('button', { name: '一覧で見る', exact: true }).click();
    if (width === 1280) await page.screenshot({ path: `output/playwright/everyday-${mode}.png`, fullPage: true });
    report.journeys.push({ width, height: 800, mode, classicPairs: classic.length, newNouns: 12, persisted: true });
  }
  assert(!errors.length, errors.join('; '));
  await page.evaluate(() => localStorage.removeItem('drawindow-ja-doodle-review-v1'));
  await page.goto(`${base}/?japanese-doodle-preview`);
  return report;
}
