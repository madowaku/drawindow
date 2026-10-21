async (page) => {
  const base = new URL(page.url()).origin;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const journeys = [], errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const lang of ['en','ja']) for (const mode of ['day','night']) {
    await page.goto(base);
    await page.evaluate(({lang,mode}) => {
      localStorage.setItem('drawindow-language', lang);
      localStorage.setItem('drawindow-mode', mode);
      localStorage.setItem('drawindow-sound', 'off');
    }, {lang,mode});
    await page.goto(`${base}/?japanese-doodle-preview`);
    // The production ZIP must not expose any development review route.
    assert(await page.locator('.ja-catalog').count() === 0, 'Development gallery shipped');
    await page.getByRole('button', { name: lang === 'ja' ? 'デモで遊ぶ' : 'PLAY DEMO', exact: true }).click();
    for (let round = 0; round < 5; round++) {
      await page.getByRole('button', { name: lang === 'ja' ? 'あなたの番' : 'YOUR TURN', exact: true }).click();
      const canvas = page.getByTestId('window-drawing-canvas');
      await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
      const draw = async () => {
        await page.mouse.move(box.x + box.width * .2, box.y + box.height * .3);
        await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .6, { steps: 8 }); await page.mouse.up();
      };
      await draw();
      const done = page.getByRole('button', { name: lang === 'ja' ? 'できた' : 'DONE', exact: true });
      if (!round) {
        await page.getByRole('button', { name: lang === 'ja' ? 'ひと筆戻す' : 'Undo last stroke', exact: true }).click();
        assert(await done.isDisabled(), 'Undo did not remove first ink'); await draw();
        await page.getByRole('button', { name: lang === 'ja' ? '消す' : 'CLEAR', exact: true }).click();
        assert(await done.isDisabled(), 'Clear did not reset ink'); await draw();
      }
      await done.click();
    }
    const inputs = page.getByRole('textbox'); await inputs.first().waitFor();
    for (let i = 0; i < 5; i++) await inputs.nth(i).fill(lang === 'ja' ? ['たまご','ねぎ','いぬ','くし','はな'][i] : ['egg','tree','rat','rain','tea'][i]);
    await page.getByRole('button', { name: lang === 'ja' ? '答えあわせ' : 'REVEAL OUR CHAIN', exact: true }).click();
    assert(await page.locator('.ending-diary > li').count() === 10, 'Missing diary drawings');
    assert(await page.locator('.chain-link').count() === 0, 'Diary reveals answers early');
    await page.getByRole('button', { name: lang === 'ja' ? '答え合わせをする' : 'See what we meant', exact: true }).click();
    assert(await page.locator('.chain-link').count() === 9, 'Wrong link count');
    await page.getByRole('button', { name: lang === 'ja' ? '窓の向こうへ、またね' : 'A little goodbye', exact: true }).click();
    await page.getByRole('button', { name: lang === 'ja' ? 'もう一度、10枚を眺める' : 'Look at our drawings again', exact: true }).click();
    const beforeSave = requests.length;
    await page.getByRole('button', { name: lang === 'ja' ? '今日の窓を残す' : 'SAVE TODAY’S WINDOW', exact: true }).click();
    await page.getByRole('link', { name: lang === 'ja' ? '画像をダウンロード' : 'Download image', exact: true }).waitFor();
    await page.locator('.souvenir img').evaluate(i => i.decode());
    const size = await page.locator('.souvenir img').evaluate(i => [i.naturalWidth, i.naturalHeight]);
    assert(size[0] === 1200 && size[1] === 3000, 'Invalid local PNG');
    assert(!requests.slice(beforeSave).some(url => /^https?:/.test(url)), 'PNG made an outgoing request');
    assert(!await page.getByRole('checkbox').isChecked(), 'PNG includes answers by default');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow');
    await page.screenshot({ path: `output/playwright/product-${lang}-${mode}.png`, fullPage: true });
    journeys.push({lang,mode,rounds:5,pictures:10,links:9,png:size,saveHttpRequests:0,undoClear:true});
  }
  assert(!errors.length, errors.join(';'));
  assert(!requests.some(url => /\/api\/recognize/.test(url)), 'DEMO contacted recognition');
  assert(!requests.some(url => /shizuku[^?]*[-/]b[-/]/i.test(url)), 'Unexpected B sprite request');
  return { scope:'Packaged DEMO, synthetic pointer input, reduced motion, 360x800; not human LIVE or real Android evidence.', journeys, errors };
}
