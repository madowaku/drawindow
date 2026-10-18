import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const root = 'assets/source/shizuku-expression-review';
const out = 'public/art/shizuku-expression-review';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = async filename => ({ filename, sha256: sha256(await readFile(filename)) });
await mkdir(out, { recursive: true });
await mkdir(`${root}/normalized`, { recursive: true });
const files = [];
for (const pose of ['thinking', 'curious', 'shy']) {
  const source = `${root}/${pose}.png`;
  const sourceBytes = await readFile(source);
  const meta = await sharp(sourceBytes).metadata();
  if (meta.width !== 1086 || meta.height !== 1448 || !meta.hasAlpha) throw Error(`Invalid native source ${source}`);
  // Manually measured eye-socket centers, not gaze-dependent pupil locations.
  // CURIOUS generated a ~8% larger face: one uniform scale and translation restores registration.
  const transform = pose === 'curious' ? { scale: .93, left: 74, top: 8 } : { scale: 1, left: 0, top: 0 };
  const foreground = await sharp(sourceBytes).resize(Math.round(1086 * transform.scale), Math.round(1448 * transform.scale)).png().toBuffer();
  const normalized = `${root}/normalized/${pose}.png`;
  const normalizedBytes = await sharp({ create: { width: 1086, height: 1448, channels: 4, background: '#00000000' } }).composite([{ input: foreground, left: transform.left, top: transform.top }]).png().toBuffer();
  await writeFile(normalized, normalizedBytes);
  const filename = `${out}/${pose}.webp`;
  const bytes = await sharp(normalizedBytes).resize(768, 1024).webp({ quality: 94, alphaQuality: 100 }).toBuffer();
  await writeFile(filename, bytes);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparentPixels = 0, softAlphaPixels = 0, nearlyOpaquePixels = 0, sideEdgePixels = 0;
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if ((x === 0 || x === info.width - 1) && alpha >= 16) sideEdgePixels++;
    if (!alpha) transparentPixels++; else if (alpha < 255) softAlphaPixels++;
    if (alpha >= 240) nearlyOpaquePixels++;
    if (alpha >= 16) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  if (transparentPixels < 768 * 1024 * .15 || !softAlphaPixels || nearlyOpaquePixels < 768 * 1024 * .4 || sideEdgePixels) throw Error(`Invalid alpha or side clipping ${pose}`);
  files.push({ pose, source, sourceSha256: sha256(sourceBytes), sourceWidth: meta.width, sourceHeight: meta.height, normalized, normalizedSha256: sha256(normalizedBytes), transform, filename, sha256: sha256(bytes), bytes: bytes.length, width: 768, height: 1024, transparentPixels, softAlphaPixels, nearlyOpaquePixels, sideEdgePixels, alpha16Bounds: [minX, minY, maxX, maxY], anchor: { x: .502, y: .312 }, renderScale: 1.28 });
}
const inputs = await Promise.all((await readdir(`${root}/inputs`)).map(name => receipt(`${root}/inputs/${name}`)));
inputs.push(await receipt('assets/source/shizuku-v04/canonical-neutral.png'), await receipt('docs/shizuku-expression-final-v05-prompts.json'));
const preserved = [];
for (const filename of ['assets/shizuku-manifest.json', 'assets/shizuku-v04-manifest.json']) {
  const manifest = JSON.parse(await readFile(filename, 'utf8'));
  for (const file of [...manifest.sources, ...manifest.files]) {
    if (sha256(await readFile(file.filename)) !== file.sha256) throw Error(`Original changed: ${file.filename}`);
  }
  preserved.push({ ...await receipt(filename), verifiedEntries: manifest.sources.length + manifest.files.length });
}
await writeFile('assets/shizuku-expression-final-v05-manifest.json', JSON.stringify({ version: '0.5-final-review', status: 'UNAPPROVED; opt-in character preview only; no production promotion', provider: 'OpenAI built-in ImageGen', provenance: 'Two identity-preserving edits; SHY v0.1 reused without regeneration. Existing project original character only, no new third-party assets or license assignment.', processing: 'Native PNG bytes preserved. Normalized PNG uses uniform scaling/translation only; no alpha removal, stretching, recoloring or facial fabrication. CURIOUS .93 scale offsets a measured generated face-size drift. All WebPs 768x1024 quality94 alphaQuality100; same anchor .502/.312 and renderScale1.28. DAY/NIGHT share bytes.', registration: { method: 'Manual eye-socket midpoint and inter-eye distance; preserve gaze direction rather than recentering pupils', canonicalApprox: { midpoint: [545, 451], distance: 192 }, curiousBeforeApprox: { midpoint: [507, 476], distance: 207 }, curiousAfterApprox: { midpoint: [545.5, 450.7], distance: 192.5 }, tolerance: 'Manual estimate, approximately 4 native px; no claim of subpixel anatomical identity' }, preserved, inputs, files }, null, 2) + '\n');
console.log(JSON.stringify(files.map(({ pose, bytes, alpha16Bounds }) => ({ pose, bytes, alpha16Bounds }))));
