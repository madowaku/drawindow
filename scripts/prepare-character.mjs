import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const source = process.argv[2];
if (!source) throw new Error('Pass the inspected ImageGen atlas path.');
await mkdir('assets/source', { recursive: true });
await mkdir('public/art', { recursive: true });
await copyFile(source, 'assets/source/character-atlas.png');
const { width, height } = await sharp(source).metadata();
const roster = [];
for (const [row, mode] of ['day', 'night'].entries()) {
  for (const [col, expression] of ['neutral', 'thinking', 'smiling'].entries()) {
    const left = Math.round(col * width / 3);
    const top = Math.round(row * height / 2);
    const filename = `public/art/${mode}-${expression}.webp`;
    await sharp(source).extract({ left, top, width: Math.round((col + 1) * width / 3) - left, height: Math.round((row + 1) * height / 2) - top }).webp({ quality: 91 }).toFile(filename);
    const bytes = await readFile(filename);
    roster.push({ filename, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  }
}
await writeFile('assets/character-manifest.json', JSON.stringify({ provider: 'OpenAI built-in ImageGen', source: 'assets/source/character-atlas.png', sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'), processing: 'Exact equal-grid extraction, WebP quality 91; no retouching', files: roster }, null, 2));
console.log(JSON.stringify(roster, null, 2));
