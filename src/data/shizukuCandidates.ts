import { SHIZUKU_POSES, type ShizukuPose, type ShizukuPoseId } from './shizukuPoses';

/** Review only. The game continues to use the approved v0.2 files. */
const anchors = {
  neutral: { x: 0.502, y: 0.312 },
  breath: { x: 0.501, y: 0.312 },
  drawing: { x: 0.501, y: 0.314 },
  smile: { x: 0.502, y: 0.312 },
};
export function reviewPose(id: ShizukuPoseId): ShizukuPose {
  if (!(id in anchors)) return SHIZUKU_POSES[id];
  return { ...SHIZUKU_POSES[id], src: `${import.meta.env.BASE_URL}art/shizuku-v04/${id}.webp`, anchor: anchors[id as keyof typeof anchors], renderScale: 1.28, fallback: 'neutral' };
}
