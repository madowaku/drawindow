import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const base = process.env.DRAWINDOW_QA_URL ?? 'http://localhost:5181/';
const folder = process.env.DRAWINDOW_QA_FOLDER ?? 'artifacts/qa/ending';
const widths = process.env.DRAWINDOW_QA_GAME_ONLY ? [] : process.env.DRAWINDOW_QA_QUICK ? [[360,800]] : [[360,800],[720,1280],[1280,800]];
const motions = process.env.DRAWINDOW_QA_REDUCED_ONLY ? [true] : [false, true];
await mkdir(folder, { recursive: true });
const report = { scope: 'Synthetic presentation fixtures + simulated five-exchange DEMO; no genuine recognition, human drawing, Android save or enjoyment evidence.', variants: [], scenarios: [], journey: null };
const assert = (v, m) => { if (!v) throw new Error(m); };
const metrics = page => page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, missing: [...document.images].filter(i => !i.naturalWidth && !i.hidden).length, focus: document.activeElement?.tagName, controls: [...document.querySelectorAll('.ending button,.souvenir a,.souvenir label')].filter(e => e.getBoundingClientRect().height > 0).map(e => ({ text: e.textContent, height: e.getBoundingClientRect().height })), ink: [...document.querySelectorAll('.ending-diary canvas')].map(c => [...c.getContext('2d').getImageData(0, 0, c.width, c.height).data].filter((v, i) => i % 4 === 3 && v > 0).length) }));
try {
  for (const [width, height] of widths) for (const lang of ['en', 'ja']) for (const mode of ['day', 'night']) for (const reduced of motions) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', acceptDownloads: true });
    const page = await context.newPage(); const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push(r.url()));
    await page.goto(`${base}?ending-preview&lang=${lang}&mode=${mode}`);
    const root = page.locator('.ending'); await root.waitFor().catch(e => { throw new Error(`${width}-${lang}-${mode}: ${errors.join(';')} ${e.message}`); });
    if (!reduced) await page.waitForFunction(() => document.querySelectorAll('.ending-diary > li').length === 10);
    assert(await page.locator('.ending-diary > li').count() === 10, 'Missing diary picture');
    assert(!/apple|こま|いぬ|dog/.test(await root.innerText()), 'Diary text spoiler');
    assert(await root.locator('.chain-link,.score-strip,.ending-meaning').count() === 0, 'Diary answer leak');
    const name = `${width}-${lang}-${mode}-${reduced ? 'reduced' : 'motion'}`;
    if (reduced) await page.screenshot({ path: `${folder}/${name}-diary.png`, fullPage: true });
    await page.getByRole('button', { name: lang === 'ja' ? '答え合わせをする' : 'See what we meant', exact: true }).click();
    if (!reduced) await page.waitForFunction(() => document.querySelectorAll('.chain-link').length === 9);
    const paced = await page.locator('.ending-diary').innerText();
    await page.getByRole('button', { name: lang === 'ja' ? 'すぐ見る・答えを開く' : 'Skip animation · see results', exact: true }).click();
    assert(paced === await page.locator('.ending-diary').innerText(), 'Paced/skip changed data');
    assert(await root.locator('.result-drawing').count() === 10 && await root.locator('.chain-link').count() === 9, 'Wrong reveal counts');
    const state = await metrics(page);
    assert(await page.locator('.ending-diary canvas').first().evaluate(c => c.getBoundingClientRect().width >= 100), 'Diary pictures too small');
    assert(!state.overflow && state.missing === 0 && state.ink.length === 10 && state.ink.every(n => n > 0), `Invalid canvas/layout ${name}`);
    assert(state.controls.every(c => c.height >= 44), `Small touch control ${name}: ${JSON.stringify(state.controls)}`);
    assert(state.focus === 'H1', 'Skip focus lost');
    if (reduced) await page.screenshot({ path: `${folder}/${name}-reveal.png`, fullPage: true });
    await page.getByRole('button', { name: lang === 'ja' ? '窓の向こうへ、またね' : 'A little goodbye', exact: true }).click();
    assert(await page.locator('blockquote').innerText().then(s => s.includes("We didn't see the same things.")), 'Mismatch closing absent');
    if (!reduced) await page.waitForTimeout(4100);
    if (reduced) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${folder}/${name}-goodbye.png` }); }
    await page.getByRole('button', { name: lang === 'ja' ? 'もう一度、10枚を眺める' : 'Look at our drawings again', exact: true }).click();
    const saveStart = requests.length;
    await page.getByRole('button', { name: lang === 'ja' ? '今日の窓を残す' : 'SAVE TODAY’S WINDOW', exact: true }).click();
    const download = page.getByRole('link', { name: lang === 'ja' ? '画像をダウンロード' : 'Download image', exact: true }); await download.waitFor();
    await page.locator('.souvenir img').evaluate(i => i.decode());
    const size = await page.locator('.souvenir img').evaluate(i => [i.naturalWidth, i.naturalHeight]);
    assert(size[0] === 1200 && size[1] === 3000, 'Wrong souvenir dimensions');
    assert(!requests.slice(saveStart).some(url => /^https?:/.test(url)), 'Saving made an outgoing request');
    if (width === 360 && reduced) {
      const [file] = await Promise.all([page.waitForEvent('download'), download.click()]); await file.saveAs(`${folder}/${lang}-${mode}-souvenir.png`);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: lang === 'ja' ? '今日の窓を残す' : 'SAVE TODAY’S WINDOW', exact: true }).click(); await download.waitFor();
      const [words] = await Promise.all([page.waitForEvent('download'), download.click()]); await words.saveAs(`${folder}/${lang}-${mode}-souvenir-words.png`);
    }
    assert(!errors.length, errors.join(';'));
    report.variants.push({ viewport: [width, height], lang, mode, reduced, ...state, exportSize: size, saveOutgoingRequests: requests.slice(saveStart).filter(u => /^https?:/.test(u)), errors });
    console.log(`checked ${name}`); await context.close();
  }
  for (const scenario of process.env.DRAWINDOW_QA_GAME_ONLY ? [] : ['unknown', 'perfect', 'restart', 'demo']) {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' }); const page = await context.newPage();
    await page.goto(`${base}?ending-preview&lang=ja&case=${scenario}`);
    await page.getByRole('button', { name: 'すぐ見る・答えを開く', exact: true }).click();
    if (scenario === 'unknown') assert(await page.locator('.chain-link.unknown').count() === 9, 'Unknown slots lost');
    if (scenario === 'perfect') { assert(await page.locator('.chain-link.connected').count() === 9, 'Perfect fixture not perfect'); assert(!/完全な理解|perfect understanding/.test(await page.locator('.ending').innerText()), 'Perfect falsely implies understanding'); }
    if (scenario === 'restart') assert((await page.locator('.ending-entry-note').innerText()).includes('「ん」'), 'Restart disclosure absent');
    if (scenario === 'demo') assert((await page.locator('.result-disclosure').innerText()).includes('比較できません'), 'Demo comparability leak');
    await page.screenshot({ path: `${folder}/360-ja-${scenario}.png`, fullPage: true }); report.scenarios.push(scenario); await context.close();
  }
  // Actual production App flow, using local demo responses and synthetic pointer marks.
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('drawindow-language', 'en'); });
  await page.goto(base); await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await page.getByRole('button', { name: 'PLAY DEMO', exact: true }).click();
  for (let round = 0; round < 5; round++) {
    await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
    const canvas = page.getByTestId('window-drawing-canvas'); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .3); await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .6, { steps: 8 }); await page.mouse.up();
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
  }
  const inputs = page.getByRole('textbox'); await inputs.first().waitFor();
  for (let i = 0; i < 5; i++) await inputs.nth(i).fill(['egg', 'tree', 'rat', 'rain', 'tea'][i]);
  await page.getByRole('button', { name: 'REVEAL OUR CHAIN', exact: true }).click();
  assert(await page.locator('.ending-diary > li').count() === 10, 'Actual App missing ending');
  await page.waitForFunction(() => { const a = document.querySelector('audio[data-drawindow-bgm=ending]'); return a && !a.paused && a.currentTime > 0; });
  const before = await page.locator('audio').evaluate(a => ({ time: a.currentTime, loop: a.loop, src: a.src, duration: a.duration }));
  assert(before.loop === false && before.duration > 162 && before.duration < 164, 'Wrong ending music');
  await page.getByRole('button', { name: 'See what we meant', exact: true }).click();
  await page.getByRole('button', { name: 'A little goodbye', exact: true }).click();
  const after = await page.locator('audio').evaluate(a => ({ time: a.currentTime, src: a.src })); assert(after.src === before.src && after.time >= before.time, 'Ending music restarted between acts');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click(); assert(await page.locator('audio').evaluate(a => a.paused), 'Mute failed');
  await page.getByRole('button', { name: 'ANOTHER WINDOW', exact: true }).click(); await page.getByRole('button', { name: 'YOUR TURN', exact: true }).waitFor();
  assert(!errors.length, errors.join(';')); report.journey = { syntheticDemo: true, rounds: 5, endingMusic: before, noRestartBetweenActs: true, mutedAndRestarted: true, errors }; await context.close();
} finally { await browser.close(); await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ variants: report.variants.length, scenarios: report.scenarios, journey: !!report.journey }));
