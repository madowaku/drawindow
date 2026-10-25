import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const origin = 'http://127.0.0.1:4254/';
const generated = 'src/dev/v013BaselineRecognizer.generated.ts';
const generatedFiles = [generated];
// Generate only during QA, from the actual starting main; never ship a second model adapter.
for (const [original, target] of [['quickDrawJapanese','v013BaselineJapanese'], ['quickDrawScores','v013BaselineScores'], ['quickDrawPreprocess','v013BaselinePreprocess'], ['quickDrawRecognizer','v013BaselineRecognizer']]) {
  const file = 'src/dev/' + target + '.generated.ts';
  const source = execFileSync('git', ['show', '3dad268:src/services/' + original + '.ts'], { encoding: 'utf8' })
    .replaceAll("'./quickDrawPreprocess'", "'./v013BaselinePreprocess.generated'")
    .replaceAll("'./quickDrawScores'", "'./v013BaselineScores.generated'")
    .replaceAll("'./quickDrawJapanese'", "'./v013BaselineJapanese.generated'");
  if (!generatedFiles.includes(file)) generatedFiles.push(file);
  await writeFile(file, source);
}
const server = spawn(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1', '--port', '4254', '--strictPort'], { stdio: 'pipe' });
let browser;
const receipt = { scope: 'Desktop Chromium synthetic same-stroke timing. Not Android, human accuracy, or controlled hardware benchmark.', status: 'started', measurements: [], external: [], posts: 0 };
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ headless: true });
  for (const module of ['/src/dev/v013BaselineRecognizer.generated.ts', '/src/services/quickDrawRecognizer.ts', '/src/services/quickDrawRecognizer.ts', '/src/dev/v013BaselineRecognizer.generated.ts']) {
    const context = await browser.newContext(), page = await context.newPage();
    page.on('request', r => { if (!r.url().startsWith(origin) && !/^(blob:|data:)/.test(r.url())) receipt.external.push(r.url()); if (r.method() === 'POST') receipt.posts++; });
    await page.goto(origin);
    const timing = await page.evaluate(async path => {
      const { preloadQuickDrawModel, createQuickDrawRecognizer } = await import(path);
      const points = Array.from({ length: 49 }, (_, i) => ({ x: .5 + .25 * Math.cos(i / 48 * Math.PI * 2), y: .5 + .25 * Math.sin(i / 48 * Math.PI * 2), t: i * 10 }));
      const strokes = [{ id: 'synthetic-only', points }];
      const load = performance.now(); await preloadQuickDrawModel(); const loadMs = performance.now() - load;
      const recognize = createQuickDrawRecognizer(), times = [], guesses = [];
      for (let i = 0; i < 12; i++) {
        const start = performance.now(); const result = await recognize.recognize({ requestId: 'timing:' + i, language: 'en', strokes });
        times.push(performance.now() - start); guesses.push(result.guess);
      }
      const warm = times.slice(2).sort((a, b) => a - b);
      return { loadMs, timesMs: times, warmMedianMs: (warm[4] + warm[5]) / 2, warmP90Ms: warm[8], guesses };
    }, module);
    assert(timing.guesses.every(guess => guess === 'circle')); receipt.measurements.push({ module, ...timing });
    await context.close();
  }
  receipt.warmMedianRatio = receipt.measurements[1].warmMedianMs / receipt.measurements[0].warmMedianMs;
  assert.deepEqual(receipt.external, []); assert.equal(receipt.posts, 0); receipt.status = 'pass';
  await mkdir('artifacts/release', { recursive: true });
} finally {
  await browser?.close(); server.kill(); for (const file of generatedFiles) await rm(file, { force: true });
  await writeFile('artifacts/release/v013-performance.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt));
}
