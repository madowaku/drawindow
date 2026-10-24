import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Read-only inventory, no installs/network and no claims about legal clearance.
const root = process.cwd();
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const packages = [];
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (!path || entry.dev) continue;
  try {
    const metadata = JSON.parse(await readFile(join(root, path, 'package.json'), 'utf8'));
    packages.push({ path, name: metadata.name, version: metadata.version, declaredLicense: metadata.license ?? entry.license ?? null, repository: metadata.repository ?? null });
  } catch { packages.push({ path, version: entry.version, declaredLicense: entry.license ?? null, installedMetadata: false }); }
}
const bgm = JSON.parse(await readFile(join(root, 'assets/bgm-manifest.json'), 'utf8'));
const music = await Promise.all(bgm.tracks.map(async track => {
  try {
    const bytes = await readFile(join(root, track.output));
    const actualSha256 = createHash('sha256').update(bytes).digest('hex');
    return { id: track.id, path: track.output, source: track.source, expectedSha256: track.outputSha256, actualSha256, matches: actualSha256 === track.outputSha256 };
  } catch { return { id: track.id, path: track.output, present: false }; }
}));
console.log(JSON.stringify({ schema: 'DRAWINDOW-license-inventory-v0.9', scope: 'Installed production packages from lockfile flags; package declarations are not proof of rights or complete redistribution notices.', packages, music }, null, 2));
