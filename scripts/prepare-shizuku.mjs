import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const folder = 'assets/source/shizuku-v02';
const output = 'public/art/shizuku';
await mkdir(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expressions = ['neutral', 'thinking', 'smile', 'shy', 'breath', 'curious', 'drawing', 'blink'];
const atlas = `${folder}/expression-atlas.png`;
const meta = await sharp(atlas).metadata();
if (!meta.hasAlpha) throw new Error('The character atlas must have real alpha.');
const files = [];
for (let index = 0; index < expressions.length; index++) {
  const col = index % 4, row = Math.floor(index / 4);
  const left = Math.round(col * meta.width / 4), top = Math.round(row * meta.height / 2);
  const rect = { left, top, width: Math.round((col + 1) * meta.width / 4) - left, height: Math.round((row + 1) * meta.height / 2) - top };
  const filename = `${output}/${expressions[index]}.webp`;
  // Shared cell dimensions and bottom-center anchor; no per-face trimming or rescaling.
  await sharp(atlas).extract(rect).webp({ quality: 94, alphaQuality: 100 }).toFile(filename);
  const bytes = await readFile(filename);
  files.push({ filename, expression: expressions[index], sourceRect: rect, width: rect.width, height: rect.height, sha256: hash(bytes), bytes: bytes.length });
}
const room = `${folder}/room-atlas.png`;
const roomMeta = await sharp(room).metadata();
for (const [index, mode] of ['day', 'night'].entries()) {
  const filename = `${output}/room-${mode}.webp`;
  const left = Math.round(index * roomMeta.width / 2);
  await sharp(room).extract({ left, top: 0, width: Math.round((index + 1) * roomMeta.width / 2) - left, height: roomMeta.height }).webp({ quality: 90 }).toFile(filename);
  const bytes = await readFile(filename);
  files.push({ filename, sha256: hash(bytes), bytes: bytes.length });
}
const supplied = [
  ['approved-neutral.png', '淡い色彩の少女とニットカーディガン.png'],
  ['expression-reference.png', '冬色少女表情与手势素材表.png'],
  ['pointing-reference.png', '窓に触れる少女のやさしいまなざし.png'],
  ['day-reference.png', 'ChatGPT 画像 2026年10月17日 19_16_29.png'],
  ['night-reference.png', 'ChatGPT 画像 2026年10月17日 19_16_39.png'],
];
// References are copied only on the initial, explicitly supplied-material import.
if (process.argv.includes('--import-references')) {
  for (const [name, original] of supplied) await copyFile(`C:/Users/hiro/Downloads/${original}`, `${folder}/${name}`);
}
const sources = [];
for (const name of ['expression-atlas.png', 'room-atlas.png', ...supplied.map(([name]) => name)]) {
  const filename = `${folder}/${name}`;
  sources.push({ filename, sha256: hash(await readFile(filename)) });
}
await writeFile('assets/shizuku-manifest.json', JSON.stringify({ character: 'Shizuku', version: '0.2', provider: 'OpenAI built-in ImageGen; user-supplied identity references', processing: 'Exact equal-grid extraction; one shared 384x512 bottom-center anchor; alpha preserved; WebP 94 character / 90 room. Same character textures for DAY/NIGHT; lighting in CSS.', sources, files }, null, 2) + '\n');
console.log(`Prepared ${files.length} Shizuku assets with source/output SHA-256 hashes.`);
