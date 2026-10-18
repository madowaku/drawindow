import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href);
const base = process.env.DRAWINDOW_QA_URL ?? 'http://localhost:5173/';
const folder = process.env.DRAWINDOW_QA_FOLDER ?? 'artifacts/qa/bgm';
await mkdir(folder, { recursive: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_QA_BROWSER ? { executablePath: process.env.DRAWINDOW_QA_BROWSER } : {}), args: ['--autoplay-policy=user-gesture-required'] });
const report = { base, scope: 'Actual Chromium media decoding/progress/signal with simulated input and pagehide/pageshow. Not physical-device listening or subjective mix acceptance.', journeys: [] };

async function audioState(page) {
  return page.evaluate(() => {
    const media = document.querySelector('audio[data-drawindow-bgm]');
    const analyser = window.qaMusicAnalyser;
    const samples = new Float32Array(2048);
    if (analyser) analyser.getFloatTimeDomainData(samples);
    return { track: media?.dataset.drawindowBgm, paused: media?.paused, time: media?.currentTime, duration: media?.duration, loop: media?.loop, ready: media?.readyState, source: media?.src, players: document.querySelectorAll('audio[data-drawindow-bgm]').length, contextState: window.qaContexts?.at(-1)?.state, rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) };
  });
}

async function playing(page, track) {
  await page.waitForFunction(expected => {
    const media = document.querySelector('audio[data-drawindow-bgm]');
    return media?.dataset.drawindowBgm === expected && !media.paused && media.currentTime > .15 && media.readyState >= 2 && window.qaContexts?.at(-1)?.state === 'running';
  }, track, { timeout: 15000 });
  await page.waitForFunction(() => {
    const analyser = window.qaMusicAnalyser;
    if (!analyser) return false;
    const samples = new Float32Array(2048); analyser.getFloatTimeDomainData(samples);
    return samples.some(value => Math.abs(value) > .00001);
  }, undefined, { timeout: 10000 });
  const state = await audioState(page);
  assert(state.players === 1 && state.loop && state.contextState === 'running', `Invalid native audio state: ${JSON.stringify(state)}`);
  const { source, ...safe } = state;
  return safe;
}

async function verifyLoop(page) {
  await page.evaluate(() => { const media = document.querySelector('audio'); media.currentTime = media.duration - .2; });
  await page.waitForFunction(() => { const media = document.querySelector('audio'); return !media.paused && media.currentTime < 2; }, undefined, { timeout: 5000 });
}

try {
  for (const [width, height, mode] of [[390, 844, 'day'], [1280, 720, 'night']]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 500 });
    await context.addInitScript(() => {
      window.qaContexts = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.qaContexts.push(this); }
        createMediaElementSource(media) {
          const source = super.createMediaElementSource(media);
          const analyser = this.createAnalyser(); analyser.fftSize = 2048;
          const silent = this.createGain(); silent.gain.value = 0;
          source.connect(analyser); analyser.connect(silent); silent.connect(this.destination);
          window.qaMusicAnalyser = analyser;
          return source;
        }
      };
    });
    const page = await context.newPage(); const errors = [], musicRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('.bin') && !url.searchParams.has('url') && !url.searchParams.has('import')) musicRequests.push(url.href);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
    await page.goto(base);
    await page.getByRole('button', { name: 'Enable sound', exact: true }).waitFor();
    assert(musicRequests.length === 0 && await page.locator('audio').count() === 0, 'Muted entry loaded music');
    await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
    const title = await playing(page, 'title');
    await verifyLoop(page);
    await page.getByRole('button', { name: 'NIGHT', exact: true }).click();
    await page.getByRole('button', { name: mode.toUpperCase(), exact: true }).click();
    assert((await audioState(page)).track === 'title' && musicRequests.length === 1, 'Theme change restarted title music');
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    const mutedTime = (await audioState(page)).time;
    await page.waitForTimeout(300);
    assert((await audioState(page)).paused && Math.abs((await audioState(page)).time - mutedTime) < .1, 'Mute did not stop playback');
    await page.getByRole('button', { name: 'Enable sound', exact: true }).click(); await playing(page, 'title');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await page.waitForFunction(() => document.querySelector('audio')?.paused && window.qaContexts.at(-1)?.state === 'suspended');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow'))); await playing(page, 'title');
    await page.getByRole('button', { name: 'How to play and credits' }).click();
    const dialog = page.getByRole('dialog');
    assert(await dialog.getByRole('link', { name: /Coral Ambience/ }).count() === 1, 'Missing day credit');
    assert(await dialog.getByRole('link', { name: /物語の幕を/ }).count() === 1, 'Missing title credit');
    assert(await dialog.getByRole('link', { name: /おやすみの時間/ }).count() === 1, 'Missing night credit');
    if (width < 500) { await dialog.evaluate(el => el.scrollTop = el.scrollHeight); await page.screenshot({ path: `${folder}/mobile-music-credits.png` }); }
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'PLAY DEMO' }).click();
    const session = await playing(page, mode); await verifyLoop(page); const sessionSource = (await audioState(page)).source;
    for (let round = 1; round <= 5; round++) {
      await page.getByRole('button', { name: 'YOUR TURN' }).waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'YOUR TURN' }).click();
      const box = await page.getByTestId('window-drawing-canvas').boundingBox();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5); await page.mouse.down();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .3, { steps: 5 });
      await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5, { steps: 5 }); await page.mouse.up();
      if (round === 1) await page.screenshot({ path: `${folder}/${width}-${mode}-playing.png` });
      const current = await audioState(page);
      assert(!current.paused && current.source === sessionSource, 'Music restarted or stopped during exchange');
      assert(await page.locator('.score-strip,.interpretation,input').count() === 0, 'Early game disclosure');
      await page.getByRole('button', { name: /^DONE/ }).click();
    }
    await page.getByRole('button', { name: 'REVEAL OUR CHAIN' }).waitFor();
    assert((await audioState(page)).source === sessionSource, 'Review changed the music source');
    await page.getByRole('button', { name: 'REVEAL OUR CHAIN' }).click();
    assert(await page.locator('.result-drawing').count() === 10 && await page.locator('.chain-link').count() === 9, 'Broken final chain');
    assert((await audioState(page)).source === sessionSource, 'Results changed the music source');
    await page.getByRole('button', { name: 'ANOTHER WINDOW' }).click();
    assert((await audioState(page)).source === sessionSource, 'Restart changed the music source');
    await page.getByRole('button', { name: 'DRAWINDOW home' }).click();
    await page.getByRole('button', { name: 'RETURN TO TITLE' }).click(); await playing(page, 'title');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow, 'Horizontal overflow'); assert(errors.length === 0, JSON.stringify(errors));
    const result = { viewport: [width, height], mode, title, session, mutedEntryNoRequests: true, themeKeepsTitleTrack: true, muteResume: true, simulatedPageHideResume: true, nativeTitleAndSessionLoop: true, fiveExchanges: true, reviewResultsRestartKeepSource: true, titleReturn: true, credits: true, errors, musicRequestCount: musicRequests.length };
    report.journeys.push(result); console.log(JSON.stringify({ viewport: result.viewport, mode, passed: true }));
    await writeFile(`${folder}/browser-audio.json`, JSON.stringify(report, null, 2) + '\n'); await context.close();
  }
} finally { await browser.close(); }
