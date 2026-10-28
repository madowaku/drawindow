import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Refuse a stale preview on an occupied port and record the tested distribution.
export async function productionServer(port) {
  const receipt = JSON.parse(await readFile('artifacts/release/offline-assets-receipt.json', 'utf8'));
  const origin = `http://127.0.0.1:${port}/`;
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
  let logs = '', spawnError;
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { logs = (logs + data).slice(-8000); });
  server.on('error', error => { spawnError = error; });
  try {
    for (let i = 0; i < 150; i++) {
      if (spawnError) throw spawnError;
      if (server.exitCode !== null) throw Error('Preview stopped: ' + logs);
      if (logs.includes(origin.slice(0, -1))) {
        const response = await fetch(origin);
        assert((await response.text()).includes(receipt.fingerprint), 'Wrong production fingerprint');
        return { origin, receipt, close: () => server.kill() };
      }
      await delay(100);
    }
    throw Error('Preview never became ready: ' + logs);
  } catch (error) { server.kill(); throw error; }
}

export function watchContext(context, origin, result) {
  context.on('request', request => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) result.external.push(url);
    if (request.method() === 'POST') result.posts++;
  });
  const watch = page => page.on('pageerror', error => result.errors.push(String(error)));
  context.pages().forEach(watch);
  context.on('page', watch);
}

export async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('drawindow-session', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction('sessions').objectStore('sessions').get('current');
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }));
}

export async function waitSnapshot(page, predicate) {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    const value = await snapshot(page);
    if (value && predicate(value)) return value;
    await delay(100);
  }
  throw Error('Saved checkpoint not reached');
}

export async function drawCircle(page) {
  const canvas = page.getByTestId('window-drawing-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  for (let i = 0; i <= 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    await page.mouse.move(box.x + box.width * (.5 + .24 * Math.cos(angle)), box.y + box.height * (.5 + .24 * Math.sin(angle)));
    if (!i) await page.mouse.down();
  }
  await page.mouse.up();
}
