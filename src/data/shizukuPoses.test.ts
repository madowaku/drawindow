import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SHIZUKU_POSES, SHIZUKU_EYE_TARGET, type ShizukuPoseId } from './shizukuPoses';

describe('Shizuku pose manifest', () => {
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
