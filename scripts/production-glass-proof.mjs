import assert from 'node:assert/strict';

export const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
export const fogImage = page => page.locator('.play-layout .window-canvas__fog').evaluate(canvas => canvas.toDataURL());

/** Inspect the real production canvases, without replacing rendering functions. */
export async function glassProof(page, language, mode, prefix) {
  const canvas = page.getByTestId('window-drawing-canvas');
  await canvas.scrollIntoViewIfNeeded(); await settle(page);
  const blank = await fogImage(page);
  await page.locator('.window-surface').screenshot({ path: `${prefix}-blank.png` });
  const eye = await page.evaluate(() => {
    const portrait = document.querySelector('.play-layout .character-scene__portrait').getBoundingClientRect();
    const drawing = document.querySelector('.window-canvas__drawing').getBoundingClientRect();
    return Math.max(.05, Math.min(.65, (portrait.top + portrait.height * .392 - drawing.top) / drawing.height));
  });
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * eye);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * eye, { steps: 30 });
  await page.mouse.up(); await settle(page);
  const metrics = await page.evaluate(eye => {
    const fog = document.querySelector('.window-canvas__fog'), wet = document.querySelector('.window-canvas__drawing');
    const f = fog.getBoundingClientRect(), w = wet.getBoundingClientRect();
    const at = (canvas, x, y) => canvas.getContext('2d').getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3];
    return {
      centerFogAlpha: at(fog, (w.left + w.width * .5 - f.left) * fog.width / f.width, (w.top + w.height * eye - f.top) * fog.height / f.height),
      centerWetAlpha: at(wet, wet.width * .5, wet.height * eye),
      outsideFogAlpha: at(fog, fog.width * .06, fog.height * .9),
    };
  }, eye);
  assert.equal(metrics.centerFogAlpha, 0, 'Stroke center must reveal the room/portrait');
  assert.equal(metrics.centerWetAlpha, 0, 'Wet edge must not cover the clear center');
  assert(metrics.outsideFogAlpha > 0 && metrics.outsideFogAlpha < 255);
  if (mode === 'night') assert(metrics.outsideFogAlpha >= 190 && metrics.outsideFogAlpha < 220, 'Keep adopted 75% mist plus haze');
  const wiped = await fogImage(page);
  await page.locator('.window-surface').screenshot({ path: `${prefix}-face-stroke.png` });
  await page.locator('.clear-tool').click(); await settle(page);
  assert.equal(await fogImage(page), blank, 'CLEAR must restore exact fog');
  await page.getByRole('button', { name: language === 'ja' ? '元に戻す' : 'Undo last edit', exact: true }).click(); await settle(page);
  assert.equal(await fogImage(page), wiped, 'UNDO must restore exact opening');
  await page.getByRole('button', { name: language === 'ja' ? 'やり直す' : 'Redo last edit', exact: true }).click(); await settle(page);
  assert.equal(await fogImage(page), blank, 'REDO must restore exact fog');
  return { ...metrics, clearUndoRedoExact: true };
}
