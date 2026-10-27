import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import sharp from 'sharp';
import { chromium } from 'playwright';

const base = process.env.DRAWINDOW_QA_URL || 'http://127.0.0.1:5175/';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const folder = process.env.DRAWINDOW_QA_OUTPUT || 'artifacts/qa/night-v091';
await mkdir(folder, { recursive: true });
// Load A from its actual owning commit, rather than approximating its rendering.
const original = execFileSync('git', ['show', '02c56c0:src/lib/glass.ts'], { encoding: 'utf8' });
const baseline = stripTypeScriptTypes(original.replace("'./strokes'", JSON.stringify(new URL('/src/lib/strokes.ts', base).href)));
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? { executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE } : {}) });
const report = { scope: 'Same live game scene and synthetic pointer strokes, A from 02c56c0 versus production B. Not human play.', baselineCommit: '02c56c0', baselineSourceSha256: createHash('sha256').update(original).digest('hex'), cases: [], errors: [] };
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function sheet(items, output, columns = 2, width = 460) {
  const prepared = await Promise.all(items.map(async ({ path, label }) => {
    const data = await sharp(path).resize({ width }).png().toBuffer();
    const { height } = await sharp(data).metadata();
    return { data, height, label };
  }));
  const cellHeight = Math.max(...prepared.map(p => p.height)) + 32;
  const layers = prepared.flatMap((p, i) => {
    const left = (i % columns) * width, top = Math.floor(i / columns) * cellHeight;
    return [
      { input: Buffer.from(`<svg width="${width}" height="32"><text x="12" y="23" fill="white" font-family="Arial" font-size="16">${p.label}</text></svg>`), left, top },
      { input: p.data, left, top: top + 32 },
    ];
  });
  await sharp({ create: { width: width * columns, height: cellHeight * Math.ceil(items.length / columns), channels: 3, background: '#18262f' } }).composite(layers).png().toFile(output);
}
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'NIGHT', exact: true }).click();
    await page.locator('.title-art img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    const titleA = await page.locator('.title-art').screenshot({ path: `${folder}/${width}-A-title.png` });
    const titleB = await page.locator('.title-art').screenshot({ path: `${folder}/${width}-B-title.png` });
    assert(titleA.equals(titleB), 'A/B title must be identical');
    await page.getByRole('button', { name: 'PLAY DEMO', exact: true }).click();
    await page.getByRole('button', { name: 'YOUR TURN', exact: true }).click();
    const canvas = page.getByTestId('window-drawing-canvas');
    const clear = page.locator('.clear-tool');
    const undo = page.getByRole('button', { name: 'Undo last edit', exact: true });
    const redo = page.getByRole('button', { name: 'Redo last edit', exact: true });
    async function stroke(points) {
      await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
      await page.mouse.move(box.x + points[0][0] * box.width, box.y + points[0][1] * box.height); await page.mouse.down();
      for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
      await page.mouse.up(); await page.mouse.move(2, 2); await settle(page);
    }
    // Stabilize the existing first-save feedback before comparing canvas pixels.
    await stroke([[.2, .5], [.8, .5]]); await clear.click(); await page.waitForTimeout(400);
    await page.evaluate(async source => {
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const a = await import(url); URL.revokeObjectURL(url);
      const b = await import('/src/lib/glass.ts');
      const drawing = await import('/src/lib/strokes.ts');
      window.nightStudy = { a, b, drawing };
    }, baseline);
    const eye = await page.evaluate(() => {
      const portrait = document.querySelector('.window-canvas .character-scene__portrait').getBoundingClientRect();
      const drawing = document.querySelector('.window-canvas__drawing').getBoundingClientRect();
      return Math.max(.05, Math.min(.65, (portrait.top + portrait.height * .392 - drawing.top) / drawing.height));
    });
    const faceLine = Array.from({ length: 31 }, (_, i) => [.2 + i / 30 * .6, eye]);
    const centerY = Math.max(.25, Math.min(.68, eye + .1));
    const crescent = [
      ...Array.from({ length: 45 }, (_, i) => { const t = -Math.PI / 2 + i / 44 * Math.PI; return [.42 + .24 * Math.cos(t), centerY + .22 * Math.sin(t)]; }),
      ...Array.from({ length: 45 }, (_, i) => { const t = Math.PI / 2 - i / 44 * Math.PI; return [.42 + .11 * Math.cos(t), centerY + .22 * Math.sin(t)]; }),
    ];
    const cases = { blank: [], 'face-line': [faceLine], crescent: [crescent], multiple: [faceLine, crescent, [[.24, Math.min(.9, eye + .32)], [.72, Math.min(.9, eye + .47)]]] };
    const shots = [];
    for (const [name, lines] of Object.entries(cases)) {
      if (await clear.isEnabled()) await clear.click();
      for (const points of lines) await stroke(points);
      if (lines.length) assert(await clear.isEnabled(), `${width} ${name}: pointer input must create real strokes`);
      await page.waitForTimeout(450);
      await page.waitForFunction(count => new Promise(resolve => {
        const req = indexedDB.open('drawindow-session', 1);
        req.onsuccess = () => { const db = req.result; const r = db.transaction('sessions').objectStore('sessions').get('current'); r.onsuccess = () => { db.close(); resolve(r.result?.state.activeStrokes.length === count); }; };
      }), lines.length);
      const metrics = await page.evaluate(async () => {
        const req = indexedDB.open('drawindow-session', 1);
        const strokes = await new Promise(resolve => { req.onsuccess = () => { const db = req.result; const r = db.transaction('sessions').objectStore('sessions').get('current'); r.onsuccess = () => { db.close(); resolve(r.result.state.activeStrokes); }; }; });
        const c = document.querySelector('.window-canvas__drawing'), fog = document.querySelector('.window-canvas__fog');
        const size = c.getBoundingClientRect().width, dpr = c.width / size;
        const { a, b, drawing } = window.nightStudy;
        const exported = drawing.renderDrawingDataUrl(strokes);
        const layer = (fn, mode) => { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const ctx = t.getContext('2d'); ctx.scale(dpr, dpr); fn(ctx, strokes, size, mode); return t; };
        const alphaMass = t => { const px = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; let mass = 0; for (let i = 3; i < px.length; i += 4) mass += px[i]; return mass; };
        const old = layer(a.drawWetEdges, 'night'), soft = layer(b.drawWetEdges, 'night');
        window.nightStudy.layers = { A: old.toDataURL(), B: soft.toDataURL(), reveal: layer(() => {}, 'night').toDataURL() };
        window.nightStudy.paint = async variant => { const image = new Image(); image.src = window.nightStudy.layers[variant]; await image.decode(); const ctx = c.getContext('2d'); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(image, 0, 0); ctx.restore(); };
        const blank = document.createElement('canvas'); blank.width = blank.height = 360; const ctx = blank.getContext('2d');
        ctx.fillStyle = '#9cb5d3'; ctx.fillRect(0, 0, 360, 360); const initial = blank.toDataURL();
        a.wipeCondensation(ctx, strokes, 360, 'night'); const wipedA = blank.toDataURL(); ctx.clearRect(0, 0, 360, 360);ctx.fillRect(0, 0, 360, 360); b.wipeCondensation(ctx, strokes, 360, 'night');
        return { strokes: strokes.length, aRimAlphaMass: alphaMass(old), bRimAlphaMass: alphaMass(soft), dayExact: layer(a.drawWetEdges, 'day').toDataURL() === layer(b.drawWetEdges, 'day').toDataURL(), openingExact: wipedA === blank.toDataURL(), exportExact: exported === drawing.renderDrawingDataUrl(strokes), fog: fog.toDataURL() };
      });
      assert(metrics.dayExact && metrics.openingExact && metrics.exportExact);
      const fogBefore = metrics.fog; delete metrics.fog;
      const images = {};
      for (const variant of ['A', 'B', 'reveal']) {
        await page.evaluate(v => window.nightStudy.paint(v), variant); await settle(page);
        const path = `${folder}/${width}-${variant}-${name}.png`;
        images[variant] = await page.locator('.window-surface').screenshot({ path });
        if (variant !== 'reveal') shots.push({ path, label: `${variant} / ${name}` });
        assert.equal(await page.locator('.window-canvas__fog').evaluate(c => c.toDataURL()), fogBefore);
        if (name === 'crescent') {
          const layer = await canvas.evaluate(c => c.toDataURL().split(',')[1]);
          await writeFile(`${folder}/${width}-${variant}-wet-layer.png`, Buffer.from(layer, 'base64'));
        }
      }
      if (name === 'blank') assert(images.A.equals(images.B));
      await page.evaluate(() => window.nightStudy.paint('B'));
      if (lines.length) {
        await clear.click(); await settle(page);
        const blank = await page.locator('.window-canvas__fog').evaluate(c => c.toDataURL());
        await undo.click(); await settle(page); assert.equal(await page.locator('.window-canvas__fog').evaluate(c => c.toDataURL()), fogBefore);
        await redo.click(); await settle(page); assert.equal(await page.locator('.window-canvas__fog').evaluate(c => c.toDataURL()), blank);
      }
      report.cases.push({ width, name, ...metrics, rimAlphaReduction: metrics.aRimAlphaMass ? 1 - metrics.bRimAlphaMass / metrics.aRimAlphaMass : 0, fogUnchanged: true, clearUndoRedo: true });
    }
    await sheet(shots, `${folder}/${width}-AB.png`);
    await sheet(['A', 'B', 'reveal'].map(v => ({ path: `${folder}/${width}-${v}-crescent.png`, label: `${v} / crescent` })), `${folder}/${width}-layers.png`, 3, 360);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} finally { await browser.close(); await writeFile(`${folder}/visual-report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report));
