import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SHIZUKU_POSES, SHIZUKU_NIGHT_POSES, SHIZUKU_EYE_TARGET, type ShizukuPoseId } from './shizukuPoses';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import adoption from '../../assets/shizuku-adoption-v06.json';

describe('Shizuku pose manifest', () => {
  it('pins all seven user-adopted A sprites to the original hashes', async () => {
    expect(adoption.files).toHaveLength(7);
    for (const file of adoption.files) {
      const bytes = await readFile(file.filename);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
      expect(SHIZUKU_POSES[file.pose as ShizukuPoseId].src).toBe(`${import.meta.env.BASE_URL}${file.filename.slice(7)}`);
    }
  });
  it('registers the seven shipped poses with valid source paths and bounded neutral fallbacks', () => {
    const ids = Object.keys(SHIZUKU_POSES).sort();
    expect(ids).toEqual(['breath', 'curious', 'drawing', 'neutral', 'shy', 'smile', 'thinking']);

    for (const id of ids as ShizukuPoseId[]) {
      const pose = SHIZUKU_POSES[id];
      expect(pose.src).toMatch(new RegExp(`/art/shizuku/${id}\\.webp$`));
      expect(existsSync(resolve(process.cwd(), 'public', 'art', 'shizuku', `${id}.webp`))).toBe(true);
      expect(pose.fallback === 'hide' || SHIZUKU_POSES[pose.fallback]).toBeTruthy();
      expect(pose.anchor.x).toBeGreaterThanOrEqual(0);
      expect(pose.anchor.x).toBeLessThanOrEqual(1);
      expect(pose.anchor.y).toBeGreaterThanOrEqual(0);
      expect(pose.anchor.y).toBeLessThanOrEqual(1);
      expect(pose.handTipAnchor !== undefined).toBe(id === 'drawing');
    }

    expect(SHIZUKU_EYE_TARGET).toEqual({ x: 0.5, y: 0.392 });
  });

  it('retains source transparency and soft alpha edges in all seven WebPs', async () => {
    for (const id of Object.keys(SHIZUKU_POSES) as ShizukuPoseId[]) {
      const file = resolve(process.cwd(), 'public', 'art', 'shizuku', `${id}.webp`);
      const metadata = await sharp(file).metadata();
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparent = 0;
      let softAlpha = 0;
      for (let index = 3; index < info.width * info.height * info.channels; index += info.channels) {
        if (data[index] === 0) transparent += 1;
        else if (data[index] < 255) softAlpha += 1;
      }
      expect(metadata.hasAlpha).toBe(true);
      expect(transparent).toBeGreaterThan(0);
      expect(softAlpha).toBeGreaterThan(0);
    }
  });
});

it('ships all seven night poses with transparent alpha and hashes matching the manifest', async () => {
  const manifest = JSON.parse(await readFile('assets/shizuku-night-manifest.json', 'utf8'));
  expect(manifest.files).toHaveLength(7);
  expect(Object.keys(SHIZUKU_NIGHT_POSES).sort()).toEqual(Object.keys(SHIZUKU_POSES).sort());
  for (const file of manifest.files) {
    const pose = SHIZUKU_NIGHT_POSES[file.pose as ShizukuPoseId];
    const bytes = await readFile(file.filename);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
    expect(pose.src).toBe(`${import.meta.env.BASE_URL}art/shizuku-night/${file.pose}.webp`);
    expect(pose.anchor).toEqual(file.anchor);
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([384, 512, true]);
  }
});
