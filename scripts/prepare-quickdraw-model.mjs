import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { staticBatchOne } from './static-batch-quickdraw.mjs';

const REVISION = 'b02fde8d8732aed32bc9d8176c3dc4efda0333fb';
const BASE = 'https://huggingface.co/zarqankhn/quickdraw-345-tflite/resolve/' + REVISION;
const MODEL_SHA256 = '22bb3d3c131aeeee551a1880930910e2ebff8efad8d5cd0c942c97c2dee0993c';
const OUT = 'public/local-ml';
const MAX_SIZE = 15 * 1024 * 1024;

async function download(name, expectedHash) {
  const dest = join(OUT, name);
  try {
    const existing = await readFile(dest);
    if ((!expectedHash || createHash('sha256').update(existing).digest('hex') === expectedHash) &&
        existing.length > 0 && existing.length < MAX_SIZE) return existing;
  } catch { /* Download if absent. */ }
  console.log('Preparing model asset:', name);
  const response = await fetch(BASE + '/' + name, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_SIZE) throw new Error('Unexpected model asset size: ' + name);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (expectedHash && hash !== expectedHash) throw new Error('Model SHA256 mismatch: ' + name);
  await writeFile(dest, bytes);
  return bytes;
}

await mkdir(OUT, {recursive:true});
const model = await download('quickdraw_model.tflite', MODEL_SHA256);
const staticCopy = staticBatchOne(model);
await writeFile(join(OUT,'quickdraw_model_static.tflite'), staticCopy.bytes);
const labelsBytes = await download('labels.txt');
const labels = labelsBytes.toString('utf8').trim().split(/\r?\n/);
if (labels.length !== 345 || !['apple','bat','cat','dog','fish','t-shirt'].every(x=>labels.includes(x)))
  throw new Error('Unexpected 345-class label manifest');
const metadata = {
  source: BASE, revision: REVISION, modelSha256: MODEL_SHA256,
  staticBatchModelSha256: createHash('sha256').update(staticCopy.bytes).digest('hex'),
  patchNote: 'Only TFLite flatbuffer batch-shape signatures -1 to 1; all learned weights unchanged.',
  labelsSha256: createHash('sha256').update(labelsBytes).digest('hex'),
  classes: labels.length, bytes: model.length, engine: '@litertjs/core@2.5.3',
  license: 'Model weights: Apache-2.0; QuickDraw data: CC BY 4.0. See documentation and licenses before redistribution.',
};
await writeFile(join(OUT,'asset-receipt.json'), JSON.stringify(metadata,null,2));
await cp('node_modules/@litertjs/core/wasm',join(OUT,'wasm'),{recursive:true,force:true});
console.log('Local ML assets ready; no network needed by runtime.',metadata.bytes,'bytes');
