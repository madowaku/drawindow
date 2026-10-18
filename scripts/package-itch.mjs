import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';

const root = 'dist';
const files = {};
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files[relative(root, path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path));
  }
}
await walk(root);
if (!files['index.html']) throw new Error('Run npm run build first; root index.html is required.');
const archive = zipSync(files, { level: 6 });
const restored = unzipSync(archive);
for (const [name, bytes] of Object.entries(files)) {
  if (!restored[name] || !Buffer.from(restored[name]).equals(Buffer.from(bytes))) throw new Error(`Archive mismatch: ${name}`);
  if (/secret|\.env|\.dev\.vars/i.test(name)) throw new Error(`Unexpected config in archive: ${name}`);
}
await mkdir('artifacts/release', { recursive: true });
const version = JSON.parse(await readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.');
const filename = `DRAWINDOW-v${version}-itch.zip`;
await writeFile(`artifacts/release/${filename}`, archive);
const receipt = { filename, sha256: createHash('sha256').update(archive).digest('hex'), bytes: archive.length, entries: Object.keys(restored).length, rootIndex: true, extractedByteParity: true, scope: 'Static frontend; default DEMO. No deployed API or live benchmark claimed.' };
await writeFile('artifacts/release/package-receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
