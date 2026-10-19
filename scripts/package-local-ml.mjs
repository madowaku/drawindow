import { spawnSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';

// TEST-ONLY archive: local inference, normal static hosting. Not an installable
// airplane-mode PWA; cannot be advertised as a fully offline commercial build.
const typecheck = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], {stdio:'inherit'});
if (typecheck.error) throw typecheck.error;
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1);
const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_ENABLE_LOCAL_RECOGNITION: 'false', VITE_ENABLE_LOCAL_ML: 'true', VITE_ENABLE_LIVE_API: 'false', VITE_RECOGNITION_URL: '' },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

// The SHA-verified original is used only to generate the batch-1 static copy.
// Do not double the sold game's download size by shipping both model variants.
await rm('dist/local-ml/quickdraw_model.tflite', {force:true});
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
if (!files['index.html']) throw new Error('Build lacks root index');
for (const name of Object.keys(files)) {
  if (/secret|\.env|\.dev\.vars/i.test(name)) throw new Error(`Unexpected secret file: ${name}`);
}
const zip = zipSync(files, {level: 6});
const unpacked = unzipSync(zip);
for (const [name, bytes] of Object.entries(files)) {
  if (!unpacked[name] || !Buffer.from(unpacked[name]).equals(Buffer.from(bytes))) throw new Error(`Archive mismatch: ${name}`);
}
const filename = 'DRAWINDOW-v0.8-quickdraw345-ml-lab.zip';
await mkdir('artifacts/release', {recursive: true});
await writeFile(`artifacts/release/${filename}`, zip);
const receipt = {
  filename, sha256: createHash('sha256').update(zip).digest('hex'),
  bytes: zip.length, entries: Object.keys(files).length, extractedByteParity: true,
  scope: 'LOCAL ML only: bundled pretrained QuickDraw 345 and WASM; offline inference on device but not installed PWA/approved release',
};
await writeFile('artifacts/release/local-ml-receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
