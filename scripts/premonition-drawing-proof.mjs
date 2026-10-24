import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

/** Observe actual live animation, without changing its clock or reducer. */
export async function observeLiveDrawing(page) {
  await page.locator('.play-layout .window-canvas').scrollIntoViewIfNeeded();
  const samples = await page.evaluate(() => new Promise((resolve, reject) => {
    const started = performance.now(), samples = [];
    function tick() {
      const app = document.querySelector('.app'), root = app?.querySelector('.play-layout .window-canvas');
      const canvas = root?.querySelector('.window-canvas__drawing');
      if (!canvas) return reject(Error('Missing live canvas'));
      const tip = root.querySelector('.stroke-tip-overlay');
      const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 3; i < bytes.length; i += 4) if (bytes[i]) ink++;
      samples.push({ phase: app.dataset.phase, ink, tip: tip ? [tip.style.left, tip.style.top] : null, pose: root.querySelector('.character-scene')?.dataset.pose });
      if (app.dataset.phase === 'girl_holding') return resolve(samples);
      if (performance.now() - started > 20000) return reject(Error('Live drawing never completed'));
      requestAnimationFrame(tick);
    }
    tick();
  }));
  const drawing = samples.filter(s => s.phase === 'girl_drawing');
  const moving = drawing.filter(s => s.tip && s.ink > 0);
  assert(drawing.some(s => s.ink === 0 && !s.tip && s.pose === 'thinking'), 'Missing original hesitation');
  assert(moving.length >= 2, 'Live picture appeared completed without finger traversal');
  assert(new Set(moving.map(s => s.tip.join(','))).size > 1, 'Live finger did not move');
  assert(moving[0].ink < samples.at(-1).ink, 'Live ink was already complete at first contact');
  assert.equal(samples.at(-1).tip, null);
  return { phases: [...new Set(samples.map(s => s.phase))], empty: drawing.find(s => !s.ink), first: moving[0], moved: moving.at(-1), complete: samples.at(-1) };
}

/** Pixel + fingertip comparison of both read-only canvases at an exact seek. */
export async function replayDrawingProof(page, language, mode, recording) {
  const phases = await page.evaluate(async (recording) => {
    const { createReplayTimeline } = await import('/src/dev/premonition/timeline.ts');
    // The fixture is the actual, explicitly exported trace of this playthrough.
    return createReplayTimeline(recording).map(f => ({ at: f.playAt, duration: f.durationMs, phase: f.state.phase }));
  }, recording);
  const slider = page.getByRole('slider', { name: '再生位置' });
  const snapshot = () => page.locator('.premonition-replay-window').evaluateAll(roots => roots.map(root => {
      const canvas = root.querySelector('.window-canvas__drawing');
      const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0, hash = 2166136261;
      for (let i = 0; i < bytes.length; i++) { hash = Math.imul(hash ^ bytes[i], 16777619); if (i % 4 === 3 && bytes[i]) ink++; }
      const tip = root.querySelector('.stroke-tip-overlay');
      return { phase: root.dataset.phase, ink, hash, tip: tip ? [tip.style.left, tip.style.top] : null };
    }));
  async function seek(at) {
    await slider.evaluate((element, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }, String(Math.ceil(at / 10) * 10));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return snapshot();
  }
  const proof = [];
  for (const [index, phase] of phases.entries()) {
    if (phase.phase !== 'girl_drawing' || !phases[index + 1]) continue;
    const empty = await seek(phase.at + phase.duration * .05);
    assert.equal(empty[0].ink, 0); assert.equal(empty[0].tip, null); assert.deepEqual(empty[0], empty[1]);
    const contacts = [];
    for (const portion of [.25, .35, .45, .55, .65, .75, .85]) {
      const panes = await seek(phase.at + phase.duration * portion);
      assert.deepEqual(panes[0], panes[1], 'A/D ink or finger clock diverged');
      if (panes[0].tip) contacts.push({ at: phase.at + phase.duration * portion, ...panes[0] });
    }
    assert(contacts.length >= 2 && new Set(contacts.map(c => c.tip.join(','))).size > 1, 'Replay finger never traversed the path');
    const complete = await seek(phases[index + 1].at);
    assert.deepEqual(complete[0], complete[1]); assert.equal(complete[0].tip, null);
    assert(complete[0].ink > contacts[0].ink, 'Replay was a static finished picture');
    if (!proof.length) {
      for (const [name, at] of [['start', phase.at + phase.duration * .05], ['middle', contacts[0].at], ['complete', phases[index + 1].at]]) {
        await seek(at); await page.locator('.premonition-replay').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/release/offline-premonition-${language}-${mode}-drawing-${name}.png` });
      }
    }
    proof.push({ empty: empty[0], first: contacts[0], moved: contacts.at(-1), complete: complete[0] });
  }
  assert(proof.length >= 5, 'Not all five girl drawings replayed');
  // Frozen seeks survive real elapsed time: no private per-pane RAF advances them.
  const first = phases.find(f => f.phase === 'girl_drawing');
  const paused = await seek(first.at + first.duration * .45);
  await page.waitForTimeout(180);
  assert.deepEqual(await snapshot(), paused);
  await page.getByRole('button',{name:'記録を再生',exact:true}).click();
  await page.waitForTimeout(160);
  await page.getByRole('button',{name:'再生を止める',exact:true}).click();
  const advanced=await snapshot();assert.notEqual(advanced[0].hash,paused[0].hash,'Replay did not draw during automatic play');assert.deepEqual(advanced[0],advanced[1]);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.premonition-replay button')].some(button=>button.textContent==='記録を再生'&&button.disabled));
  assert(await page.getByRole('button',{name:'記録を再生',exact:true}).isDisabled());
  const reduced=await seek(first.at+first.duration*.45);assert.equal(reduced[0].tip,null);assert.deepEqual(reduced[0],reduced[1]);assert(reduced[0].ink>paused[0].ink);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await writeFile(`artifacts/release/offline-premonition-${language}-${mode}-drawing.json`, JSON.stringify(proof, null, 2));
  return proof.length;
}
