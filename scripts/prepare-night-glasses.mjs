import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Packaging only: preserve the generated alpha and uniformly fit the existing canvas.
const original = JSON.parse(await readFile('assets/shizuku-night-manifest.json', 'utf8'));
const folder = 'public/art/shizuku-night-glasses';
await mkdir(folder, { recursive: true });
const files = [];
for (const item of original.files) {
  const source = `assets/source/shizuku-night-glasses/${item.pose}.png`;
  const filename = `${folder}/${item.pose}.webp`;
  await sharp(source).resize(384, 512, { fit: 'contain', background: '#00000000' })
    .webp({ quality: 94, alphaQuality: 100 }).toFile(filename);
  const bytes = await readFile(filename);
  const meta = await sharp(bytes).metadata();
  files.push({ pose: item.pose, filename, source, sha256: createHash('sha256').update(bytes).digest('hex'),
    width: meta.width, height: meta.height, bytes: bytes.length, anchor: item.anchor });
}
await writeFile('assets/shizuku-night-glasses-manifest.json', JSON.stringify({
  status: 'Formal candidate; human adoption review pending',
  provider: 'OpenAI built-in image_gen',
  processing: 'Uniform fit to 384x512 transparent canvas; WebP quality94 alphaQuality100. Original pajama assets retained.',
  files,
}, null, 2) + '\n');
