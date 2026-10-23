import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sourcePath = 'src/data/shizuku-doodles/doodles.json';
const raw = await readFile(sourcePath, 'utf8');
const source = JSON.parse(raw);
const expansionPath = 'src/data/shizuku-doodles/expansion-20261022.json';
const expansionRaw = await readFile(expansionPath, 'utf8');
const expansion = JSON.parse(expansionRaw);
const expansionBPath = 'src/data/shizuku-doodles/expansion-20261022-b.json';
const expansionBRaw = await readFile(expansionBPath, 'utf8');
const expansionB = JSON.parse(expansionBRaw);
const expansionCPath = 'src/data/shizuku-doodles/expansion-20261022-c.json';
const expansionCRaw = await readFile(expansionCPath, 'utf8');
const expansionC = JSON.parse(expansionCRaw);
const expansionDPath = 'src/data/shizuku-doodles/expansion-20261022-d.json';
const expansionDRaw = await readFile(expansionDPath, 'utf8');
const expansionD = JSON.parse(expansionDRaw);
const expansionEPath = 'src/data/shizuku-doodles/expansion-20261022-e.json';
const expansionERaw = await readFile(expansionEPath, 'utf8');
const expansionE = JSON.parse(expansionERaw);
const newSources = await Promise.all(["food", "home", "tools", "nature", "clothes", "animals", "travel"].map(async category => {
  const path = `src/data/shizuku-doodles/expansion-20261023-${category}.json`;
  const raw = await readFile(path, 'utf8');
  return { path, raw, data: JSON.parse(raw) };
}));
const directory = 'public/art/doodles/shizuku';
await mkdir(directory, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const entries = [];
for (const doodle of [...source.doodles, ...expansion.doodles, ...expansionB.doodles, ...expansionC.doodles, ...expansionD.doodles, ...expansionE.doodles, ...newSources.flatMap(s => s.data.doodles)]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${source.width}" height="${source.height}" viewBox="0 0 ${source.width} ${source.height}" fill="none" stroke="#000" stroke-width="${source.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="title"><title id="title">${doodle.labelJa} / ${doodle.labelEn}</title>\n${doodle.strokes.map(stroke => `  <path d="${stroke.path}"/>`).join('\n')}\n</svg>\n`;
  const path = `${directory}/${doodle.key}.svg`;
  await writeFile(path, svg);
  entries.push({ key: doodle.key, adoptionBase: doodle.adoptionBase, path, sha256: hash(svg), strokes: doodle.strokes.length });
}
await writeFile('assets/shizuku-doodles-v01-manifest.json', JSON.stringify({
  version: source.version, source: sourcePath, sourceSha256: hash(raw),
  provenance: 'Original SVG paths authored for DRAWINDOW. No external art or generative image service used.',
  referenceStatus: 'B labels are user-requested style directions. Reference images are unavailable; these are new proposals, not reproductions.',
  adoptionStatus: 'Original 67 approved on 2026-10-18. Five batches of 13 added locally at user request on 2026-10-22; human readability and LIVE recognition unverified. Existing uncovered vocabulary retained.',
  expansionSource: expansionPath, expansionSha256: hash(expansionRaw),
  expansionBSource: expansionBPath, expansionBSha256: hash(expansionBRaw),
  expansionCSource: expansionCPath, expansionCSha256: hash(expansionCRaw),
  expansionDSource: expansionDPath, expansionDSha256: hash(expansionDRaw),
  expansionESource: expansionEPath, expansionESha256: hash(expansionERaw),
  expansion300Sources: newSources.map(s => ({ path: s.path, sha256: hash(s.raw), count: s.data.doodles.length })),
  expansion300Status: '159 original stroke drawings retained after user review on 2026-10-23 (nine removed, two redrawn, four renamed); human readability and LIVE recognition unverified.',
  entries,
}, null, 2) + '\n');
console.log(`Exported ${entries.length} SVGs and provenance manifest.`);
