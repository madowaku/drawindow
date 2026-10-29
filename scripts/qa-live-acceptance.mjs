import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const folder = 'artifacts/local/live-acceptance/automated';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? { executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE } : {}) });
const report = { scope: 'AUTOMATED ONLY. Synthetic marks and intercepted HTTP. Zero Gemini calls; human gate NOT TESTED by this script.', journeys: [], failures: [] };

async function draw(page) {
  const canvas = page.getByTestId('window-drawing-canvas');
  const box = await canvas.boundingBox();
  assert(box?.width > 0);
  assert(await canvas.evaluate(element => { const r = element.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === element; }), 'Character blocks input');
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .25, { steps: 8 });
  await page.mouse.move(box.x + box.width * .75, box.y + box.height * .65, { steps: 8 });
  await page.mouse.up();
  assert(await page.getByRole('button', { name: 'DONE', exact: true }).isEnabled());
}

async function start(page, mode = 'DAY') {
  await page.goto('http://localhost:5173/?live-acceptance');
  await page.getByRole('button', { name: mode, exact: true }).click();
  await page.getByRole('button', { name: /Use live API/ }).click();
  await page.getByRole('button', { name: 'START GAME' }).click();
  await page.getByRole('button', { name: 'YOUR TURN' }).waitFor();
}

async function noSpoilers(page) {
  assert.equal(await page.locator('.score-strip,.interpretation,input').count(), 0);
  const content = await page.evaluate(() => document.body.textContent + ' ' + [...document.querySelectorAll('[aria-label],[title]')].map(el => `${el.getAttribute('aria-label')} ${el.getAttribute('title')}`).join(' '));
  for (const word of ['dog', 'house', 'fish', 'cat', 'guitar', 'elephant', 'tree']) assert(!new RegExp(`\\b${word}\\b`, 'i').test(content), `Premature word: ${word}`);
}

try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 720, height: 1280 }, { width: 1280, height: 720 }]) {
    for (const mode of ['DAY', 'NIGHT']) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: viewport.width < 1000 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const requests = [];
      let failNext = false;
      await page.route('**/api/recognize', async route => {
        const body = route.request().postDataJSON();
        assert.deepEqual(Object.keys(body).sort(), ['imageDataUrl', 'requestId']);
        assert.match(body.imageDataUrl, /^data:image\/png;base64,/);
        const pixels = Buffer.from(body.imageDataUrl.split(',')[1], 'base64');
        assert.equal(pixels.readUInt32BE(16), 512); assert.equal(pixels.readUInt32BE(20), 512);
        const round = Number(body.requestId.split(':')[1]);
        if (failNext) {
          failNext = false;
          requests.push({ requestId: body.requestId, round, status: 503, imageSha256: createHash('sha256').update(body.imageDataUrl).digest('hex') });
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ guess: null, source: 'api', errorCode: 'unavailable' }) });
          return;
        }
        const guess = ['dog', 'house', 'fish', 'cat'][round - 1];
        assert(guess, 'Fifth drawing must not make a request');
        requests.push({ requestId: body.requestId, round, status: 200, fixtureGuess: guess, imageSha256: createHash('sha256').update(body.imageDataUrl).digest('hex') });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ guess, source: 'api' }) });
      });
      await start(page, mode);
      const prefix = `${viewport.width}-${mode.toLowerCase()}`;
      for (let round = 1; round <= 5; round++) {
        await page.getByRole('button', { name: 'YOUR TURN' }).waitFor();
        await noSpoilers(page);
        assert.equal(await page.getByText('LIVE API', { exact: true }).count(), 1);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (round === 1) {
          await page.screenshot({ path: `${folder}/${prefix}-holding.png` });
          const held = await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.toDataURL());
          await page.waitForTimeout(300);
          assert.equal(await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.toDataURL()), held);
        }
        await page.getByRole('button', { name: 'YOUR TURN' }).click();
        assert(!await page.getByRole('button', { name: 'DONE', exact: true }).isEnabled());
        await draw(page);
        if (round === 1) await page.screenshot({ path: `${folder}/${prefix}-player.png` });
        await page.getByRole('button', { name: 'DONE', exact: true }).click();
      }
      await page.getByRole('heading', { name: 'What did you mean?' }).waitFor();
      assert.equal(requests.length, 4);
      assert.equal(await page.locator('.interpretation,.score-strip').count(), 0);
      const fields = page.locator('.review-field input');
      assert.equal(await fields.count(), 5);
      for (let i = 0; i < 5; i++) await fields.nth(i).fill(['dog', 'house', 'fish', 'cat', 'tree'][i]);
      await page.screenshot({ path: `${folder}/${prefix}-review.png`, fullPage: true });
      await page.getByRole('button', { name: 'REVEAL OUR CHAIN' }).click();
      await page.getByRole('button', { name: 'SAVE ACCEPTANCE JSON' }).waitFor();
      const evidence = JSON.parse(await page.locator('aside pre').textContent());
      assert.equal(evidence.humanAttestation, false);
      assert.equal(evidence.scoreMatches, true);
      assert.equal(evidence.entries.length, 10);
      assert.equal(evidence.actualScore.links.length, 9);
      assert.equal(evidence.attempts.length, 4);
      assert.equal(evidence.entries[9].recognition, null);
      assert(evidence.selectionChecks.every(check => check.matches && check.inCatalogue));
      assert.equal(evidence.sessionKind, 'api');
      assert(!JSON.stringify(evidence).match(/imageDataUrl|private-stroke|points|headers/));
      assert.equal(await page.locator('.result-drawing').count(), 10);
      assert.equal(await page.locator('.chain-link').count(), 9);
      await page.screenshot({ path: `${folder}/${prefix}-results.png`, fullPage: true });
      await writeFile(`${folder}/${prefix}-fixture-evidence.json`, JSON.stringify({ ...evidence, evidence: report.scope }, null, 2));
      await page.getByRole('button', { name: 'ANOTHER WINDOW' }).click();
      assert.equal(await page.locator('aside').count(), 0, 'Previous record remains in new game');
      await page.getByRole('button', { name: 'YOUR TURN' }).waitFor();
      await page.getByRole('button', { name: 'YOUR TURN' }).click();
      await draw(page);
      failNext = true;
      await page.getByRole('button', { name: 'DONE', exact: true }).click();
      await page.getByRole('button', { name: 'TRY AGAIN' }).waitFor();
      await noSpoilers(page);
      // The error footer can resize the display canvas on landscape screens.
      // Check visible ink here, and exact neutral inference-image parity on recovery.
      const failedImageHash = requests.at(-1).imageSha256;
      assert(await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((byte, i) => i % 4 === 3 && byte > 0)), 'Ink disappeared in error state');
      await page.screenshot({ path: `${folder}/${prefix}-error-503.png`, fullPage: true });
      for (const name of ['TRY AGAIN', 'DEMO MODE', 'ADD OR CHANGE LINES']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, `${prefix}: ${name} outside viewport`);
      }
      await page.getByRole('button', { name: 'ADD OR CHANGE LINES', exact: true }).click();
      await page.getByRole('button', { name: 'DONE', exact: true }).click();
      await page.getByRole('button', { name: 'YOUR TURN' }).waitFor();
      assert.equal(requests.at(-1).imageSha256, failedImageHash, 'Restored neutral drawing differs after ADD OR CHANGE LINES');
      assert.equal(errors.length, 0, errors.join('\n'));
      report.journeys.push({ viewport, mode, reducedMotion: true, fourInterceptedCalls: true, fifthSkipped: true, selectionMatches: true, independentScoreMatches: true, noSpoilers: true, errorControlsReachable: true, errorInkRetained: true, errors });
      console.log(JSON.stringify({ passed: prefix, fixtureCalls: 4, scoreMatches: true }));
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let responseCase = { status: 503, body: { guess: null, source: 'api', errorCode: 'unavailable' } };
  const ids = [];
  await page.route('**/api/recognize', async route => {
    ids.push(route.request().postDataJSON().requestId);
    await route.fulfill({ status: responseCase.status, contentType: 'application/json', headers: responseCase.status === 429 ? { 'Retry-After': '60' } : {}, body: typeof responseCase.body === 'string' ? responseCase.body : JSON.stringify(responseCase.body) });
  });
  for (const failure of [
    { status: 403, body: {} }, { status: 429, body: {} }, { status: 503, body: {} }, { status: 504, body: {} }, { status: 502, body: { guess: null, source: 'api', errorCode: 'invalid_response' } },
    { status: 200, body: '{bad-json' }, { status: 200, body: { guess: null, source: 'api' } }, { status: 200, body: { guess: 'cat', source: 'mock' } },
  ]) {
    responseCase = failure;
    await start(page);
    await page.getByRole('button', { name: 'YOUR TURN' }).click(); await draw(page);
    const ink = await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.toDataURL());
    const before = ids.length;
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await page.getByRole('button', { name: 'TRY AGAIN' }).waitFor();
    assert.equal(ids.length, before + 1);
    assert(await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.toDataURL()) === ink, 'Ink changed after failure at fixed mobile width');
    assert.equal(await page.getByText('LIVE API', { exact: true }).count(), 1);
    assert.equal(await page.getByText('DEMO', { exact: true }).count(), 0);
    await noSpoilers(page);
    if (failure.status === 429) assert.match(await page.getByRole('alert').textContent(), /limit|quota/i);
    if (failure.status !== 200) await page.screenshot({ path: `${folder}/360-day-error-${failure.status}.png`, fullPage: true });
    await page.getByRole('button', { name: 'ADD OR CHANGE LINES', exact: true }).click();
    assert(await page.getByTestId('window-drawing-canvas').evaluate(canvas => canvas.toDataURL()) === ink, 'Ink changed after BACK at fixed mobile width');
    responseCase = { status: 200, body: { guess: 'dog', source: 'api' } };
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await page.getByRole('button', { name: 'YOUR TURN' }).waitFor();
    assert.notEqual(ids.at(-1), ids.at(-2));
    report.failures.push({ status: failure.status, payloadKind: typeof failure.body === 'string' ? 'invalid-json' : failure.body.source === 'mock' ? 'mock-contamination' : failure.status === 200 ? 'null-guess' : 'http-error', retainedInk: true, explicitBackRecovery: true, noAutomaticDemo: true });
  }
  await context.close();
} finally {
  await browser.close();
  await writeFile(`${folder}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
}
