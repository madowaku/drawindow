import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sourcePath = 'src/data/shizuku-doodles/doodles.json';
const raw = await readFile(sourcePath, 'utf8');
const source = JSON.parse(raw);
const directory = 'public/art/doodles/shizuku';
await mkdir(directory, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const entries = [];
for (const doodle of source.doodles) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${source.width}" height="${source.height}" viewBox="0 0 ${source.width} ${source.height}" fill="none" stroke="#000" stroke-width="${source.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="title"><title id="title">${doodle.labelJa} / ${doodle.labelEn}</title>\n${doodle.strokes.map(stroke => `  <path d="${stroke.path}"/>`).join('\n')}\n</svg>\n`;
  const path = `${directory}/${doodle.key}.svg`;
  await writeFile(path, svg);
  entries.push({ key: doodle.key, adoptionBase: doodle.adoptionBase, path, sha256: hash(svg), strokes: doodle.strokes.length });
}
await writeFile('assets/shizuku-doodles-v01-manifest.json', JSON.stringify({
  version: source.version, source: sourcePath, sourceSha256: hash(raw),
  provenance: 'Original SVG paths authored for DRAWINDOW. No external art or generative image service used.',
  referenceStatus: 'B labels are user-requested style directions. Reference images are unavailable; these are new proposals, not reproductions.',
  adoptionStatus: 'Approved by user on 2026-10-18 for Japanese and English production. Existing uncovered vocabulary retained.',
  entries,
}, null, 2) + '\n');
console.log(`Exported ${entries.length} SVGs and provenance manifest.`);
