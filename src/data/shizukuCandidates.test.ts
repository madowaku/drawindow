import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import manifest from '../../assets/shizuku-v04-manifest.json';
import original from '../../assets/shizuku-manifest.json';
import finalManifest from '../../assets/shizuku-expression-final-v05-manifest.json';
import { reviewPose } from './shizukuCandidates';
import { SHIZUKU_POSES } from './shizukuPoses';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
it('keeps final sprites opt-in and verifies native, normalized and game files', async () => {
  expect(finalManifest.files).toHaveLength(3);
  for (const file of finalManifest.files) {
    const id = file.pose as 'thinking' | 'curious' | 'shy';
    expect(reviewPose(id)).toBe(SHIZUKU_POSES[id]);
    expect(reviewPose(id, true).src).toContain(`/shizuku-expression-review/${id}.webp`);
    for (const [filename, digest] of [[file.source, file.sourceSha256], [file.normalized, file.normalizedSha256], [file.filename, file.sha256]]) expect(hash(await readFile(filename))).toBe(digest);
    const meta = await sharp(file.filename).metadata();
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([768, 1024, true]);
  }
  for (const file of finalManifest.inputs) expect(hash(await readFile(file.filename))).toBe(file.sha256);
});
it('keeps approved production artwork unchanged while recording exact candidate provenance',async()=>{
  for(const file of [...original.sources,...original.files,...manifest.sources,...manifest.files]) expect(hash(await readFile(file.filename))).toBe(file.sha256);
  expect(reviewPose('thinking')).toBe(SHIZUKU_POSES.thinking);
  expect(reviewPose('neutral').src).not.toBe(SHIZUKU_POSES.neutral.src);
});
it('uses actual high-resolution alpha sources and downsampled candidates with soft edges',async()=>{
  expect(manifest.files).toHaveLength(4);
  for(const file of manifest.files){
    const meta=await sharp(file.filename).metadata();
    expect([meta.width,meta.height,meta.hasAlpha]).toEqual([768,1024,true]);
    expect(file.sourceWidth).toBeGreaterThanOrEqual(768);
    expect(file.sourceHeight).toBeGreaterThanOrEqual(1024);
    expect(file.transparentPixels).toBeGreaterThan(768*1024*.15);
    expect(file.softAlphaPixels).toBeGreaterThan(0);
  }
});
