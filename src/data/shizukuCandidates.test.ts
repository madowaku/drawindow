import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import manifest from '../../assets/shizuku-v04-manifest.json';
import original from '../../assets/shizuku-manifest.json';
import { reviewPose } from './shizukuCandidates';
import { SHIZUKU_POSES } from './shizukuPoses';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
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
