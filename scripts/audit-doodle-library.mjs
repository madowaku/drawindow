import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Local data audit only. No browser, credentials, recognition calls or downloads.
const server = await createServer({ configFile: false, envDir: false, cacheDir: '.wrangler/doodle-audit-vite', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
const sha256 = value => createHash('sha256').update(value).digest('hex');
try {
  const { doodleCandidates, doodleLibrary } = await server.ssrLoadModule('/src/data/doodleLibrary.ts');
  const { legacyGirlSketches } = await server.ssrLoadModule('/src/data/legacySketches.ts');
  const { selectGirlSketch } = await server.ssrLoadModule('/src/core/words.ts');
  const ratings = ['safe', 'soft', 'spicy', 'reject'];
  const manifest = {
    version: 'Shizuku Doodle Library v0.1', date: '2026-10-18',
    evidence: 'Maker review and automated geometry/selection audit only. No new blind human observations.',
    total: doodleCandidates.length, previousProductionCandidates: legacyGirlSketches.length,
    newlyAuthored: doodleCandidates.filter(candidate => candidate.id.startsWith('shizuku-')).length,
    integratedExistingReview: 1,
    ratings: Object.fromEntries(ratings.map(rating => [rating, doodleCandidates.filter(candidate => candidate.readability === rating).length])),
    originalGeometryPreserved: legacyGirlSketches.every(legacy => JSON.stringify(legacy.strokes) === JSON.stringify(doodleCandidates.find(candidate => candidate.id === legacy.id)?.strokes)),
    letters: Object.fromEntries(Object.entries(doodleLibrary).map(([letter, candidates]) => [letter, { count: candidates.length, default: selectGirlSketch(doodleCandidates, letter)?.id, safe: candidates.filter(candidate => candidate.readability === 'safe').length }])),
    sources: Object.fromEntries(await Promise.all(['src/data/doodleLibrary.ts', 'src/data/originalDoodles.ts', 'src/data/legacySketches.ts', 'src/data/owlReview.ts', 'src/data/quick-draw-sketches.json', 'src/data/sketch-provenance.json'].map(async path => [path, sha256(await readFile(path))]))),
    candidates: doodleCandidates.map(({ id, letter, word, source, readability, reviewNote, durationMs, strokes }) => ({ id, letter, word, source, readability, reviewNote, durationMs, strokeCount: strokes.length, strokeSha256: sha256(JSON.stringify(strokes)) })),
  };
  if (!manifest.originalGeometryPreserved || Object.values(manifest.letters).some(letter => letter.count < 2 || !letter.default)) throw new Error('Library coverage/preservation audit failed');
  await mkdir('assets', { recursive: true });
  await writeFile('assets/doodle-library-v01-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ total: manifest.total, newlyAuthored: manifest.newlyAuthored, ratings: manifest.ratings, originalGeometryPreserved: manifest.originalGeometryPreserved }));
} finally { await server.close(); }
